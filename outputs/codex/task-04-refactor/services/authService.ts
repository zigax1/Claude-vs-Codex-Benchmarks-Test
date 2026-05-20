import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, findUserForLogin, findUserIdByEmail } from '../db/users';
import { AuthPayload } from '../types/auth';
import { PublicUser } from '../types/models';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user: PublicUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function isEmailRegistered(email: string): Promise<boolean> {
  return Boolean(await findUserIdByEmail(email));
}

export async function registerUser(email: string, password: string, name: string): Promise<{ user: PublicUser; token: string }> {
  const hash = await bcrypt.hash(password, 10);
  const user = await createUser(email, hash, name);
  return { user, token: signToken(user) };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: PublicUser; token: string } | null> {
  const user = await findUserForLogin(email);
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  const publicUser = { id: user.id, email: user.email, name: user.name };
  return { user: publicUser, token: signToken(publicUser) };
}
