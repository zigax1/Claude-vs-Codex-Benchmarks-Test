import { countProjectsByOwner, createProject as insertProject } from '../db/projects';
import { Project } from '../types/models';

export async function hasReachedProjectLimit(ownerId: number): Promise<boolean> {
  return (await countProjectsByOwner(ownerId)) >= 50;
}

export async function createProject(ownerId: number, name: string, description?: string): Promise<Project> {
  return insertProject(ownerId, name, description || null);
}
