import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface Project {
  id: number;
  title: string;
  description: string;
  repository_url: string;
  status: 'experimenting' | 'developing';
  created_at: string;
  updated_at: string;
}

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

  list(status: Project['status']): Project[] {
    return this.database.prepare('SELECT * FROM projects WHERE status = ? ORDER BY updated_at DESC, id DESC')
      .all(status) as unknown as Project[];
  }

  get(id: number): Project | undefined {
    return this.database.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as Project | undefined;
  }

  close(): void { this.database.close(); }
}
