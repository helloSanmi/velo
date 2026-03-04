import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { prisma } from '../../lib/prisma.js';
import { enforce } from '../policy/policy.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { parseMemberIds, parseOwnerIdsFromMetadata } from './projects.shared.js';
import { ProjectRemoveInput } from './projects.types.js';

export const removeProject = async (input: ProjectRemoveInput) => {
  const existing = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!existing || existing.orgId !== input.orgId) throw new HttpError(404, 'Project not found.');

  const isProjectMember = parseMemberIds(existing.memberIds).includes(input.actor.userId);
  const existingOwnerIds = parseOwnerIdsFromMetadata(existing.metadata, existing.ownerId);
  enforce('project:delete', {
    role: input.actor.role,
    userId: input.actor.userId,
    projectOwnerId: existing.ownerId,
    projectOwnerIds: existingOwnerIds,
    isProjectMember
  });

  const relatedTasks = await prisma.task.findMany({
    where: { orgId: input.orgId, projectId: existing.id },
    select: { id: true }
  });
  const relatedTaskIds = relatedTasks.map((task) => task.id);

  const retentionDays = Math.max(1, env.RETENTION_PROJECT_DELETE_AUDIT_DAYS);
  const purgedAt = new Date();
  const retentionExpiresAt = new Date(purgedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({
      where: {
        orgId: input.orgId,
        OR: [
          { entityType: 'project', entityId: existing.id },
          ...(relatedTaskIds.length > 0 ? [{ entityType: 'task', entityId: { in: relatedTaskIds } }] : [])
        ]
      }
    });

    await tx.securityGroup.deleteMany({ where: { orgId: input.orgId, projectId: existing.id } });
    await tx.project.delete({ where: { id: existing.id } });

    await tx.auditLog.create({
      data: {
        id: createId('audit'),
        orgId: input.orgId,
        userId: input.actor.userId,
        actionType: 'project_deleted',
        action: `Purged project ${existing.name}`,
        entityType: 'project',
        entityId: existing.id,
        metadata: {
          projectName: existing.name,
          purgedAt: purgedAt.toISOString(),
          purgedById: input.actor.userId,
          relatedTaskCount: relatedTaskIds.length,
          retentionDays,
          retentionExpiresAt: retentionExpiresAt.toISOString()
        }
      }
    });
  });

  realtimeGateway.publish(input.orgId, 'PROJECTS_UPDATED', { projectId: existing.id, action: 'purged' });
};
