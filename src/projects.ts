import type { DatabaseSync } from 'node:sqlite';

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
  constructor(private readonly database: DatabaseSync) {}

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
}
