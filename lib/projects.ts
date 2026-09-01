import { and, desc, eq } from "drizzle-orm";

import { momentumFor, type ActivitySource, type Momentum } from "@/lib/activity";
import { getDatabase } from "@/lib/db";
import {
  activities,
  decisions,
  ideas,
  journalEntries,
  lifecycleStateChanges,
  projects as projectsTable,
} from "@/lib/db/schema";

export const lifecycleStates = [
  { value: "exploring", label: "Exploring" },
  { value: "building", label: "Building" },
  { value: "released", label: "Released" },
  { value: "maintenance", label: "Maintenance" },
  { value: "shelved", label: "Shelved" },
] as const;

export type LifecycleState = (typeof lifecycleStates)[number]["value"];
type StoredProject = typeof projectsTable.$inferSelect;
export type Project = StoredProject & { momentum: Momentum | null };

export class ProjectInputError extends Error {}

const lifecycleStateActivitySource: ActivitySource = "lifecycle_state";
const journalEntryActivitySource: ActivitySource = "journal_entry";
const decisionActivitySource: ActivitySource = "decision";

export type ProjectStoryItem =
  | {
      type: "journal-entry";
      id: string;
      markdown: string;
      createdAt: Date;
      updatedAt: Date;
    }
  | {
      type: "decision";
      id: string;
      decided: string;
      rationale: string;
      createdAt: Date;
    };

export async function listProjects(): Promise<Project[]> {
  const projects = await getDatabase().select().from(projectsTable).orderBy(desc(projectsTable.lastActivityAt));
  const now = new Date();

  return projects.map((project) => ({
    ...project,
    momentum: momentumFor(project.lifecycleState, project.lastActivityAt, now),
  }));
}

export async function getProject(id: string) {
  const projectId = requireId(id, "Project");
  const database = getDatabase();
  const [project] = await database.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);

  if (!project) return null;

  const changes = await database
    .select()
    .from(lifecycleStateChanges)
    .where(eq(lifecycleStateChanges.projectId, projectId))
    .orderBy(desc(lifecycleStateChanges.createdAt));
  const [originIdea] = project.originIdeaId
    ? await database.select().from(ideas).where(eq(ideas.id, project.originIdeaId)).limit(1)
    : [];

  return { project, changes, originIdea: originIdea ?? null };
}

export async function listProjectStory(id: string): Promise<ProjectStoryItem[]> {
  const projectId = requireId(id, "Project");
  const database = getDatabase();
  const [entries, projectDecisions] = await Promise.all([
    database.select().from(journalEntries).where(eq(journalEntries.projectId, projectId)),
    database.select().from(decisions).where(eq(decisions.projectId, projectId)),
  ]);

  return [
    ...entries.map((entry) => ({ ...entry, type: "journal-entry" as const })),
    ...projectDecisions.map((decision) => ({ ...decision, type: "decision" as const })),
  ].sort((left, right) => {
    const byDate = right.createdAt.getTime() - left.createdAt.getTime();
    return byDate || right.id.localeCompare(left.id);
  });
}

export async function createJournalEntry(projectId: string, markdown: string) {
  const id = requireId(projectId, "Project");
  const content = requireText(markdown, "A Journal Entry is required");
  const now = new Date();

  return getDatabase().transaction(async (transaction) => {
    await recordActivity(transaction, id, journalEntryActivitySource, now);
    const [entry] = await transaction
      .insert(journalEntries)
      .values({ projectId: id, markdown: content, createdAt: now, updatedAt: now })
      .returning({ id: journalEntries.id });
    return entry.id;
  });
}

export async function editJournalEntry(projectId: string, entryId: string, markdown: string) {
  const id = requireId(projectId, "Project");
  const journalEntryId = requireId(entryId, "Journal Entry");
  const content = requireText(markdown, "A Journal Entry is required");
  const now = new Date();

  await getDatabase().transaction(async (transaction) => {
    const [entry] = await transaction
      .update(journalEntries)
      .set({ markdown: content, updatedAt: now })
      .where(and(eq(journalEntries.id, journalEntryId), eq(journalEntries.projectId, id)))
      .returning({ id: journalEntries.id });

    if (!entry) throw new ProjectInputError("Journal Entry not found");
    await recordActivity(transaction, id, journalEntryActivitySource, now);
  });
}

