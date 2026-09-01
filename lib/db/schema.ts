import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const ideaState = pgEnum("idea_state", ["inbox", "discarded", "promoted"]);

export const lifecycleState = pgEnum("lifecycle_state", [
  "exploring",
  "building",
  "released",
  "maintenance",
  "shelved",
]);

export const featureLane = pgEnum("feature_lane", ["now", "next", "later", "icebox"]);

export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    state: ideaState("state").notNull().default("inbox"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ideas_state_created_at_idx").on(table.state, table.createdAt)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    repositoryUrl: text("repository_url").notNull(),
    deployedUrl: text("deployed_url"),
    stack: text("stack").notNull(),
    lifecycleState: lifecycleState("lifecycle_state").notNull(),
    objective: text("objective"),
    nextAction: text("next_action"),
    originIdeaId: uuid("origin_idea_id").references(() => ideas.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("projects_lifecycle_state_created_at_idx").on(table.lifecycleState, table.createdAt),
    uniqueIndex("projects_origin_idea_id_idx").on(table.originIdeaId),
  ],
);

export const features = pgTable(
  "features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    lane: featureLane("lane").notNull(),
    done: boolean("done").notNull().default(false),
    rank: integer("rank").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("features_project_lane_rank_idx").on(table.projectId, table.lane, table.rank)],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activities_project_created_at_idx").on(table.projectId, table.createdAt)],
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    markdown: text("markdown").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("journal_entries_project_created_at_idx").on(table.projectId, table.createdAt)],
);

export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    decided: text("decided").notNull(),
    rationale: text("rationale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("decisions_project_created_at_idx").on(table.projectId, table.createdAt)],
);

export const lifecycleStateChanges = pgTable(
  "lifecycle_state_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    lifecycleState: lifecycleState("lifecycle_state").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lifecycle_state_changes_project_created_at_idx").on(table.projectId, table.createdAt)],
);
