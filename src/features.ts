import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface Feature {
  id: number;
  project_id: number;
  title: string;
  description: string;
  issue_url: string;
  status: 'new' | 'developing' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export type FeatureInput = Pick<Feature, 'title' | 'description' | 'issue_url'>;
export type FeatureStatusFilter = 'all' | Feature['status'];

export const featureTransitions: Record<Feature['status'], readonly Feature['status'][]> = {
  new: ['developing', 'abandoned'],
  developing: ['completed', 'new', 'abandoned'],
  completed: ['developing'],
  abandoned: ['new'],
};

export function isFeatureStatus(value: string | null): value is Feature['status'] {
  return value !== null && Object.hasOwn(featureTransitions, value);
}

export class Features {
  private readonly database: DatabaseSync;

  constructor(directory: string) {
    this.database = new DatabaseSync(join(directory, 'devforge.sqlite'));
    this.database.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS features (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        title TEXT NOT NULL CHECK(length(trim(title)) > 0),
        description TEXT NOT NULL DEFAULT '',
        issue_url TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new' CHECK(status = 'new'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS features_project_updated ON features(project_id, updated_at DESC, id DESC);
    `);
    const version = this.database.prepare('PRAGMA user_version').get() as { user_version: number };
    if (version.user_version < 4) {
      // Preserve released feature identities, project links and timestamps while widening statuses.
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE features_migrated (
          id INTEGER PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id),
          title TEXT NOT NULL CHECK(length(trim(title)) > 0),
          description TEXT NOT NULL DEFAULT '',
          issue_url TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'developing', 'completed', 'abandoned')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;
        INSERT INTO features_migrated SELECT * FROM features;
        DROP TABLE features;
        ALTER TABLE features_migrated RENAME TO features;
        CREATE INDEX features_project_updated ON features(project_id, updated_at DESC, id DESC);
        PRAGMA user_version = 4;
        COMMIT;
      `);
    }
  }

  changeStatus(projectId: number, id: number, status: Feature['status']): boolean {
    const feature = this.get(projectId, id);
    if (!feature || !featureTransitions[feature.status].includes(status)) return false;
    return this.database.prepare(`
      UPDATE features SET status = ?, updated_at = ? WHERE project_id = ? AND id = ? AND status = ?
        AND EXISTS (SELECT 1 FROM projects WHERE id = ? AND status != 'abandoned')
    `).run(status, new Date().toISOString(), projectId, id, feature.status, projectId).changes === 1;
  }

  create(projectId: number, input: FeatureInput): number | undefined {
    const now = new Date().toISOString();
    const result = this.database.prepare(`
      INSERT INTO features (project_id, title, description, issue_url, created_at, updated_at)
      SELECT id, ?, ?, ?, ?, ? FROM projects WHERE id = ? AND status != 'abandoned'
    `).run(input.title, input.description, input.issue_url, now, now, projectId);
    return result.changes === 1 ? Number(result.lastInsertRowid) : undefined;
  }

  edit(projectId: number, id: number, input: FeatureInput): void {
    this.database.prepare('UPDATE features SET title = ?, description = ?, issue_url = ?, updated_at = ? WHERE project_id = ? AND id = ?')
      .run(input.title, input.description, input.issue_url, new Date().toISOString(), projectId, id);
  }

  list(projectId: number, status: FeatureStatusFilter = 'all', search = ''): Feature[] {
    return this.database.prepare(`
      SELECT * FROM features WHERE project_id = ? AND (? = 'all' OR status = ?)
        AND instr(lower(title), lower(?)) > 0 ORDER BY updated_at DESC, id DESC
    `).all(projectId, status, status, search) as unknown as Feature[];
  }

  get(projectId: number, id: number): Feature | undefined {
    return this.database.prepare('SELECT * FROM features WHERE project_id = ? AND id = ?')
      .get(projectId, id) as unknown as Feature | undefined;
  }

  close(): void { this.database.close(); }
}
