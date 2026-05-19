import type { Request } from 'express';

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
}

export type PublicUser = Pick<UserRecord, 'id' | 'email' | 'name'>;

export interface ProjectRecord {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  created_at: Date;
}

export interface JwtPayload {
  sub: number;
  email: string;
}

export interface AuthedRequest extends Request {
  user: JwtPayload;
}
