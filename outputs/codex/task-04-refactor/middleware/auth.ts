import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../services/authService';
import { AuthenticatedRequest } from '../types/requests';

export function requireAuth(req: Request, res: Response, next: NextFunction): Response | void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });

  const payload = verifyToken(header.slice(7));
  if (!payload) return res.status(401).json({ error: 'invalid token' });

  (req as AuthenticatedRequest).user = payload;
  return next();
}
