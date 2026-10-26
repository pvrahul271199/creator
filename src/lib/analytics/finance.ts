/**
 * Dashboard finance and pipeline aggregations. Pure functions over rows already scoped to one
 * currency by the caller (amounts in different currencies are never added together).
 * Definitions:
 *  - Revenue = payments actually received (payment_date), never invoice totals or deal values.
 *  - Receivables = issued, partially paid and overdue invoices; drafts and cancelled are excluded.
 *  - Collection rate = payments received on receivable invoices / total of those invoices.
 */
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import type { ActivityEvent, Collaboration, CollaborationStatus, Invoice, Payment } from "@/lib/types";
import { ACTIVE_STATUSES, OPEN_STATUSES } from "@/lib/constants";

const cents = (n: number) => Math.round(n * 100);
const sum = (values: number[]) => values.reduce((a, b) => a + cents(b), 0) / 100;

export interface MonthPoint {
  key: string; // yyyy-MM
  label: string;
  revenue: number;
  invoiced: number;
}

/** Last `months` calendar months ending at `now`, oldest first. */
export function monthlySeries(payments: Payment[], invoices: Invoice[], months: number, now: Date): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = addMonths(startOfMonth(now), -i);
    points.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM yy"), revenue: 0, invoiced: 0 });
  }
  const byKey = new Map(points.map((p) => [p.key, p]));
  for (const p of payments) {
    const point = byKey.get(p.payment_date.slice(0, 7));
    if (point) point.revenue = sum([point.revenue, p.amount]);
  }
  for (const inv of invoices) {
    if (inv.status === "draft" || inv.status === "cancelled") continue;
    const point = byKey.get(inv.issue_date.slice(0, 7));
    if (point) point.invoiced = sum([point.invoiced, inv.total_amount]);
  }
  return points;
}

export function revenueThisMonth(payments: Payment[], now: Date) {
  const key = format(now, "yyyy-MM");
  return sum(payments.filter((p) => p.payment_date.slice(0, 7) === key).map((p) => p.amount));
}

export interface Receivables {
  invoiced: number;
  collected: number;
  outstanding: number;
  overdue: number;
  overdueCount: number;
  /** Null when nothing has been invoiced, so no rate is shown. */
  collectionRate: number | null;
}

export function receivables(invoices: Invoice[], paidByInvoice: Map<string, number>, today: string): Receivables {
  const live = invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled");
  let invoiced = 0;
  let collected = 0;
  let overdue = 0;
  let overdueCount = 0;
  for (const inv of live) {
    const paid = paidByInvoice.get(inv.id) ?? 0;
    const balance = Math.max(0, cents(inv.total_amount) - cents(paid)) / 100;
    invoiced += cents(inv.total_amount);
    collected += cents(paid);
    if (balance > 0 && inv.due_date && inv.due_date < today) {
      overdue += cents(balance);
      overdueCount += 1;
    }
  }
  return {
    invoiced: invoiced / 100,
    collected: collected / 100,
    outstanding: Math.max(0, invoiced - collected) / 100,
    overdue: overdue / 100,
    overdueCount,
    collectionRate: invoiced > 0 ? (collected / invoiced) * 100 : null,
  };
}

export function activeCollaborationCount(collabs: Collaboration[]) {
  return collabs.filter((c) => !c.is_archived && ACTIVE_STATUSES.includes(c.status)).length;
}

export interface PipelineRow {
  status: CollaborationStatus;
  count: number;
  value: number;
}

export function pipeline(collabs: Collaboration[]): PipelineRow[] {
  const order: CollaborationStatus[] = ["lead", "negotiating", "confirmed", "in_progress", "completed", "cancelled"];
  return order.map((status) => {
    const rows = collabs.filter((c) => !c.is_archived && c.status === status);
    return { status, count: rows.length, value: sum(rows.map((r) => r.deal_amount)) };
  });
}

export function openOpportunityValue(rows: PipelineRow[]) {
  return sum(rows.filter((r) => OPEN_STATUSES.includes(r.status)).map((r) => r.value));
}

export function averageDealValue(collabs: Collaboration[]) {
  const counted = collabs.filter((c) => !c.is_archived && c.status !== "cancelled" && c.status !== "lead");
  if (!counted.length) return null;
  return sum(counted.map((c) => c.deal_amount)) / counted.length;
}

export interface Conversion {
  rate: number | null;
  considered: number;
  converted: number;
  note: string;
}

const COMMITTED: CollaborationStatus[] = ["confirmed", "in_progress", "completed"];

