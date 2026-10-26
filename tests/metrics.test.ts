import test from "node:test";
import assert from "node:assert/strict";
import {
  engagementRateByReach,
  engagementRateByViews,
  viewToReachRatio,
  costPerThousandViews,
  costPerThousandReached,
} from "../src/lib/analytics/post-metrics";
import type { PostSnapshot } from "../src/lib/types";

const completeSnapshot: PostSnapshot = {
  id: "snap_1",
  sponsored_post_id: "sp_1",
  captured_at: "2026-06-01T12:00:00Z",
  views: 50000,
  reach: 40000,
  likes: 2500,
  comments: 300,
  shares: 150,
  saves: 250,
  accounts_engaged: 3200,
  profile_activity: null,
  link_clicks: null,
  average_watch_time: null,
  source: "manual",
  notes: null,
  corrects_snapshot_id: null,
  created_at: "2026-06-01T12:00:00Z",
};

test("engagementRateByReach computes accurately when all inputs exist", () => {
  // Engagements = 2500 + 300 + 150 + 250 = 3200
  // Reach = 40,000
  // Rate = (3200 / 40000) * 100 = 8.0%
  const res = engagementRateByReach(completeSnapshot);
  assert.equal(res.value, 8.0);
  assert.equal(res.missing.length, 0);
});

test("engagementRateByViews computes accurately when all inputs exist", () => {
  // Engagements = 3200
  // Views = 50,000
  // Rate = (3200 / 50000) * 100 = 6.4%
  const res = engagementRateByViews(completeSnapshot);
  assert.equal(res.value, 6.4);
  assert.equal(res.missing.length, 0);
});

test("missing metrics never substituted with zero", () => {
  const incomplete: PostSnapshot = {
    ...completeSnapshot,
    reach: null, // missing reach
  };

  const res = engagementRateByReach(incomplete);
  assert.equal(res.value, null);
  assert.ok(res.missing.includes("reach"));
});

test("viewToReachRatio handles multiple views per person correctly", () => {
  // Views 50,000 / Reach 40,000 * 100 = 125%
  const res = viewToReachRatio(completeSnapshot);
  assert.equal(res.value, 125);
  assert.equal(res.missing.length, 0);
});

test("costPerThousandViews calculates CPM", () => {
  // Fee = 25,000
  // Views = 50,000
  // CPM = 25,000 / 50,000 * 1,000 = 500
  const res = costPerThousandViews(25000, completeSnapshot);
  assert.equal(res.value, 500);
});

test("costPerThousandReached calculates CPR", () => {
  // Fee = 25,000
  // Reach = 40,000
  // CPR = 25,000 / 40,000 * 1,000 = 625
  const res = costPerThousandReached(25000, completeSnapshot);
  assert.equal(res.value, 625);
});
