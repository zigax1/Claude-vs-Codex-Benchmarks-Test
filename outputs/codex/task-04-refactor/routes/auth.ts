import { Request, Response, Router } from 'express';
import { isEmailRegistered, loginUser, registerUser } from '../services/authService';
import { LoginBody, RegisterBody } from '../types/requests';

export const authRouter = Router();

authRouter.post('/register', async (req: Request<Record<string, never>, unknown, RegisterBody>, res: Response) => {
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
    if (await isEmailRegistered(email)) {
      return res.status(409).json({ error: 'email already registered' });
    }

    const result = await registerUser(email, password, name);
    return res.status(201).json(result);
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

authRouter.post('/login', async (req: Request<Record<string, never>, unknown, LoginBody>, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const result = await loginUser(email, password);
    if (!result) return res.status(401).json({ error: 'invalid credentials' });

    return res.json(result);
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});
