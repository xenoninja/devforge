import { desc, eq } from "drizzle-orm";

import { getDatabase } from "@/lib/db";
import { lifecycleStateChanges, projects as projectsTable } from "@/lib/db/schema";

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
  const projectId = requireProjectId(id);
  const database = getDatabase();
  const [project] = await database.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);

  if (!project) return null;

  const changes = await database
    .select()
    .from(lifecycleStateChanges)
    .where(eq(lifecycleStateChanges.projectId, projectId))
    .orderBy(desc(lifecycleStateChanges.createdAt));

  return { project, changes };
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
  const name = requireText(input.name, "A Project name is required");
  const description = requireText(input.description, "A Project description is required");
  const repositoryUrl = requireWebUrl(input.repositoryUrl, "A valid repository URL is required");
  const deployedUrl = input.deployedUrl.trim()
    ? requireWebUrl(input.deployedUrl, "A valid deployed URL is required")
    : null;
  const stack = requireText(input.stack, "A stack line is required");
  const lifecycleState = requireLifecycleState(input.lifecycleState);

  return getDatabase().transaction(async (transaction) => {
    const [project] = await transaction
      .insert(projectsTable)
      .values({ name, description, repositoryUrl, deployedUrl, stack, lifecycleState })
      .returning({ id: projectsTable.id });

    await transaction.insert(lifecycleStateChanges).values({
      projectId: project.id,
      lifecycleState,
      note: input.note.trim(),
    });

    return project.id;
  });
}

export async function changeLifecycleState(id: string, lifecycleState: string, note: string) {
  const projectId = requireProjectId(id);
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

function requireProjectId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ProjectInputError("A valid Project id is required");
  }
  return id;
}

function requireLifecycleState(value: string): LifecycleState {
  const state = lifecycleStates.find((candidate) => candidate.value === value)?.value;
  if (!state) throw new ProjectInputError("A valid Lifecycle State is required");
  return state;
}
