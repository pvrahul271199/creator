/**
 * Deterministic sponsored-post analytics. Every function returns "unavailable" instead of
 * guessing: a metric is computed only when all of its inputs exist and the denominator is
 * valid. Missing data is never treated as zero.
 */
import type { PostSnapshot, SponsoredPost } from "@/lib/types";

export interface MetricResult {
  value: number | null;
  /** Shown beside the figure so the formula is never implicit. */
  formula: string;
  /** Inputs that were not recorded; empty when the value was computed. */
  missing: string[];
  note?: string;
}

type Num = number | null | undefined;
const has = (n: Num): n is number => typeof n === "number" && Number.isFinite(n);

function result(value: number | null, formula: string, missing: string[], note?: string): MetricResult {
  return { value, formula, missing, note };
}

const ENGAGEMENT_FIELDS = ["likes", "comments", "shares", "saves"] as const;

function engagementTotal(s: Pick<PostSnapshot, "likes" | "comments" | "shares" | "saves">) {
  const missing = ENGAGEMENT_FIELDS.filter((f) => !has(s[f])) as string[];
  if (missing.length) return { total: null, missing };
  return { total: (s.likes as number) + (s.comments as number) + (s.shares as number) + (s.saves as number), missing };
}

export function engagementRateByReach(s: PostSnapshot): MetricResult {
  const formula = "(Likes + Comments + Shares + Saves) / Reach x 100";
  const eng = engagementTotal(s);
  const missing = [...eng.missing, ...(has(s.reach) ? [] : ["reach"])];
  if (missing.length) return result(null, formula, missing, "Incomplete: needs all four engagement metrics and reach.");
  if ((s.reach as number) <= 0) return result(null, formula, [], "Reach is zero, so a rate cannot be calculated.");
  return result(((eng.total as number) / (s.reach as number)) * 100, formula, []);
}

export function engagementRateByViews(s: PostSnapshot): MetricResult {
  const formula = "(Likes + Comments + Shares + Saves) / Views x 100";
  const eng = engagementTotal(s);
  const missing = [...eng.missing, ...(has(s.views) ? [] : ["views"])];
  if (missing.length) return result(null, formula, missing, "Incomplete: needs all four engagement metrics and views.");
  if ((s.views as number) <= 0) return result(null, formula, [], "Views are zero, so a rate cannot be calculated.");
  return result(((eng.total as number) / (s.views as number)) * 100, formula, []);
}

export function viewToReachRatio(s: PostSnapshot): MetricResult {
  const formula = "Views / Reach x 100";
  const missing = [...(has(s.views) ? [] : ["views"]), ...(has(s.reach) ? [] : ["reach"])];
  if (missing.length) return result(null, formula, missing);
  if ((s.reach as number) <= 0) return result(null, formula, [], "Reach must be above zero.");
  return result(((s.views as number) / (s.reach as number)) * 100, formula, [], "Can exceed 100% because one person can view a post more than once. This is not a unique-audience share.");
}

export function costPerThousandViews(fee: Num, s: PostSnapshot): MetricResult {
  const formula = "Attributable fee / Views x 1,000";
  const missing = [...(has(fee) ? [] : ["allocated fee"]), ...(has(s.views) ? [] : ["views"])];
  if (missing.length) return result(null, formula, missing);
  if ((s.views as number) <= 0) return result(null, formula, [], "Views must be above zero.");
  return result(((fee as number) / (s.views as number)) * 1000, formula, []);
}

export function costPerThousandReached(fee: Num, s: PostSnapshot): MetricResult {
  const formula = "Attributable fee / Reach x 1,000";
  const missing = [...(has(fee) ? [] : ["allocated fee"]), ...(has(s.reach) ? [] : ["reach"])];
  if (missing.length) return result(null, formula, missing);
  if ((s.reach as number) <= 0) return result(null, formula, [], "Reach must be above zero.");
  return result(((fee as number) / (s.reach as number)) * 1000, formula, []);
}

/**
 * Snapshots are append-only. A correction is a newer row whose corrects_snapshot_id points at the
 * one it replaces, so the effective history excludes any snapshot that has been corrected.
 */
