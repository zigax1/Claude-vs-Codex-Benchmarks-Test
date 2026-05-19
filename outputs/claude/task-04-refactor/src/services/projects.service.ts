import { pool } from '../db/pool.js';
import type { ProjectRecord } from '../types/index.js';

export class ProjectError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const PROJECT_LIMIT = 50;

type ProjectListItem = Pick<ProjectRecord, 'id' | 'name' | 'description' | 'created_at'>;
type ProjectFull = ProjectRecord;
type ProjectCreated = Pick<ProjectRecord, 'id' | 'name' | 'description' | 'created_at'>;

export async function listForOwner(ownerId: number): Promise<ProjectListItem[]> {
  const result = await pool.query<ProjectListItem>(
    'SELECT id, name, description, created_at FROM projects WHERE owner_id = $1 ORDER BY created_at DESC',
    [ownerId]
  );
  return result.rows;
}

export async function create(
  ownerId: number,
  input: { name: unknown; description: unknown }
): Promise<ProjectCreated> {
  const { name, description } = input;
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 200) {
    throw new ProjectError(400, 'invalid name');
  }
  if (description && (typeof description !== 'string' || description.length > 2000)) {
    throw new ProjectError(400, 'invalid description');
  }
  const countRes = await pool.query<{ c: number }>(
    'SELECT COUNT(*)::int AS c FROM projects WHERE owner_id = $1',
    [ownerId]
  );
  if (countRes.rows[0].c >= PROJECT_LIMIT) {
    throw new ProjectError(403, 'project limit reached');
  }
  const inserted = await pool.query<ProjectCreated>(
    'INSERT INTO projects (owner_id, name, description, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, name, description, created_at',
    [ownerId, name, (description as string) || null]
  );
  return inserted.rows[0];
}

export async function getByIdForOwner(ownerId: number, id: number): Promise<ProjectFull> {
  if (!Number.isFinite(id)) throw new ProjectError(400, 'invalid id');
  const result = await pool.query<ProjectFull>(
    'SELECT id, owner_id, name, description, created_at FROM projects WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) throw new ProjectError(404, 'not found');
  if (result.rows[0].owner_id !== ownerId) throw new ProjectError(403, 'forbidden');
  return result.rows[0];
}

export async function deleteByIdForOwner(ownerId: number, id: number): Promise<void> {
  if (!Number.isFinite(id)) throw new ProjectError(400, 'invalid id');
  const result = await pool.query<{ owner_id: number }>(
    'SELECT owner_id FROM projects WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) throw new ProjectError(404, 'not found');
  if (result.rows[0].owner_id !== ownerId) throw new ProjectError(403, 'forbidden');
  await pool.query('DELETE FROM projects WHERE id = $1', [id]);
}
