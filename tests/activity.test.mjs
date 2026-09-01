import assert from "node:assert/strict";
import test from "node:test";

import { featureProgress, isActivity, momentumFor } from "../lib/activity.ts";

const DAY = 24 * 60 * 60 * 1_000;
const now = new Date("2026-08-31T12:00:00.000Z");

function daysAgo(days, offsetMilliseconds = 0) {
  return new Date(now.getTime() - days * DAY - offsetMilliseconds);
}

test("only substantive Project writes count as Activity", () => {
  for (const source of [
    "journal_entry",
    "decision",
    "feature_lane",
    "feature_done",
    "objective",
    "next_action",
    "lifecycle_state",
  ]) {
    assert.equal(isActivity(source), true, `${source} should count`);
  }

  for (const source of ["project_name", "project_description", "project_metadata"]) {
    assert.equal(isActivity(source), false, `${source} should not count`);
  }
});

test("Momentum changes at the specified recency boundaries", () => {
  assert.equal(momentumFor("building", daysAgo(7, -1), now), "Active");
  assert.equal(momentumFor("building", daysAgo(7), now), "Cooling");
  assert.equal(momentumFor("building", daysAgo(21, -1), now), "Cooling");
  assert.equal(momentumFor("building", daysAgo(21), now), "Stalled");
  assert.equal(momentumFor("building", daysAgo(60), now), "Stalled");
  assert.equal(momentumFor("building", daysAgo(60, 1), now), "Dormant");
});

test("Momentum is computed only for Exploring and Building Projects", () => {
  assert.equal(momentumFor("exploring", daysAgo(2), now), "Active");
  assert.equal(momentumFor("building", daysAgo(22), now), "Stalled");

  for (const lifecycleState of ["released", "maintenance", "shelved"]) {
    assert.equal(momentumFor(lifecycleState, daysAgo(2), now), null);
  }
});

test("Feature Progress is Done Features over non-Icebox Features", () => {
  assert.equal(
    featureProgress([
      { lane: "now", done: true },
      { lane: "next", done: false },
      { lane: "later", done: true },
      { lane: "icebox", done: true },
    ]),
    2 / 3,
  );
});

test("Feature Progress is zero for empty and all-Icebox roadmaps", () => {
  assert.equal(featureProgress([]), 0);
  assert.equal(
    featureProgress([
      { lane: "icebox", done: true },
      { lane: "icebox", done: false },
    ]),
    0,
  );
});
