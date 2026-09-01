"use client";

import { moveFeatureToLaneAction } from "@/app/actions";

export function LanePicker({
  feature,
  lanes,
  projectId,
}: {
  feature: { id: string; lane: string; title: string };
  lanes: ReadonlyArray<{ label: string; value: string }>;
  projectId: string;
}) {
  return (
    <form action={moveFeatureToLaneAction}>
      <input type="hidden" name="id" value={projectId} />
      <input type="hidden" name="featureId" value={feature.id} />
      <label>
        <span className="sr-only">Lane for {feature.title}</span>
        <select
          name="lane"
          defaultValue={feature.lane}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {lanes.map((lane) => (
            <option key={lane.value} value={lane.value}>
              {lane.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
