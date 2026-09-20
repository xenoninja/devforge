import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface Idea {
  id: number;
  title: string;
  description: string;
  status: 'new' | 'abandoned' | 'promoted';
  project_id: number | null;
  created_at: string;
  updated_at: string;
}

export type IdeaStatusFilter = 'all' | Idea['status'];

export class Ideas {
  private readonly database: DatabaseSync;

  constructor(directory: string) {
    mkdirSync(directory, { recursive: true });
    this.database = new DatabaseSync(join(directory, 'devforge.sqlite'));
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS ideas (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(trim(title)) > 0),
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new' CHECK(status = 'new'),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
    `);
    const version = this.database.prepare('PRAGMA user_version').get() as { user_version: number };
    if (version.user_version < 1) {
      // Rebuild the capture-only table to widen its status constraint, retaining every record.
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE ideas_migrated (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL CHECK(length(trim(title)) > 0),
          description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'abandoned')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;
        INSERT INTO ideas_migrated SELECT * FROM ideas;
        DROP TABLE ideas;
        ALTER TABLE ideas_migrated RENAME TO ideas;
        PRAGMA user_version = 1;
        COMMIT;
      `);
    }
  }

  /** Widen idea status after project schema v2; they share PRAGMA user_version. */
  static migratePromotion(database: DatabaseSync): void {
    const version = database.prepare('PRAGMA user_version').get() as { user_version: number };
    if (version.user_version < 3) {
      database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE ideas_migrated (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL CHECK(length(trim(title)) > 0),
          description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'abandoned', 'promoted')),
          project_id INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          CHECK((status = 'promoted') = (project_id IS NOT NULL))
        ) STRICT;
        INSERT INTO ideas_migrated (id, title, description, status, project_id, created_at, updated_at)
          SELECT id, title, description, status, NULL, created_at, updated_at FROM ideas;
        DROP TABLE ideas;
        ALTER TABLE ideas_migrated RENAME TO ideas;
        PRAGMA user_version = 3;
        COMMIT;
      `);
    }
  }

  create(title: string, description: string): number {
    const now = new Date().toISOString();
    const result = this.database.prepare(`
      INSERT INTO ideas (title, description, created_at, updated_at) VALUES (?, ?, ?, ?)
    `).run(title, description, now, now);
    return Number(result.lastInsertRowid);
  }

  edit(id: number, title: string, description: string): void {
    this.database.prepare('UPDATE ideas SET title = ?, description = ?, updated_at = ? WHERE id = ?')
      .run(title, description, new Date().toISOString(), id);
  }

  changeStatus(id: number, status: 'new' | 'abandoned'): boolean {
    const previous = status === 'new' ? 'abandoned' : 'new';
    return this.database.prepare('UPDATE ideas SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
      .run(status, new Date().toISOString(), id, previous).changes === 1;
  }

  promote(id: number, title: string, description: string, repository_url: string, status: 'experimenting' | 'developing'): number | undefined {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const idea = this.database.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as Idea | undefined;
      if (!idea || idea.status !== 'new') {
        this.database.exec('ROLLBACK');
        return undefined;
      }
      const now = new Date().toISOString();
      const projectId = Number(this.database.prepare(`
        INSERT INTO projects (title, description, repository_url, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(title, description, repository_url, status, now, now).lastInsertRowid);
      if (this.database.prepare(`
        UPDATE ideas SET status = 'promoted', project_id = ?, updated_at = ? WHERE id = ? AND status = 'new'
      `).run(projectId, now, id).changes !== 1) {
        this.database.exec('ROLLBACK');
        return undefined;
      }
      this.database.exec('COMMIT');
      return projectId;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  list(status: IdeaStatusFilter = 'all', search = ''): Idea[] {
    return this.database.prepare(`
      SELECT * FROM ideas WHERE (? = 'all' OR status = ?)
        AND instr(lower(title), lower(?)) > 0 ORDER BY updated_at DESC, id DESC
    `).all(status, status, search) as unknown as Idea[];
  }

  get(id: number): Idea | undefined {
    return this.database.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as unknown as Idea | undefined;
  }

  close(): void { this.database.close(); }
}
