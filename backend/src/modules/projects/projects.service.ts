import { ProjectLifecycle, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { createId } from '../../lib/ids.js';
import { enforce } from '../policy/policy.service.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';

const parseMemberIds = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
const parseStageDefs = (value: unknown): { id: string; name: string }[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id.trim() : '',
          name: typeof item.name === 'string' ? item.name.trim() : ''
        }))
        .filter((stage) => stage.id.length > 0 && stage.name.length > 0)
    : [];
const parseOwnerIdsFromMetadata = (metadata: unknown, fallbackOwnerId?: string): string[] => {
  const ownerIds =
    metadata && typeof metadata === 'object' && Array.isArray((metadata as Record<string, unknown>).ownerIds)
      ? ((metadata as Record<string, unknown>).ownerIds as unknown[]).filter((value): value is string => typeof value === 'string')
      : [];
  return Array.from(new Set([...(fallbackOwnerId ? [fallbackOwnerId] : []), ...ownerIds]));
};

export const projectsService = {
  async list(orgId: string) {
    return prisma.project.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' }
    });
  },

  async create(input: {
    orgId: string;
    actor: { userId: string; role: UserRole };
    id?: string;
    name: string;
    description: string;
    color: string;
    stageDefs?: { id: string; name: string }[];
    isPublic?: boolean;
    publicToken?: string;
    memberIds: string[];
    metadata?: {
      startDate?: number;
      endDate?: number;
      budgetCost?: number;
      hourlyRate?: number;
      scopeSummary?: string;
      scopeSize?: number;
      completionComment?: string;
      completionRequestedAt?: number;
      completionRequestedById?: string;
      completionRequestedByName?: string;
      completionRequestedComment?: string;
      ownerIds?: string[];
      reopenedAt?: number;
      reopenedById?: string;
      archivedAt?: number;
      archivedById?: string;
      completedAt?: number;
      completedById?: string;
      deletedAt?: number;
      deletedById?: string;
      integrations?: {
        slack?: { enabled?: boolean; channel?: string };
        github?: { enabled?: boolean; repo?: string };
      };
    };
  }) {
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
        metadata: input.metadata
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
  },

  async update(input: {
    orgId: string;
    projectId: string;
    actor: { userId: string; role: UserRole };
    patch: Partial<{
      name: string;
      description: string;
      color: string;
      stageDefs: { id: string; name: string }[];
      isPublic: boolean;
      publicToken: string;
      lifecycle: ProjectLifecycle;
      ownerId: string;
      memberIds: string[];
      metadata: {
        startDate?: number;
        endDate?: number;
        budgetCost?: number;
        hourlyRate?: number;
        scopeSummary?: string;
        scopeSize?: number;
        completionComment?: string;
        completionRequestedAt?: number;
        completionRequestedById?: string;
        completionRequestedByName?: string;
        completionRequestedComment?: string;
        ownerIds?: string[];
        reopenedAt?: number;
        reopenedById?: string;
        archivedAt?: number;
        archivedById?: string;
        completedAt?: number;
        completedById?: string;
        deletedAt?: number;
        deletedById?: string;
        integrations?: {
          slack?: { enabled?: boolean; channel?: string };
          github?: { enabled?: boolean; repo?: string };
        };
      };
    }>;
  }) {
    const existing = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!existing || existing.orgId !== input.orgId) throw new HttpError(404, 'Project not found.');

    const isProjectMember = parseMemberIds(existing.memberIds).includes(input.actor.userId);

    const existingOwnerIds = parseOwnerIdsFromMetadata(existing.metadata, existing.ownerId);

    if (typeof input.patch.ownerId === 'string' && input.patch.ownerId !== existing.ownerId) {
      enforce('project:owner-change', {
        role: input.actor.role,
        userId: input.actor.userId,
        projectOwnerId: existing.ownerId,
        projectOwnerIds: existingOwnerIds,
        isProjectMember
      });
    }

    if (typeof input.patch.lifecycle === 'string') {
      enforce('project:archive', {
        role: input.actor.role,
        userId: input.actor.userId,
        projectOwnerId: existing.ownerId,
        projectOwnerIds: existingOwnerIds,
        isProjectMember
      });
    }

    const completionRequestMetadataKeys = new Set([
      'completionRequestedAt',
      'completionRequestedById',
      'completionRequestedByName',
      'completionRequestedComment'
    ]);
    const metadataPatch =
      input.patch.metadata && typeof input.patch.metadata === 'object'
        ? (input.patch.metadata as Record<string, unknown>)
        : undefined;
    const metadataPatchKeys = metadataPatch ? Object.keys(metadataPatch).filter((key) => metadataPatch[key] !== undefined) : [];
    const isCompletionRequestOnlyMetadataPatch =
      metadataPatchKeys.length > 0 && metadataPatchKeys.every((key) => completionRequestMetadataKeys.has(key));
    const isMemberCompletionRequestPatch =
      Boolean(isProjectMember) &&
      isCompletionRequestOnlyMetadataPatch &&
      typeof metadataPatch?.completionRequestedAt === 'number' &&
      typeof metadataPatch?.completionRequestedById === 'string' &&
      metadataPatch.completionRequestedById === input.actor.userId;

    if (
      typeof input.patch.name === 'string' ||
      typeof input.patch.description === 'string' ||
      typeof input.patch.color === 'string' ||
      Array.isArray(input.patch.stageDefs) ||
      typeof input.patch.isPublic === 'boolean' ||
      typeof input.patch.publicToken === 'string' ||
      typeof input.patch.metadata === 'object'
    ) {
      if (!isMemberCompletionRequestPatch) {
        enforce('project:rename', {
          role: input.actor.role,
          userId: input.actor.userId,
          projectOwnerId: existing.ownerId,
          projectOwnerIds: existingOwnerIds,
          isProjectMember
        });
      }
    }

    const requestedStageDefs = Array.isArray(input.patch.stageDefs) ? parseStageDefs(input.patch.stageDefs) : [];
    const effectiveStageDefs = requestedStageDefs.length > 0 ? requestedStageDefs : parseStageDefs(existing.stageDefs);

    if (input.patch.lifecycle === ProjectLifecycle.completed) {
      const stages = effectiveStageDefs;
      const finalStageId = stages.length > 0 ? stages[stages.length - 1].id : 'done';
      const tasks = await prisma.task.findMany({
        where: { orgId: input.orgId, projectId: existing.id },
        select: { status: true, isTimerRunning: true }
      });
      const hasTasksOutsideFinalStage = tasks.some((task) => task.status !== finalStageId);
      if (hasTasksOutsideFinalStage) {
        throw new HttpError(400, `Cannot complete project until all tasks are in "${stages.length > 0 ? stages[stages.length - 1].name : 'Done'}".`);
      }
      const hasRunningTimer = tasks.some((task) => task.isTimerRunning);
      if (hasRunningTimer) {
        throw new HttpError(400, 'Cannot complete project while task timers are still running.');
      }
    }

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
        ? {
            ...existingMetadata,
            ...(input.patch.metadata || {}),
            ownerIds: normalizedOwnerIds
          }
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
  },

  async remove(input: {
    orgId: string;
    projectId: string;
    actor: { userId: string; role: UserRole };
  }) {
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

      await tx.securityGroup.deleteMany({
        where: { orgId: input.orgId, projectId: existing.id }
      });

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
  }
};
