import { Request } from 'express';
import { AuthPayload } from './auth';

export interface AuthenticatedRequest extends Request {
  user: AuthPayload;
}

export interface RegisterBody {
  email?: unknown;
  password?: unknown;
  name?: unknown;
}

export interface LoginBody {
  email?: string;
  password?: string;
}

export interface CreateProjectBody {
  name?: unknown;
  description?: unknown;
}
