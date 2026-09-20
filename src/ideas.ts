import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface Idea {
  id: number;
  title: string;
  description: string;
  status: 'new';
  created_at: string;
  updated_at: string;
}

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
  }

  create(title: string, description: string): number {
    const now = new Date().toISOString();
    const result = this.database.prepare(`
      INSERT INTO ideas (title, description, created_at, updated_at) VALUES (?, ?, ?, ?)
    `).run(title, description, now, now);
    return Number(result.lastInsertRowid);
  }

  listNew(): Idea[] {
    return this.database.prepare("SELECT * FROM ideas WHERE status = 'new' ORDER BY updated_at DESC, id DESC").all() as unknown as Idea[];
  }

  get(id: number): Idea | undefined {
    return this.database.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as unknown as Idea | undefined;
  }

  close(): void { this.database.close(); }
}
