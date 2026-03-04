import { ProjectLifecycle } from '@prisma/client';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { enforce } from '../policy/policy.service.js';
import { parseMemberIds, parseOwnerIdsFromMetadata, parseStageDefs } from './projects.shared.js';
import type { ProjectUpdateInput } from './projects.types.js';

const completionRequestMetadataKeys = new Set([
  'completionRequestedAt',
  'completionRequestedById',
  'completionRequestedByName',
  'completionRequestedComment'
]);

export const isMemberCompletionRequestOnlyPatch = (input: {
  isProjectMember: boolean;
  actorUserId: string;
  metadata: unknown;
}) => {
  const metadataPatch =
    input.metadata && typeof input.metadata === 'object'
      ? (input.metadata as Record<string, unknown>)
      : undefined;
  const metadataPatchKeys = metadataPatch
    ? Object.keys(metadataPatch).filter((key) => metadataPatch[key] !== undefined)
    : [];

  const isCompletionRequestOnlyMetadataPatch =
    metadataPatchKeys.length > 0 && metadataPatchKeys.every((key) => completionRequestMetadataKeys.has(key));

  return (
    Boolean(input.isProjectMember) &&
    isCompletionRequestOnlyMetadataPatch &&
    typeof metadataPatch?.completionRequestedAt === 'number' &&
    typeof metadataPatch?.completionRequestedById === 'string' &&
    metadataPatch.completionRequestedById === input.actorUserId
  );
};

export const enforceProjectPatchPermissions = (input: {
  actor: ProjectUpdateInput['actor'];
  existing: { ownerId: string; memberIds: unknown; metadata: unknown };
  patch: ProjectUpdateInput['patch'];
}) => {
  const isProjectMember = parseMemberIds(input.existing.memberIds).includes(input.actor.userId);
  const existingOwnerIds = parseOwnerIdsFromMetadata(input.existing.metadata, input.existing.ownerId);

  if (typeof input.patch.ownerId === 'string' && input.patch.ownerId !== input.existing.ownerId) {
    enforce('project:owner-change', {
      role: input.actor.role,
      userId: input.actor.userId,
      projectOwnerId: input.existing.ownerId,
      projectOwnerIds: existingOwnerIds,
      isProjectMember
    });
  }

  if (typeof input.patch.lifecycle === 'string') {
    enforce('project:archive', {
      role: input.actor.role,
      userId: input.actor.userId,
      projectOwnerId: input.existing.ownerId,
      projectOwnerIds: existingOwnerIds,
      isProjectMember
    });
  }

  if (
    typeof input.patch.name === 'string' ||
    typeof input.patch.description === 'string' ||
    typeof input.patch.color === 'string' ||
    Array.isArray(input.patch.stageDefs) ||
    typeof input.patch.isPublic === 'boolean' ||
    typeof input.patch.publicToken === 'string' ||
    typeof input.patch.metadata === 'object'
  ) {
    if (
      !isMemberCompletionRequestOnlyPatch({
        isProjectMember,
        actorUserId: input.actor.userId,
        metadata: input.patch.metadata
      })
    ) {
      enforce('project:rename', {
        role: input.actor.role,
        userId: input.actor.userId,
        projectOwnerId: input.existing.ownerId,
        projectOwnerIds: existingOwnerIds,
        isProjectMember
      });
    }
  }
};

export const assertLifecycleCompletionPreconditions = async (input: {
  orgId: string;
  projectId: string;
  patchLifecycle?: ProjectLifecycle;
  patchStageDefs?: unknown[];
  existingStageDefs: unknown;
}) => {
  const requestedStageDefs = Array.isArray(input.patchStageDefs) ? parseStageDefs(input.patchStageDefs) : [];
  const effectiveStageDefs = requestedStageDefs.length > 0 ? requestedStageDefs : parseStageDefs(input.existingStageDefs);

  if (input.patchLifecycle === ProjectLifecycle.completed) {
    const finalStage = effectiveStageDefs[effectiveStageDefs.length - 1];
    const finalStageId = finalStage?.id || 'done';
    const tasks = await prisma.task.findMany({
      where: { orgId: input.orgId, projectId: input.projectId },
      select: { status: true, isTimerRunning: true }
    });
    const hasTasksOutsideFinalStage = tasks.some((task) => task.status !== finalStageId);
    if (hasTasksOutsideFinalStage) {
      throw new HttpError(400, `Cannot complete project until all tasks are in "${finalStage?.name || 'Done'}".`);
    }
    if (tasks.some((task) => task.isTimerRunning)) {
      throw new HttpError(400, 'Cannot complete project while task timers are still running.');
    }
  }

  return effectiveStageDefs;
};
