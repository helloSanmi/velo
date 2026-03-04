import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { ProjectCreateInput } from './projects.types.js';

export const createProject = async (input: ProjectCreateInput) => {
  const project = await prisma.project.create({
    data: {
      id: input.id || createId('proj'),
      orgId: input.orgId,
      createdBy: input.actor.userId,
      ownerId: input.actor.userId,
      name: input.name,
      description: input.description,
      color: input.color,
      stageDefs: Array.isArray(input.stageDefs) && input.stageDefs.length > 0 ? input.stageDefs : undefined,
      isPublic: Boolean(input.isPublic),
      publicToken: input.publicToken,
      memberIds: Array.from(new Set([input.actor.userId, ...input.memberIds])),
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined
    }
  });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'project_created',
    action: `Created project ${project.name}`,
    entityType: 'project',
    entityId: project.id
  });

  realtimeGateway.publish(input.orgId, 'PROJECTS_UPDATED', { projectId: project.id, action: 'created' });
  return project;
};
