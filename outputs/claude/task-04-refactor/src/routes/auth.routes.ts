import { Router, type Request, type Response } from 'express';
import * as authService from '../services/auth.service.js';
import { AuthError } from '../services/auth.service.js';
import { requireAuth } from '../middleware/requireAuth.js';
import type { AuthedRequest } from '../types/index.js';

export const authRouter = Router();

authRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body ?? {});
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error('register error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

authRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body ?? {});
    return res.json(result);
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error('login error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const me = await authService.getMe((req as AuthedRequest).user.sub);
    return res.json(me);
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error('me error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});
