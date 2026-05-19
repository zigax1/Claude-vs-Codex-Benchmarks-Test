import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { AuthedRequest, JwtPayload } from '../types/index.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing token' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as unknown as JwtPayload;
    (req as AuthedRequest).user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}
