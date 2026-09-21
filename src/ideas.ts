import type { DatabaseSync } from 'node:sqlite';

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
  constructor(private readonly database: DatabaseSync) {}

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
}
