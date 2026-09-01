"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { captureIdea, discardIdea, editIdea, restoreIdea } from "@/lib/ideas";
import {
  changeLifecycleState,
  createDecision,
  createFeature,
  createJournalEntry,
  createProject,
  deleteFeature,
  deleteJournalEntry,
  editFeature,
  editJournalEntry,
  moveFeatureToLane,
  promoteIdea,
  rankFeature,
  updateNextAction,
  updateObjective,
  updateProjectMetadata,
} from "@/lib/projects";
import { formChecked, formText } from "@/lib/form-data";

function refreshDashboard(destination = "/") {
  revalidatePath("/");
  redirect(destination);
}

function refreshProject(projectId: string) {
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function captureIdeaAction(form: FormData) {
  await captureIdea(formText(form, "title"), formText(form, "notes"));
  refreshDashboard();
}

export async function editIdeaAction(form: FormData) {
  await editIdea(formText(form, "id"), formText(form, "title"), formText(form, "notes"));
  refreshDashboard();
}

export async function discardIdeaAction(form: FormData) {
  await discardIdea(formText(form, "id"));
  refreshDashboard();
}

export async function restoreIdeaAction(form: FormData) {
  await restoreIdea(formText(form, "id"));
  refreshDashboard("/?view=archived");
}

export async function promoteIdeaAction(form: FormData) {
  const projectId = await promoteIdea(
    formText(form, "id"),
    formText(form, "lifecycleState"),
    formText(form, "objective"),
    formText(form, "nextAction"),
  );
  refreshProject(projectId);
}

export async function createProjectAction(form: FormData) {
  const projectId = await createProject({
    name: formText(form, "name"),
    description: formText(form, "description"),
    repositoryUrl: formText(form, "repositoryUrl"),
    deployedUrl: formText(form, "deployedUrl"),
    stack: formText(form, "stack"),
    lifecycleState: formText(form, "lifecycleState"),
    note: formText(form, "note"),
    objective: formText(form, "objective"),
    nextAction: formText(form, "nextAction"),
  });
  refreshProject(projectId);
}

export async function updateProjectMetadataAction(form: FormData) {
  const projectId = formText(form, "id");
  await updateProjectMetadata(projectId, {
    name: formText(form, "name"),
    description: formText(form, "description"),
    repositoryUrl: formText(form, "repositoryUrl"),
    deployedUrl: formText(form, "deployedUrl"),
    stack: formText(form, "stack"),
  });
  refreshProject(projectId);
}

export async function changeLifecycleStateAction(form: FormData) {
  const projectId = formText(form, "id");
  await changeLifecycleState(projectId, formText(form, "lifecycleState"), formText(form, "note"));
  refreshProject(projectId);
}

export async function createJournalEntryAction(form: FormData) {
  const projectId = formText(form, "id");
  await createJournalEntry(projectId, formText(form, "markdown"));
  refreshProject(projectId);
}

export async function editJournalEntryAction(form: FormData) {
  const projectId = formText(form, "id");
  await editJournalEntry(projectId, formText(form, "entryId"), formText(form, "markdown"));
  refreshProject(projectId);
}

export async function deleteJournalEntryAction(form: FormData) {
  const projectId = formText(form, "id");
  await deleteJournalEntry(projectId, formText(form, "entryId"));
  refreshProject(projectId);
}

export async function createDecisionAction(form: FormData) {
  const projectId = formText(form, "id");
  await createDecision(projectId, formText(form, "decided"), formText(form, "rationale"));
  refreshProject(projectId);
}

export async function updateObjectiveAction(form: FormData) {
  const projectId = formText(form, "id");
  await updateObjective(projectId, formText(form, "objective"));
  refreshProject(projectId);
}

export async function updateNextActionAction(form: FormData) {
  const projectId = formText(form, "id");
  await updateNextAction(projectId, formText(form, "nextAction"));
  refreshProject(projectId);
}

export async function createFeatureAction(form: FormData) {
  const projectId = formText(form, "id");
  await createFeature(projectId, formText(form, "title"), formText(form, "lane"), formChecked(form, "done"));
  refreshProject(projectId);
}

export async function editFeatureAction(form: FormData) {
  const projectId = formText(form, "id");
  await editFeature(projectId, formText(form, "featureId"), {
    title: formText(form, "title"),
    done: formChecked(form, "done"),
  });
  refreshProject(projectId);
}

export async function moveFeatureToLaneAction(form: FormData) {
  const projectId = formText(form, "id");
  await moveFeatureToLane(projectId, formText(form, "featureId"), formText(form, "lane"));
  refreshProject(projectId);
}

export async function rankFeatureAction(form: FormData) {
  const projectId = formText(form, "id");
  await rankFeature(projectId, formText(form, "featureId"), formText(form, "direction"));
  refreshProject(projectId);
}

export async function deleteFeatureAction(form: FormData) {
  const projectId = formText(form, "id");
  await deleteFeature(projectId, formText(form, "featureId"));
  refreshProject(projectId);
}
