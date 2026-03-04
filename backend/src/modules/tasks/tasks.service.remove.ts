import { prisma } from '../../lib/prisma.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { sendSlackTaskEvent } from '../integrations/slack.service.js';
import { enforceTaskPolicy, getProjectOrThrow, getTaskOrThrow } from './tasks.helpers.js';
import type { RemoveTaskInput } from './tasks.service.types.js';

export const removeTask = async (input: RemoveTaskInput) => {
  const project = await getProjectOrThrow(input.orgId, input.projectId);
  enforceTaskPolicy('task:delete', { actor: input.actor, project });
  const task = await getTaskOrThrow(input.orgId, input.projectId, input.taskId);

  await prisma.task.delete({ where: { id: task.id } });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'task_deleted',
    action: `Deleted task ${task.title}`,
    entityType: 'task',
    entityId: task.id
  });

  realtimeGateway.publish(input.orgId, 'TASKS_UPDATED', { taskId: task.id, action: 'deleted', projectId: input.projectId });
  const actor = await prisma.user.findUnique({ where: { id: input.actor.userId }, select: { displayName: true } });
  void sendSlackTaskEvent({
    event: 'deleted',
    project,
    task,
    actorDisplay: actor?.displayName || 'User'
  });
};