/**
 * Lead-to-confirmed conversion from persisted history. A collaboration counts as "considered" if it
 * was ever a lead or negotiating (creation event or a status change out of those stages), and as
 * "converted" if it later reached a committed stage. Deals entered directly as confirmed are not
 * counted, because they never passed through the pipeline we can observe.
 */
export function leadConversion(collabs: Collaboration[], events: ActivityEvent[] & { metadata?: unknown }[]): Conversion {
  const considered = new Set<string>();
  const converted = new Set<string>();
  for (const c of collabs) {
    if (c.is_archived) continue;
    if (OPEN_STATUSES.includes(c.status)) considered.add(c.id);
  }
  for (const e of events as Array<ActivityEvent & { metadata?: { status?: string; from?: string; to?: string } | null }>) {
    if (!e.collaboration_id) continue;
    const md = e.metadata ?? {};
    if (e.event_type === "collaboration_created" && md.status && OPEN_STATUSES.includes(md.status as CollaborationStatus)) {
      considered.add(e.collaboration_id);
    }
    if (e.event_type === "status_changed") {
      if (md.from && OPEN_STATUSES.includes(md.from as CollaborationStatus)) considered.add(e.collaboration_id);
      if (md.to && COMMITTED.includes(md.to as CollaborationStatus)) converted.add(e.collaboration_id);
    }
  }
  const convertedIn = [...converted].filter((id) => considered.has(id)).length;
  const note =
    "Counts deals that started as a lead or negotiation and later became confirmed, in progress or completed. Deals logged directly as confirmed are excluded.";
  if (considered.size === 0) return { rate: null, considered: 0, converted: 0, note: "Not enough history yet. Log deals as leads to track conversion." };
  return { rate: (convertedIn / considered.size) * 100, considered: considered.size, converted: convertedIn, note };
}

export interface BrandRow {
  brandId: string;
  name: string;
  invoiced: number;
  received: number;
  outstanding: number;
  collaborations: number;
  averageDeal: number | null;
  latestCollaboration: string | null;
}

export function brandPerformance(
  brands: { id: string; name: string }[],
  collabs: Collaboration[],
  invoices: Invoice[],
  paidByInvoice: Map<string, number>,
): BrandRow[] {
  return brands.map((b) => {
    const bc = collabs.filter((c) => c.brand_id === b.id && !c.is_archived);
    const bi = invoices.filter((i) => i.brand_id === b.id && i.status !== "draft" && i.status !== "cancelled");
    const invoiced = sum(bi.map((i) => i.total_amount));
    const received = sum(bi.map((i) => paidByInvoice.get(i.id) ?? 0));
    const countedDeals = bc.filter((c) => c.status !== "cancelled" && c.status !== "lead");
    const latest = [...bc].sort((a, b2) => b2.created_at.localeCompare(a.created_at))[0];
    return {
      brandId: b.id,
      name: b.name,
      invoiced,
      received,
      outstanding: Math.max(0, cents(invoiced) - cents(received)) / 100,
      collaborations: bc.length,
      averageDeal: countedDeals.length ? sum(countedDeals.map((c) => c.deal_amount)) / countedDeals.length : null,
      latestCollaboration: latest ? latest.title : null,
    };
  });
}

/** Flight chart geometry: where a date range falls on a window, as 0..1 fractions. */
export function flightPosition(
  start: string | null,
  end: string | null,
  windowStart: Date,
  windowEnd: Date,
): { left: number; width: number } | null {
  const span = windowEnd.getTime() - windowStart.getTime();
  if (span <= 0) return null;
  const s = start ? parseISO(start) : end ? parseISO(end) : null;
  const e = end ? parseISO(end) : s;
  if (!s || !e) return null;
  const from = Math.max(s.getTime(), windowStart.getTime());
  const to = Math.min(Math.max(e.getTime(), s.getTime()) + 24 * 3600 * 1000, windowEnd.getTime());
  if (to <= windowStart.getTime() || from >= windowEnd.getTime()) return null;
  const left = (from - windowStart.getTime()) / span;
  const width = Math.max((to - from) / span, 0.012);
  return { left, width: Math.min(width, 1 - left) };
}

export function pointPosition(date: string, windowStart: Date, windowEnd: Date): number | null {
  const t = parseISO(date).getTime();
  const span = windowEnd.getTime() - windowStart.getTime();
  if (t < windowStart.getTime() || t > windowEnd.getTime() || span <= 0) return null;
  return (t - windowStart.getTime()) / span;
}

export function windowFor(now: Date, monthsBack = 1, monthsForward = 4) {
  return { start: startOfMonth(addMonths(now, -monthsBack)), end: endOfMonth(addMonths(now, monthsForward)) };
}
