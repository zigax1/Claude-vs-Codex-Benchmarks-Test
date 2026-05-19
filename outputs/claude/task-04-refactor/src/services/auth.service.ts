import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import type { PublicUser, UserRecord } from '../types/index.js';

export class AuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function signToken(user: PublicUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });
}

export async function register(input: { email: unknown; password: unknown; name: unknown }) {
  const { email, password, name } = input;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new AuthError(400, 'invalid email');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new AuthError(400, 'password too short');
  }
  if (!name || typeof name !== 'string' || name.length < 2) {
    throw new AuthError(400, 'invalid name');
  }
  const existing = await pool.query<{ id: number }>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) throw new AuthError(409, 'email already registered');

  const hash = await bcrypt.hash(password, 10);
  const inserted = await pool.query<PublicUser>(
    'INSERT INTO users (email, password_hash, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name',
    [email, hash, name]
  );
  const user = inserted.rows[0];
  return { user, token: signToken(user) };
}

export async function login(input: { email: unknown; password: unknown }) {
  const { email, password } = input;
  if (!email || !password) throw new AuthError(400, 'email and password required');
  const result = await pool.query<UserRecord>(
    'SELECT id, email, name, password_hash FROM users WHERE email = $1',
    [email as string]
  );
  if (result.rows.length === 0) throw new AuthError(401, 'invalid credentials');
  const row = result.rows[0];
  const ok = await bcrypt.compare(password as string, row.password_hash);
  if (!ok) throw new AuthError(401, 'invalid credentials');
  const publicUser: PublicUser = { id: row.id, email: row.email, name: row.name };
  return { user: publicUser, token: signToken(publicUser) };
}

export async function getMe(userId: number) {
  const result = await pool.query<Omit<UserRecord, 'password_hash'>>(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) throw new AuthError(404, 'user not found');
  return result.rows[0];
}
