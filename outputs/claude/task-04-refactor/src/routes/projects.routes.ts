import { Router, type Request, type Response } from 'express';
import * as projectsService from '../services/projects.service.js';
import { ProjectError } from '../services/projects.service.js';
import { requireAuth } from '../middleware/requireAuth.js';
import type { AuthedRequest } from '../types/index.js';

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

function ownerId(req: Request): number {
  return (req as AuthedRequest).user.sub;
}

projectsRouter.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await projectsService.listForOwner(ownerId(req));
    return res.json({ projects });
  } catch (err) {
    console.error('list projects error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

projectsRouter.post('/projects', async (req: Request, res: Response) => {
  try {
    const project = await projectsService.create(ownerId(req), req.body ?? {});
    return res.status(201).json(project);
  } catch (err) {
    if (err instanceof ProjectError) return res.status(err.status).json({ error: err.message });
    console.error('create project error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

projectsRouter.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectsService.getByIdForOwner(ownerId(req), parseInt(req.params.id));
    return res.json(project);
  } catch (err) {
    if (err instanceof ProjectError) return res.status(err.status).json({ error: err.message });
    console.error('get project error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

projectsRouter.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    await projectsService.deleteByIdForOwner(ownerId(req), parseInt(req.params.id));
    return res.status(204).end();
  } catch (err) {
    if (err instanceof ProjectError) return res.status(err.status).json({ error: err.message });
    console.error('delete project error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});
