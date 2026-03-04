import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { sendSlackTaskEvent } from '../integrations/slack.service.js';
import { notifyTaskCreated } from './tasks.notifications.js';
import { enforceTaskPolicy, getFinalStageForProject, getProjectOrThrow } from './tasks.helpers.js';
import type { CreateTaskInput } from './tasks.service.types.js';

export const createTask = async (input: CreateTaskInput) => {
  const project = await getProjectOrThrow(input.orgId, input.projectId);
  enforceTaskPolicy('task:edit', { actor: input.actor, project });
  const finalStage = getFinalStageForProject(project);
  if (input.status === finalStage.id && !input.dueDate) {
    throw new HttpError(400, `Due date is required before moving task to "${finalStage.name}".`);
  }

  const task = await prisma.task.create({
    data: {
      id: createId('task'),
      orgId: input.orgId,
      projectId: input.projectId,
      createdBy: input.actor.userId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assigneeIds: input.assigneeIds || [],
      tags: input.tags || [],
      subtasks: [],
      comments: [],
      auditLog: [],
      dueDate: input.dueDate
    }
  });

  const actor = await prisma.user.findUnique({ where: { id: input.actor.userId }, select: { displayName: true } });
  const actorName = actor?.displayName || 'User';
  await notifyTaskCreated({
    orgId: input.orgId,
    actorUserId: input.actor.userId,
    actorName,
    project: { id: project.id, name: project.name },
    task
  });

  await writeAudit({
    orgId: input.orgId,
    userId: input.actor.userId,
    actionType: 'task_created',
    action: `Created task ${task.title}`,
    entityType: 'task',
    entityId: task.id
  });

  realtimeGateway.publish(input.orgId, 'TASKS_UPDATED', { taskId: task.id, action: 'created', projectId: input.projectId });
  void sendSlackTaskEvent({
    event: 'created',
    project,
    task,
    actorDisplay: actorName
  });
  return task;
};
