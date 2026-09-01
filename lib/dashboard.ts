import { desc, eq, ilike, or } from "drizzle-orm";

import { getDatabase } from "@/lib/db";
import { decisions, ideas, journalEntries, projects } from "@/lib/db/schema";
import { interleaveStoryItems } from "@/lib/story";

export type TimelineItem =
  | {
      type: "journal-entry";
      id: string;
      projectId: string;
      projectName: string;
      markdown: string;
      createdAt: Date;
    }
  | {
      type: "decision";
      id: string;
      projectId: string;
      projectName: string;
      decided: string;
      rationale: string;
      createdAt: Date;
    };

export type SearchResults = {
  projects: { id: string; name: string }[];
  ideas: { id: string; title: string; notes: string; state: "inbox" | "discarded" | "promoted" }[];
  journalEntries: {
    id: string;
    projectId: string;
    projectName: string;
    markdown: string;
  }[];
  decisions: {
    id: string;
    projectId: string;
    projectName: string;
    decided: string;
    rationale: string;
  }[];
};

export async function listTimeline(): Promise<TimelineItem[]> {
  const database = getDatabase();
  const [entries, projectDecisions] = await Promise.all([
    database
      .select({
        id: journalEntries.id,
        projectId: journalEntries.projectId,
        projectName: projects.name,
        markdown: journalEntries.markdown,
        createdAt: journalEntries.createdAt,
      })
      .from(journalEntries)
      .innerJoin(projects, eq(projects.id, journalEntries.projectId))
      .orderBy(desc(journalEntries.createdAt), desc(journalEntries.id)),
    database
      .select({
        id: decisions.id,
        projectId: decisions.projectId,
        projectName: projects.name,
        decided: decisions.decided,
        rationale: decisions.rationale,
        createdAt: decisions.createdAt,
      })
      .from(decisions)
      .innerJoin(projects, eq(projects.id, decisions.projectId))
      .orderBy(desc(decisions.createdAt), desc(decisions.id)),
  ]);

  return interleaveStoryItems(entries, projectDecisions);
}

export async function searchDashboard(query: string): Promise<SearchResults> {
  const term = query.trim();
  if (!term) return { projects: [], ideas: [], journalEntries: [], decisions: [] };

  const pattern = `%${term}%`;
  const database = getDatabase();
  const [projectResults, ideaResults, entryResults, decisionResults] = await Promise.all([
    database
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(ilike(projects.name, pattern))
      .orderBy(desc(projects.lastActivityAt)),
    database
      .select({ id: ideas.id, title: ideas.title, notes: ideas.notes, state: ideas.state })
      .from(ideas)
      .where(or(ilike(ideas.title, pattern), ilike(ideas.notes, pattern)))
      .orderBy(desc(ideas.createdAt)),
    database
      .select({
        id: journalEntries.id,
        projectId: journalEntries.projectId,
        projectName: projects.name,
        markdown: journalEntries.markdown,
      })
      .from(journalEntries)
      .innerJoin(projects, eq(projects.id, journalEntries.projectId))
      .where(ilike(journalEntries.markdown, pattern))
      .orderBy(desc(journalEntries.createdAt)),
    database
      .select({
        id: decisions.id,
        projectId: decisions.projectId,
        projectName: projects.name,
        decided: decisions.decided,
        rationale: decisions.rationale,
      })
      .from(decisions)
      .innerJoin(projects, eq(projects.id, decisions.projectId))
      .where(or(ilike(decisions.decided, pattern), ilike(decisions.rationale, pattern)))
      .orderBy(desc(decisions.createdAt)),
  ]);

  return {
    projects: projectResults,
    ideas: ideaResults,
    journalEntries: entryResults,
    decisions: decisionResults,
  };
}
