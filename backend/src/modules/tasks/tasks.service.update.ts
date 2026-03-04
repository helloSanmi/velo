import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { sendSlackTaskEvent } from '../integrations/slack.service.js';
import { notifyTaskUpdated } from './tasks.notifications.js';
import {
  enforceTaskPolicy,
  getFinalStageForProject,
  getProjectOrThrow,
  getTaskOrThrow,
  mergeTaskMetadata,
  shouldEnforceAssign,
  shouldEnforceEdit,
  shouldEnforceOperate,
  shouldEnforceStatus
} from './tasks.helpers.js';
import type { UpdateTaskInput } from './tasks.service.types.js';

export const updateTask = async (input: UpdateTaskInput) => {
  const project = await getProjectOrThrow(input.orgId, input.projectId);
  const task = await getTaskOrThrow(input.orgId, input.projectId, input.taskId);

  if (shouldEnforceAssign(input.patch)) enforceTaskPolicy('task:assign', { actor: input.actor, project, task });
  if (shouldEnforceStatus(input.patch) || shouldEnforceOperate(input.patch))
    enforceTaskPolicy('task:status', { actor: input.actor, project, task });
  if (shouldEnforceEdit(input.patch)) enforceTaskPolicy('task:edit', { actor: input.actor, project, task });
  const finalStage = getFinalStageForProject(project);
  const nextStatus = typeof input.patch.status === 'string' ? input.patch.status : task.status;
  const nextDueDate = input.patch.dueDate !== undefined ? input.patch.dueDate : task.dueDate;
  const enteringFinalStage = task.status !== finalStage.id && nextStatus === finalStage.id;
  if (enteringFinalStage && !nextDueDate) {
    throw new HttpError(400, `Due date is required before moving task to "${finalStage.name}".`);
  }

  const nextMetadata = mergeTaskMetadata(task, input.patch.metadata);

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      title: input.patch.title,
      description: input.patch.description,
      status: input.patch.status,
      priority: input.patch.priority,
      assigneeIds: input.patch.assigneeIds,
      securityGroupIds: input.patch.securityGroupIds,
      blockedByIds: input.patch.blockedByIds,
      tags: input.patch.tags,
      subtasks: input.patch.subtasks as object[] | undefined,
      comments: input.patch.comments as object[] | undefined,
      auditLog: input.patch.auditLog as object[] | undefined,
      dueDate: input.patch.dueDate,
      timeLoggedMs: input.patch.timeLoggedMs,
      isTimerRunning: input.patch.isTimerRunning,
      timerStartedAt: input.patch.timerStartedAt,
      metadata: nextMetadata
    }
  });

  const actor = await prisma.user.findUnique({ where: { id: input.actor.userId }, select: { displayName: true } });
  const actorName = actor?.displayName || 'User';
  await notifyTaskUpdated({
    orgId: input.orgId,
    actorUserId: input.actor.userId,
    actorName,
    project: { id: project.id, name: project.name },
    before: task,
    after: updated
  });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'task_updated',
    action: `Updated task ${updated.title}`,
    entityType: 'task',
    entityId: updated.id,
    metadata: input.patch
  });

  realtimeGateway.publish(input.orgId, 'TASKS_UPDATED', { taskId: updated.id, action: 'updated', projectId: input.projectId });
  void sendSlackTaskEvent({
    event: 'updated',
    project,
    task: updated,
    actorDisplay: actorName
  });
  return updated;
};
