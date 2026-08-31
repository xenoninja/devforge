import { desc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/lib/db";
import { ideas } from "@/lib/db/schema";

export type IdeaView = "inbox" | "archived";

export class IdeaInputError extends Error {}

export async function listIdeas(view: IdeaView) {
  const states = view === "inbox" ? ["inbox" as const] : ["discarded" as const, "promoted" as const];

  return getDatabase()
    .select()
    .from(ideas)
    .where(inArray(ideas.state, states))
    .orderBy(desc(ideas.createdAt));
}

export async function captureIdea(title: string, notes: string) {
  const normalizedTitle = requireTitle(title);

  await getDatabase().insert(ideas).values({
    title: normalizedTitle,
    notes: notes.trim(),
  });
}

export async function editIdea(id: string, title: string, notes: string) {
  const normalizedTitle = requireTitle(title);

  await getDatabase()
    .update(ideas)
    .set({ title: normalizedTitle, notes: notes.trim(), updatedAt: new Date() })
    .where(eq(ideas.id, requireIdeaId(id)));
}

export async function discardIdea(id: string) {
  await getDatabase()
    .update(ideas)
    .set({ state: "discarded", updatedAt: new Date() })
    .where(eq(ideas.id, requireIdeaId(id)));
}

function requireTitle(title: string) {
  const normalized = title.trim();
  if (!normalized) {
    throw new IdeaInputError("An Idea title is required");
  }
  return normalized;
}

function requireIdeaId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new IdeaInputError("A valid Idea id is required");
  }
  return id;
}
