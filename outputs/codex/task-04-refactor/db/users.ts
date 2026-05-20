import { pool } from './pool';
import { PublicUser, UserProfile, UserWithPassword } from '../types/models';

export async function findUserIdByEmail(email: string): Promise<Pick<PublicUser, 'id'> | undefined> {
  const result = await pool.query<Pick<PublicUser, 'id'>>('SELECT id FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

export async function createUser(email: string, passwordHash: string, name: string): Promise<PublicUser> {
  const result = await pool.query<PublicUser>(
    'INSERT INTO users (email, password_hash, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name',
    [email, passwordHash, name]
  );
  return result.rows[0];
}

export async function findUserForLogin(email: string): Promise<UserWithPassword | undefined> {
  const result = await pool.query<UserWithPassword>(
    'SELECT id, email, name, password_hash FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
}

export async function findUserProfileById(id: number): Promise<UserProfile | undefined> {
  const result = await pool.query<UserProfile>('SELECT id, email, name, created_at FROM users WHERE id = $1', [id]);
  return result.rows[0];
}