export function effectiveSnapshots<T extends { id: string; corrects_snapshot_id: string | null }>(all: T[]): T[] {
  const corrected = new Set(all.map((s) => s.corrects_snapshot_id).filter(Boolean) as string[]);
  return all.filter((s) => !corrected.has(s.id));
}

export function latestSnapshot(all: PostSnapshot[]): PostSnapshot | null {
  const eff = effectiveSnapshots(all);
  if (!eff.length) return null;
  return [...eff].sort(
    (a, b) => b.captured_at.localeCompare(a.captured_at) || b.created_at.localeCompare(a.created_at),
  )[0];
}

export interface Comparison {
  /** Percent difference vs baseline, or null when it cannot be stated honestly. */
  pct: number | null;
  baseline: number | null;
  sampleSize: number;
  reason?: string;
}

/** Compare one value with the mean of comparable values. Requires a positive baseline. */
export function compareToBaseline(value: Num, baselineValues: Num[]): Comparison {
  const usable = baselineValues.filter(has);
  if (!has(value)) return { pct: null, baseline: null, sampleSize: usable.length, reason: "This post has no value recorded for that metric." };
  if (!usable.length) return { pct: null, baseline: null, sampleSize: 0, reason: "There are no comparable posts with this metric yet." };
  const baseline = usable.reduce((a, b) => a + b, 0) / usable.length;
  if (baseline <= 0) return { pct: null, baseline, sampleSize: usable.length, reason: "The baseline is zero, so a percentage change is undefined." };
  return { pct: ((value - baseline) / baseline) * 100, baseline, sampleSize: usable.length };
}

export interface PostWithLatest {
  post: SponsoredPost;
  latest: PostSnapshot | null;
}

/** Posts that can be compared like for like: same platform and content type. */
export function comparablePosts(target: PostWithLatest, pool: PostWithLatest[]): PostWithLatest[] {
  return pool.filter(
    (p) =>
      p.post.id !== target.post.id &&
      p.post.platform === target.post.platform &&
      p.post.content_type === target.post.content_type &&
      p.latest !== null,
  );
}

export function buildInsights(target: PostWithLatest, pool: PostWithLatest[]): string[] {
  const out: string[] = [];
  if (!target.latest) return ["Performance data is not sufficient to make a reliable comparison."];
  const peers = comparablePosts(target, pool);
  const kind = target.post.content_type.replace("_", " ");
  const peerWord = (n: number) => `${n} comparable ${kind}${n === 1 ? "" : "s"}`;

  const views = compareToBaseline(target.latest.views, peers.map((p) => p.latest!.views));
  const reach = compareToBaseline(target.latest.reach, peers.map((p) => p.latest!.reach));
  const rate = (p: PostWithLatest) => engagementRateByReach(p.latest!).value;
  const myRate = engagementRateByReach(target.latest).value;
  const eng = compareToBaseline(myRate, peers.map(rate));

  if (views.pct !== null) {
    const dir = views.pct >= 0 ? "more" : "fewer";
    out.push(`This post received ${Math.abs(views.pct).toFixed(0)}% ${dir} views than the average of ${peerWord(views.sampleSize)}.`);
  }
  if (reach.pct !== null && eng.pct !== null && reach.pct > 0 && eng.pct < 0) {
    out.push(`Reach is above your baseline (${peerWord(reach.sampleSize)}), but engagement rate by reach is lower.`);
  } else if (reach.pct !== null && eng.pct !== null && reach.pct < 0 && eng.pct > 0) {
    out.push(`Reach is below your baseline, but engagement rate by reach is higher (${peerWord(eng.sampleSize)}).`);
  }
  if (!out.length) out.push("Performance data is not sufficient to make a reliable comparison.");
  return out;
}

/** Sum of a metric across posts, only over posts that recorded it. Reports how many did. */
export function sumMetric(items: PostSnapshot[], pick: (s: PostSnapshot) => Num) {
  const values = items.map(pick).filter(has);
  return { total: values.length ? values.reduce((a, b) => a + b, 0) : null, counted: values.length, of: items.length };
}
