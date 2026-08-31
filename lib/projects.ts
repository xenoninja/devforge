import { and, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/lib/db";
import { ideas, lifecycleStateChanges, projects as projectsTable } from "@/lib/db/schema";

export const lifecycleStates = [
  { value: "exploring", label: "Exploring" },
  { value: "building", label: "Building" },
  { value: "released", label: "Released" },
  { value: "maintenance", label: "Maintenance" },
  { value: "shelved", label: "Shelved" },
] as const;

export type LifecycleState = (typeof lifecycleStates)[number]["value"];
export type Project = typeof projectsTable.$inferSelect;

export class ProjectInputError extends Error {}

export async function listProjects() {
  return getDatabase().select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
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

  await database.transaction(async (transaction) => {
    const [project] = await transaction
      .update(projectsTable)
      .set({ lifecycleState: nextState, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId))
      .returning({ id: projectsTable.id });

    if (!project) throw new ProjectInputError("Project not found");

    await transaction.insert(lifecycleStateChanges).values({
      projectId,
      lifecycleState: nextState,
      note: note.trim(),
    });
  });
}

export function lifecycleStateLabel(state: LifecycleState) {
  return lifecycleStates.find((candidate) => candidate.value === state)?.label ?? state;
}

type ProjectTransaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

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
    })
    .returning({ id: projectsTable.id });

  await transaction.insert(lifecycleStateChanges).values({
    projectId: createdProject.id,
    lifecycleState: project.lifecycleState,
    note: project.note,
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

function requireId(id: string, subject: "Idea" | "Project") {
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
