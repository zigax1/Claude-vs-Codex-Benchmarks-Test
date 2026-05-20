import { pool } from './pool';
import { Project, ProjectOwner, ProjectWithOwner } from '../types/models';

export async function listProjectsByOwner(ownerId: number): Promise<Project[]> {
  const result = await pool.query<Project>(
    'SELECT id, name, description, created_at FROM projects WHERE owner_id = $1 ORDER BY created_at DESC',
    [ownerId]
  );
  return result.rows;
}

export async function countProjectsByOwner(ownerId: number): Promise<number> {
  const result = await pool.query<{ c: number }>('SELECT COUNT(*)::int AS c FROM projects WHERE owner_id = $1', [
    ownerId,
  ]);
  return result.rows[0].c;
}

export async function createProject(ownerId: number, name: string, description: string | null): Promise<Project> {
  const result = await pool.query<Project>(
    'INSERT INTO projects (owner_id, name, description, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, name, description, created_at',
    [ownerId, name, description]
  );
  return result.rows[0];
}

export async function findProjectById(id: number): Promise<ProjectWithOwner | undefined> {
  const result = await pool.query<ProjectWithOwner>(
    'SELECT id, owner_id, name, description, created_at FROM projects WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

export async function findProjectOwnerById(id: number): Promise<ProjectOwner | undefined> {
  const result = await pool.query<ProjectOwner>('SELECT owner_id FROM projects WHERE id = $1', [id]);
  return result.rows[0];
}

export async function deleteProjectById(id: number): Promise<void> {
  await pool.query('DELETE FROM projects WHERE id = $1', [id]);
}
