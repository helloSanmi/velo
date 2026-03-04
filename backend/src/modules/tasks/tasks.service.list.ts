import { prisma } from '../../lib/prisma.js';
import type { ListTasksInput } from './tasks.service.types.js';

export const listTasks = async (input: ListTasksInput) =>
  prisma.task.findMany({
    where: { orgId: input.orgId, projectId: input.projectId },
    orderBy: [{ status: 'asc' }, { orderIndex: 'asc' }, { updatedAt: 'desc' }]
  });
