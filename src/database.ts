import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Entries upgrade to versions 1–4. Preserve their order for existing data directories.
const migrations = [
  `
    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL CHECK(length(trim(title)) > 0),
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new' CHECK(status = 'new'),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

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
  `,
  `
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL CHECK(length(trim(title)) > 0),
      description TEXT NOT NULL DEFAULT '',
      repository_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'experimenting' CHECK(status IN ('experimenting', 'developing')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

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
  `,
  `
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
  `,
  `
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
  `,
];

export function openDatabase(directory: string): DatabaseSync {
  mkdirSync(directory, { recursive: true });
  const database = new DatabaseSync(join(directory, 'devforge.sqlite'));
  try {
    database.exec('PRAGMA foreign_keys = ON');
    const { user_version: version } = database.prepare('PRAGMA user_version').get() as { user_version: number };
    for (let index = version; index < migrations.length; index++) {
      database.exec('BEGIN IMMEDIATE');
      try {
        database.exec(migrations[index]!);
        database.exec(`PRAGMA user_version = ${index + 1}`);
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