export async function deleteJournalEntry(projectId: string, entryId: string) {
  const id = requireId(projectId, "Project");
  const journalEntryId = requireId(entryId, "Journal Entry");
  const now = new Date();

  await getDatabase().transaction(async (transaction) => {
    const [entry] = await transaction
      .delete(journalEntries)
      .where(and(eq(journalEntries.id, journalEntryId), eq(journalEntries.projectId, id)))
      .returning({ id: journalEntries.id });

    if (!entry) throw new ProjectInputError("Journal Entry not found");
    await recordActivity(transaction, id, journalEntryActivitySource, now);
  });
}

export async function createDecision(projectId: string, decided: string, rationale: string) {
  const id = requireId(projectId, "Project");
  const decision = requireText(decided, "What was decided is required");
  const reason = requireText(rationale, "A rationale is required");
  const now = new Date();

  return getDatabase().transaction(async (transaction) => {
    await recordActivity(transaction, id, decisionActivitySource, now);
    const [created] = await transaction
      .insert(decisions)
      .values({ projectId: id, decided: decision, rationale: reason, createdAt: now })
      .returning({ id: decisions.id });
    return created.id;
  });
}

export async function updateObjective(projectId: string, objective: string) {
  await updateProjectIntent(projectId, "objective", objective);
}

export async function updateNextAction(projectId: string, nextAction: string) {
  await updateProjectIntent(projectId, "nextAction", nextAction);
}

export async function createProject(input: {
  name: string;
  description: string;
  repositoryUrl: string;
  deployedUrl: string;
  stack: string;
  lifecycleState: string;
  note: string;
}) {
  const project = {
    name: requireText(input.name, "A Project name is required"),
    description: requireText(input.description, "A Project description is required"),
    repositoryUrl: requireWebUrl(input.repositoryUrl, "A valid repository URL is required"),
    deployedUrl: input.deployedUrl.trim()
      ? requireWebUrl(input.deployedUrl, "A valid deployed URL is required")
      : null,
    stack: requireText(input.stack, "A stack line is required"),
    lifecycleState: requireLifecycleState(input.lifecycleState),
    note: input.note.trim(),
  };

  return getDatabase().transaction((transaction) => insertProject(transaction, project));
}

export async function promoteIdea(id: string, lifecycleState: string) {
  const ideaId = requireId(id, "Idea");
  const selectedState = requireLifecycleState(lifecycleState);

  return getDatabase().transaction(async (transaction) => {
    const [idea] = await transaction
      .update(ideas)
      .set({ state: "promoted", updatedAt: new Date() })
      .where(and(eq(ideas.id, ideaId), eq(ideas.state, "inbox")))
      .returning({ id: ideas.id, title: ideas.title, notes: ideas.notes });

    if (!idea) throw new ProjectInputError("Idea not found in inbox");

    return insertProject(transaction, {
      name: idea.title,
      description: idea.notes,
      repositoryUrl: "",
      deployedUrl: null,
      stack: "",
      lifecycleState: selectedState,
      note: "Promoted from Idea",
      originIdeaId: idea.id,
    });
  });
}

export async function changeLifecycleState(id: string, lifecycleState: string, note: string) {
  const projectId = requireId(id, "Project");
  const nextState = requireLifecycleState(lifecycleState);
  const database = getDatabase();
  const now = new Date();
  await database.transaction(async (transaction) => {
    const [project] = await transaction
      .update(projectsTable)
      .set({ lifecycleState: nextState, lastActivityAt: now, updatedAt: now })
      .where(eq(projectsTable.id, projectId))
      .returning({ id: projectsTable.id });

    if (!project) throw new ProjectInputError("Project not found");

    await transaction.insert(lifecycleStateChanges).values({
      projectId,
      lifecycleState: nextState,
      note: note.trim(),
    });

    await transaction.insert(activities).values({
      projectId,
      source: lifecycleStateActivitySource,
      createdAt: now,
    });
  });
}

