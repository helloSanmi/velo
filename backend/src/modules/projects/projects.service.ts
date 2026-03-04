import { prisma } from '../../lib/prisma.js';
import { createProject } from './projects.create.js';
import { removeProject } from './projects.remove.js';
import { ProjectCreateInput, ProjectRemoveInput, ProjectUpdateInput } from './projects.types.js';
import { updateProject } from './projects.update.js';

export const projectsService = {
  async list(orgId: string) {
    return prisma.project.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' }
    });
  },

  async create(input: ProjectCreateInput) {
    return createProject(input);
  },

  async update(input: ProjectUpdateInput) {
    return updateProject(input);
  },

  async remove(input: ProjectRemoveInput) {
    return removeProject(input);
  }
};
