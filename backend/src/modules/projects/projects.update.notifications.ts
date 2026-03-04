import { ProjectLifecycle } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { workspaceNotificationService } from '../tickets/workspace.notification.service.js';
import { parseOwnerIdsFromMetadata, resolveProjectCompletionRecipients } from './projects.shared.js';

export const notifyProjectLifecycleChanges = async (input: {
  orgId: string;
  projectId: string;
  actorUserId: string;
  projectName: string;
  previousLifecycle: ProjectLifecycle;
  nextLifecycle: ProjectLifecycle;
  previousMetadata: unknown;
  nextMetadata: unknown;
  ownerId: string;
  updatedAt: Date;
}) => {
  const actor = await prisma.user.findUnique({ where: { id: input.actorUserId }, select: { displayName: true } });
  const actorName = actor?.displayName || 'User';

  const nextMetaObj =
    input.nextMetadata && typeof input.nextMetadata === 'object'
      ? (input.nextMetadata as Record<string, unknown>)
      : {};
  const previousMetaObj =
    input.previousMetadata && typeof input.previousMetadata === 'object'
      ? (input.previousMetadata as Record<string, unknown>)
      : {};

  const completionRequestedAt = Number(nextMetaObj.completionRequestedAt || 0);
  const previousCompletionRequestedAt = Number(previousMetaObj.completionRequestedAt || 0);

  const ownerIds = parseOwnerIdsFromMetadata(input.nextMetadata, input.ownerId);
  const recipients = await resolveProjectCompletionRecipients({ orgId: input.orgId, ownerIds });

  if (
    completionRequestedAt > 0 &&
    (previousCompletionRequestedAt <= 0 || completionRequestedAt !== previousCompletionRequestedAt)
  ) {
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'project_completion_actions',
      actorUserId: input.actorUserId,
      includeActorRecipient: true,
      title: `Completion requested: ${input.projectName}`,
      summary: `${actorName} requested owner/admin approval to complete this project.`,
      recipients,
      facts: [
        { title: 'Project', value: input.projectName },
        { title: 'Action', value: 'Completion approval required' }
      ],
      openPath: `/app?projectId=${encodeURIComponent(input.projectId)}`,
      dedupeEntityKey: `project-completion-request-${input.projectId}-${completionRequestedAt}`
    });
  }

  if (input.previousLifecycle !== ProjectLifecycle.completed && input.nextLifecycle === ProjectLifecycle.completed) {
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'project_completion_actions',
      actorUserId: input.actorUserId,
      includeActorRecipient: true,
      title: `Project completed: ${input.projectName}`,
      summary: `${actorName} marked this project as completed.`,
      recipients,
      facts: [
        { title: 'Project', value: input.projectName },
        { title: 'Lifecycle', value: 'Completed' }
      ],
      openPath: `/app?projectId=${encodeURIComponent(input.projectId)}`,
      dedupeEntityKey: `project-completed-${input.projectId}-${input.updatedAt.getTime()}`
    });
  }
};
