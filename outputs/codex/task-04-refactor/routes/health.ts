import { Request, Response, Router } from 'express';
import { pool } from '../db/pool';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', db: 'ok' });
  } catch {
    return res.status(503).json({ status: 'degraded', db: 'down' });
  }
});
