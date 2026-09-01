import { NextRequest, NextResponse } from "next/server";

import {
  changeLifecycleState,
  createDecision,
  createJournalEntry,
  createProject,
  deleteJournalEntry,
  editJournalEntry,
  ProjectInputError,
  updateNextAction,
  updateObjective,
} from "@/lib/projects";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = field(form, "action");

  try {
    switch (action) {
      case "create": {
        const projectId = await createProject({
          name: field(form, "name"),
          description: field(form, "description"),
          repositoryUrl: field(form, "repositoryUrl"),
          deployedUrl: field(form, "deployedUrl"),
          stack: field(form, "stack"),
          lifecycleState: field(form, "lifecycleState"),
          note: field(form, "note"),
        });
        return redirectToProject(projectId);
      }
      case "change-lifecycle-state": {
        const projectId = field(form, "id");
        await changeLifecycleState(projectId, field(form, "lifecycleState"), field(form, "note"));
        return redirectToProject(projectId);
      }
      case "create-journal-entry": {
        const projectId = field(form, "id");
        await createJournalEntry(projectId, field(form, "markdown"));
        return redirectToProject(projectId);
      }
      case "edit-journal-entry": {
        const projectId = field(form, "id");
        await editJournalEntry(projectId, field(form, "entryId"), field(form, "markdown"));
        return redirectToProject(projectId);
      }
      case "delete-journal-entry": {
        const projectId = field(form, "id");
        await deleteJournalEntry(projectId, field(form, "entryId"));
        return redirectToProject(projectId);
      }
      case "create-decision": {
        const projectId = field(form, "id");
        await createDecision(projectId, field(form, "decided"), field(form, "rationale"));
        return redirectToProject(projectId);
      }
      case "update-objective": {
        const projectId = field(form, "id");
        await updateObjective(projectId, field(form, "objective"));
        return redirectToProject(projectId);
      }
      case "update-next-action": {
        const projectId = field(form, "id");
        await updateNextAction(projectId, field(form, "nextAction"));
        return redirectToProject(projectId);
      }
      default:
        return new NextResponse("Unknown Project action", { status: 400 });
    }
  } catch (error) {
    if (error instanceof ProjectInputError) {
      return new NextResponse(error.message, { status: 400 });
    }
    throw error;
  }
}

function redirectToProject(projectId: string) {
  return new NextResponse(null, { headers: { location: `/projects/${projectId}` }, status: 303 });
}

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
