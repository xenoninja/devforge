export const momentumThresholdDays = {
  active: 7,
  cooling: 21,
  stalled: 60,
} as const;

export const activitySources = [
  "journal_entry",
  "decision",
  "feature_lane",
  "feature_done",
  "objective",
  "next_action",
  "lifecycle_state",
] as const;

export type ActivitySource = (typeof activitySources)[number];
export type ProjectWriteSource =
  | ActivitySource
  | "project_name"
  | "project_description"
  | "project_metadata";
export type Momentum = "Active" | "Cooling" | "Stalled" | "Dormant";
export type MomentumLifecycleState = "exploring" | "building" | "released" | "maintenance" | "shelved";
export type FeatureLane = "now" | "next" | "later" | "icebox";

const millisecondsPerDay = 24 * 60 * 60 * 1_000;
const activitySourceList: readonly ProjectWriteSource[] = activitySources;

export function isActivity(source: ProjectWriteSource): source is ActivitySource {
  return activitySourceList.includes(source);
}

export function momentumFor(
  lifecycleState: MomentumLifecycleState,
  lastActivityAt: Date,
  now: Date = new Date(),
): Momentum | null {
  if (lifecycleState !== "exploring" && lifecycleState !== "building") return null;

  const elapsed = now.getTime() - lastActivityAt.getTime();
  if (elapsed < momentumThresholdDays.active * millisecondsPerDay) return "Active";
  if (elapsed < momentumThresholdDays.cooling * millisecondsPerDay) return "Cooling";
  if (elapsed <= momentumThresholdDays.stalled * millisecondsPerDay) return "Stalled";
  return "Dormant";
}

export function featureProgress(features: readonly { lane: FeatureLane; done: boolean }[]) {
  let included = 0;
  let done = 0;

  for (const feature of features) {
    if (feature.lane === "icebox") continue;
    included += 1;
    if (feature.done) done += 1;
  }

  return included === 0 ? 0 : done / included;
}
