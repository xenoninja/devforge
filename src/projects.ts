import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Ideas } from './ideas.js';

export interface Project {
  id: number;
  title: string;
  description: string;
  repository_url: string;
  status: 'experimenting' | 'developing' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export type ProjectStatusFilter = 'all' | Project['status'];

export type ProjectInput = Pick<Project, 'title' | 'description' | 'repository_url'>;

export class Projects {
  private readonly database: DatabaseSync;

  constructor(directory: string) {
    mkdirSync(directory, { recursive: true });
    this.database = new DatabaseSync(join(directory, 'devforge.sqlite'));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(trim(title)) > 0),
        description TEXT NOT NULL DEFAULT '',
        repository_url TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'experimenting' CHECK(status IN ('experimenting', 'developing')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
    `);
    const version = this.database.prepare('PRAGMA user_version').get() as { user_version: number };
    if (version.user_version < 2) {
      // Widen the released constraint without changing project identities or metadata.
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE projects_migrated (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL CHECK(length(trim(title)) > 0),
          description TEXT NOT NULL DEFAULT '',
          repository_url TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'experimenting' CHECK(status IN ('experimenting', 'developing', 'abandoned')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;
        INSERT INTO projects_migrated SELECT * FROM projects;
        DROP TABLE projects;
        ALTER TABLE projects_migrated RENAME TO projects;
        PRAGMA user_version = 2;
        COMMIT;
      `);
    }
    Ideas.migratePromotion(this.database);
  }

  create(input: ProjectInput, status: Project['status']): number {
    const now = new Date().toISOString();
    return Number(this.database.prepare(`
      INSERT INTO projects (title, description, repository_url, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(input.title, input.description, input.repository_url, status, now, now).lastInsertRowid);
  }

  edit(id: number, input: ProjectInput): void {
    this.database.prepare('UPDATE projects SET title = ?, description = ?, repository_url = ?, updated_at = ? WHERE id = ?')
      .run(input.title, input.description, input.repository_url, new Date().toISOString(), id);
  }

  changeStatus(id: number, status: Project['status']): boolean {
    return this.database.prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ? AND status != ?')
      .run(status, new Date().toISOString(), id, status).changes === 1;
  }

  list(status: ProjectStatusFilter = 'all', search = ''): Project[] {
    return this.database.prepare(`
      SELECT * FROM projects WHERE (? = 'all' OR status = ?)
        AND instr(lower(title), lower(?)) > 0 ORDER BY updated_at DESC, id DESC
    `).all(status, status, search) as unknown as Project[];
  }

  get(id: number): Project | undefined {
    return this.database.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as Project | undefined;
  }

  close(): void { this.database.close(); }
}
