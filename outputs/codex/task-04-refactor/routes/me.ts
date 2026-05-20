import { Request, Response, Router } from 'express';
import { findUserProfileById } from '../db/users';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/requests';

export const meRouter = Router();

meRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const profile = await findUserProfileById(user.sub);
    if (!profile) return res.status(404).json({ error: 'user not found' });

    return res.json(profile);
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});
