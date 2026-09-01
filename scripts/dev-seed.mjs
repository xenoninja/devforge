import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const ids = {
  inboxIdea: "10000000-0000-4000-8000-000000000001",
  originIdea: "10000000-0000-4000-8000-000000000002",
  project: "20000000-0000-4000-8000-000000000001",
  nowFeature: "30000000-0000-4000-8000-000000000001",
  nextFeature: "30000000-0000-4000-8000-000000000002",
  laterFeature: "30000000-0000-4000-8000-000000000003",
  journal: "40000000-0000-4000-8000-000000000001",
  decision: "50000000-0000-4000-8000-000000000001",
  lifecycleChange: "60000000-0000-4000-8000-000000000001",
  activity: "70000000-0000-4000-8000-000000000001",
};

const now = new Date();
const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const pool = new Pool({ connectionString, max: 1 });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  await client.query(
    `INSERT INTO ideas (id, title, notes, state, created_at, updated_at)
     VALUES
       ($1, 'Offline-first code notebook', 'Explore local sync and conflict handling.', 'inbox', $3, $3),
       ($2, 'DevForge', 'A cockpit for resuming cold Projects without archaeology.', 'promoted', $4, $4)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       notes = EXCLUDED.notes,
       state = EXCLUDED.state,
       updated_at = EXCLUDED.updated_at`,
    [ids.inboxIdea, ids.originIdea, hoursAgo(2), hoursAgo(72)],
  );

  await client.query(
    `INSERT INTO projects (
       id, name, description, repository_url, deployed_url, stack,
       lifecycle_state, objective, next_action, origin_idea_id,
       created_at, updated_at, last_activity_at
     ) VALUES (
       $1, 'DevForge', 'A private development cockpit for solo software work.',
       'https://github.com/example/devforge', NULL, 'Next.js · Postgres · Docker',
       'building', 'Make cold Projects resumable in minutes',
       'Polish the phone-sized capture flow', $2, $3, $4, $4
     )
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       repository_url = EXCLUDED.repository_url,
       deployed_url = EXCLUDED.deployed_url,
       stack = EXCLUDED.stack,
       lifecycle_state = EXCLUDED.lifecycle_state,
       objective = EXCLUDED.objective,
       next_action = EXCLUDED.next_action,
       origin_idea_id = EXCLUDED.origin_idea_id,
       updated_at = EXCLUDED.updated_at,
       last_activity_at = EXCLUDED.last_activity_at`,
    [ids.project, ids.originIdea, hoursAgo(72), hoursAgo(1)],
  );

  await client.query(
    `INSERT INTO features (id, project_id, title, lane, done, rank, created_at, updated_at)
     VALUES
       ($1, $4, 'Verify the resume view on a phone', 'now', false, 1000, $5, $5),
       ($2, $4, 'Add repository enrichment', 'next', false, 1000, $6, $6),
       ($3, $4, 'Explore offline capture', 'later', false, 1000, $7, $7)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       title = EXCLUDED.title,
       lane = EXCLUDED.lane,
       done = EXCLUDED.done,
       rank = EXCLUDED.rank,
       updated_at = EXCLUDED.updated_at`,
    [ids.nowFeature, ids.nextFeature, ids.laterFeature, ids.project, hoursAgo(18), hoursAgo(36), hoursAgo(48)],
  );

  await client.query(
    `INSERT INTO journal_entries (id, project_id, markdown, created_at, updated_at)
     VALUES ($1, $2, 'Reordered the Project page around **Objective**, **Next Action**, and the Now Lane.', $3, $3)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       markdown = EXCLUDED.markdown,
       updated_at = EXCLUDED.updated_at`,
    [ids.journal, ids.project, hoursAgo(3)],
  );

  await client.query(
    `INSERT INTO decisions (id, project_id, decided, rationale, created_at)
     VALUES ($1, $2, 'Keep the development seed separate', 'Fresh installs must always start empty.', $3)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       decided = EXCLUDED.decided,
       rationale = EXCLUDED.rationale`,
    [ids.decision, ids.project, hoursAgo(8)],
  );

  await client.query(
    `INSERT INTO lifecycle_state_changes (id, project_id, lifecycle_state, note, created_at)
     VALUES ($1, $2, 'building', 'The cockpit workflow is ready for release polish.', $3)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       lifecycle_state = EXCLUDED.lifecycle_state,
       note = EXCLUDED.note`,
    [ids.lifecycleChange, ids.project, hoursAgo(24)],
  );

  await client.query(
    `INSERT INTO activities (id, project_id, source, created_at)
     VALUES ($1, $2, 'journal_entry', $3)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       source = EXCLUDED.source,
       created_at = EXCLUDED.created_at`,
    [ids.activity, ids.project, hoursAgo(1)],
  );

  await client.query("COMMIT");
  console.log("Development data is ready.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
