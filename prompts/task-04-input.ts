// server.ts — single-file Express app. Everything lives here on purpose.
// Auth, validation, db queries, business logic, error handling all inline in route handlers.
// This is the input for the refactor task.

import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'app',
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// POST /auth/register
app.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'invalid email' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password too short' });
    }
    if (!name || typeof name !== 'string' || name.length < 2) {
      return res.status(400).json({ error: 'invalid name' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const inserted = await pool.query(
      'INSERT INTO users (email, password_hash, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name',
      [email, hash, name]
    );
    const user = inserted.rows[0];
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /auth/login
app.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const result = await pool.query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'invalid credentials' });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// GET /me — requires auth
app.get('/me', async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
    const token = header.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'invalid token' });
    }
    const result = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [payload.sub]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'user not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// GET /projects — requires auth, lists user's projects
app.get('/projects', async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
    const token = header.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'invalid token' });
    }
    const result = await pool.query(
      'SELECT id, name, description, created_at FROM projects WHERE owner_id = $1 ORDER BY created_at DESC',
      [payload.sub]
    );
    return res.json({ projects: result.rows });
  } catch (err) {
    console.error('list projects error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /projects — requires auth, creates a project
app.post('/projects', async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
    const token = header.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'invalid token' });
    }
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 200) {
      return res.status(400).json({ error: 'invalid name' });
    }
    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return res.status(400).json({ error: 'invalid description' });
    }
    const countRes = await pool.query('SELECT COUNT(*)::int AS c FROM projects WHERE owner_id = $1', [payload.sub]);
    if (countRes.rows[0].c >= 50) {
      return res.status(403).json({ error: 'project limit reached' });
    }
    const inserted = await pool.query(
      'INSERT INTO projects (owner_id, name, description, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, name, description, created_at',
      [payload.sub, name, description || null]
    );
    return res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error('create project error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// GET /projects/:id — requires auth and ownership
app.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
    const token = header.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'invalid token' });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const result = await pool.query('SELECT id, owner_id, name, description, created_at FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' });
    if (result.rows[0].owner_id !== payload.sub) return res.status(403).json({ error: 'forbidden' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('get project error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// DELETE /projects/:id — requires auth and ownership
app.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
    const token = header.slice(7);
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'invalid token' });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const result = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' });
    if (result.rows[0].owner_id !== payload.sub) return res.status(403).json({ error: 'forbidden' });
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return res.status(204).end();
  } catch (err) {
    console.error('delete project error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// GET /health — no auth
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', db: 'ok' });
  } catch {
    return res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('unhandled', err);
  res.status(500).json({ error: 'internal error' });
});

const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
