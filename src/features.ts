import type { DatabaseSync } from 'node:sqlite';

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
  constructor(private readonly database: DatabaseSync) {}

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
}
