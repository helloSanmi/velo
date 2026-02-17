import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import {
  TaskActor,
  TaskPatch,
  enforceTaskPolicy,
  getProjectOrThrow,
  getTaskOrThrow,
  mergeTaskMetadata,
  shouldEnforceOperate,
  shouldEnforceAssign,
  shouldEnforceEdit,
  shouldEnforceStatus
} from './tasks.helpers.js';

export const tasksService = {
  async list(input: { orgId: string; projectId?: string }) {
    return prisma.task.findMany({
      where: { orgId: input.orgId, projectId: input.projectId },
      orderBy: [{ status: 'asc' }, { orderIndex: 'asc' }, { updatedAt: 'desc' }]
    });
  },

  async create(input: {
    orgId: string;
    actor: TaskActor;
    projectId: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate?: Date;
    assigneeIds?: string[];
    tags?: string[];
  }) {
    const project = await getProjectOrThrow(input.orgId, input.projectId);
    enforceTaskPolicy('task:edit', { actor: input.actor, project });

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

    await writeAudit({
      orgId: input.orgId,
      userId: input.actor.userId,
      actionType: 'task_created',
      action: `Created task ${task.title}`,
      entityType: 'task',
      entityId: task.id
    });

    realtimeGateway.publish(input.orgId, 'TASKS_UPDATED', { taskId: task.id, action: 'created', projectId: input.projectId });
    return task;
  },

  async update(input: {
    orgId: string;
    projectId: string;
    taskId: string;
    actor: TaskActor;
    patch: TaskPatch;
  }) {
    const project = await getProjectOrThrow(input.orgId, input.projectId);
    const task = await getTaskOrThrow(input.orgId, input.projectId, input.taskId);

    if (shouldEnforceAssign(input.patch)) enforceTaskPolicy('task:assign', { actor: input.actor, project, task });
    if (shouldEnforceStatus(input.patch) || shouldEnforceOperate(input.patch))
      enforceTaskPolicy('task:status', { actor: input.actor, project, task });
    if (shouldEnforceEdit(input.patch)) enforceTaskPolicy('task:edit', { actor: input.actor, project, task });

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
    return updated;
  },

  async remove(input: { orgId: string; projectId: string; taskId: string; actor: TaskActor }) {
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
  }
};
