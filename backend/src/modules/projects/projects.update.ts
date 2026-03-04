import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { notifyProjectLifecycleChanges } from './projects.update.notifications.js';
import { parseOwnerIdsFromMetadata } from './projects.shared.js';
import { ProjectUpdateInput } from './projects.types.js';
import {
  assertLifecycleCompletionPreconditions,
  enforceProjectPatchPermissions
} from './projects.update.guards.js';

export const updateProject = async (input: ProjectUpdateInput) => {
  const existing = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!existing || existing.orgId !== input.orgId) throw new HttpError(404, 'Project not found.');

  enforceProjectPatchPermissions({
    actor: input.actor,
    existing: { ownerId: existing.ownerId, memberIds: existing.memberIds, metadata: existing.metadata },
    patch: input.patch
  });

  const effectiveStageDefs = await assertLifecycleCompletionPreconditions({
    orgId: input.orgId,
    projectId: existing.id,
    patchLifecycle: input.patch.lifecycle,
    patchStageDefs: input.patch.stageDefs,
    existingStageDefs: existing.stageDefs
  });

  const existingMetadata =
    existing.metadata && typeof existing.metadata === 'object'
      ? (existing.metadata as Record<string, unknown>)
      : {};
  const requestedOwnerId = typeof input.patch.ownerId === 'string' ? input.patch.ownerId : existing.ownerId;
  const requestedOwnerIds = Array.isArray(input.patch.metadata?.ownerIds)
    ? input.patch.metadata.ownerIds
    : parseOwnerIdsFromMetadata(existing.metadata, existing.ownerId);
  const normalizedOwnerIds = Array.from(new Set([requestedOwnerId, ...requestedOwnerIds].filter(Boolean)));

  const nextMetadata =
    input.patch.metadata || typeof input.patch.ownerId === 'string'
      ? { ...existingMetadata, ...(input.patch.metadata || {}), ownerIds: normalizedOwnerIds }
      : undefined;

  const nextMemberIds = input.patch.memberIds
    ? Array.from(new Set([requestedOwnerId, ...input.patch.memberIds]))
    : undefined;

  const next = await prisma.project.update({
    where: { id: existing.id },
    data: {
      name: input.patch.name,
      description: input.patch.description,
      color: input.patch.color,
      stageDefs: Array.isArray(input.patch.stageDefs) ? effectiveStageDefs : undefined,
      isPublic: input.patch.isPublic,
      publicToken: input.patch.publicToken,
      lifecycle: input.patch.lifecycle,
      ownerId: input.patch.ownerId,
      memberIds: nextMemberIds,
      metadata: nextMetadata
    }
  });

  await notifyProjectLifecycleChanges({
    orgId: input.orgId,
    projectId: next.id,
    actorUserId: input.actor.userId,
    projectName: next.name,
    previousLifecycle: existing.lifecycle,
    nextLifecycle: next.lifecycle,
    previousMetadata: existing.metadata,
    nextMetadata: next.metadata,
    ownerId: next.ownerId,
    updatedAt: next.updatedAt
  });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'project_updated',
    action: `Updated project ${next.name}`,
    entityType: 'project',
    entityId: next.id,
    metadata: input.patch
  });

  realtimeGateway.publish(input.orgId, 'PROJECTS_UPDATED', { projectId: next.id, action: 'updated' });
  return next;
};