export function lifecycleStateLabel(state: LifecycleState) {
  return lifecycleStates.find((candidate) => candidate.value === state)?.label ?? state;
}

type ProjectTransaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

type ProjectIntentField = "objective" | "nextAction";

async function updateProjectIntent(projectId: string, field: ProjectIntentField, value: string) {
  const id = requireId(projectId, "Project");
  const label = field === "objective" ? "Objective" : "Next Action";
  const content = requireText(value, `A ${label} is required`);
  const source: ActivitySource = field === "objective" ? "objective" : "next_action";

  await getDatabase().transaction(async (transaction) => {
    const [project] = await transaction
      .select({ objective: projectsTable.objective, nextAction: projectsTable.nextAction })
      .from(projectsTable)
      .where(eq(projectsTable.id, id))
      .limit(1)
      .for("update");

    if (!project) throw new ProjectInputError("Project not found");

    const previous = project[field];
    if (previous === content) return;
    const now = new Date();
    if (previous) {
      await transaction.insert(journalEntries).values({
        projectId: id,
        markdown: `**Previous ${label}**\n\n${previous}`,
        createdAt: now,
        updatedAt: now,
      });
    }

    const intentUpdate =
      field === "objective" ? { objective: content } : { nextAction: content };
    await transaction
      .update(projectsTable)
      .set({ ...intentUpdate, lastActivityAt: now, updatedAt: now })
      .where(eq(projectsTable.id, id));
    await transaction.insert(activities).values({ projectId: id, source, createdAt: now });
  });
}

async function recordActivity(
  transaction: ProjectTransaction,
  projectId: string,
  source: ActivitySource,
  createdAt: Date,
) {
  const [project] = await transaction
    .update(projectsTable)
    .set({ lastActivityAt: createdAt, updatedAt: createdAt })
    .where(eq(projectsTable.id, projectId))
    .returning({ id: projectsTable.id });

  if (!project) throw new ProjectInputError("Project not found");
  await transaction.insert(activities).values({ projectId, source, createdAt });
}

async function insertProject(
  transaction: ProjectTransaction,
  project: {
    name: string;
    description: string;
    repositoryUrl: string;
    deployedUrl: string | null;
    stack: string;
    lifecycleState: LifecycleState;
    note: string;
    originIdeaId?: string;
  },
) {
  const now = new Date();
  const [createdProject] = await transaction
    .insert(projectsTable)
    .values({
      name: project.name,
      description: project.description,
      repositoryUrl: project.repositoryUrl,
      deployedUrl: project.deployedUrl,
      stack: project.stack,
      lifecycleState: project.lifecycleState,
      originIdeaId: project.originIdeaId,
      lastActivityAt: now,
    })
    .returning({ id: projectsTable.id });

  await transaction.insert(lifecycleStateChanges).values({
    projectId: createdProject.id,
    lifecycleState: project.lifecycleState,
    note: project.note,
  });

  await transaction.insert(activities).values({
    projectId: createdProject.id,
    source: lifecycleStateActivitySource,
    createdAt: now,
  });

  return createdProject.id;
}

function requireText(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new ProjectInputError(message);
  return normalized;
}

function requireWebUrl(value: string, message: string) {
  const normalized = value.trim();

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new ProjectInputError(message);
  }
}

function requireId(id: string, subject: "Idea" | "Project" | "Journal Entry") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ProjectInputError(`A valid ${subject} id is required`);
  }
  return id;
}

function requireLifecycleState(value: string): LifecycleState {
  const state = lifecycleStates.find((candidate) => candidate.value === value)?.value;
  if (!state) throw new ProjectInputError("A valid Lifecycle State is required");
  return state;
}
