import { Request, Response, Router } from 'express';
import { deleteProjectById, findProjectById, findProjectOwnerById, listProjectsByOwner } from '../db/projects';
import { requireAuth } from '../middleware/auth';
import { createProject, hasReachedProjectLimit } from '../services/projectService';
import { AuthenticatedRequest, CreateProjectBody } from '../types/requests';

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const projects = await listProjectsByOwner(user.sub);
    return res.json({ projects });
  } catch (err) {
    console.error('list projects error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

projectsRouter.post('/', async (req: Request<Record<string, never>, unknown, CreateProjectBody>, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 200) {
      return res.status(400).json({ error: 'invalid name' });
    }
    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return res.status(400).json({ error: 'invalid description' });
    }
    if (await hasReachedProjectLimit(user.sub)) {
      return res.status(403).json({ error: 'project limit reached' });
    }

    const project = await createProject(user.sub, name, typeof description === 'string' ? description : undefined);
    return res.status(201).json(project);
  } catch (err) {
    console.error('create project error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

projectsRouter.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const project = await findProjectById(id);
    if (!project) return res.status(404).json({ error: 'not found' });
    if (project.owner_id !== user.sub) return res.status(403).json({ error: 'forbidden' });

    return res.json(project);
  } catch (err) {
    console.error('get project error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

projectsRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const project = await findProjectOwnerById(id);
    if (!project) return res.status(404).json({ error: 'not found' });
    if (project.owner_id !== user.sub) return res.status(403).json({ error: 'forbidden' });

    await deleteProjectById(id);
    return res.status(204).end();
  } catch (err) {
    console.error('delete project error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});
