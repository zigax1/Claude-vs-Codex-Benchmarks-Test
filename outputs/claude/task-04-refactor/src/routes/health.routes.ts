import { Router, type Request, type Response } from 'express';
import { pool } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', db: 'ok' });
  } catch {
    return res.status(503).json({ status: 'degraded', db: 'down' });
  }
});
