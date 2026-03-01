import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';
import { realtimeGateway } from '../realtime/realtime.gateway.js';
import { sendSlackTaskEvent } from '../integrations/slack.service.js';
import { workspaceNotificationService } from '../tickets/workspace.notification.service.js';
import {
  TaskActor,
  TaskPatch,
  enforceTaskPolicy,
  getFinalStageForProject,
  getProjectOrThrow,
  getTaskOrThrow,
  mergeTaskMetadata,
  shouldEnforceOperate,
  shouldEnforceAssign,
  shouldEnforceEdit,
  shouldEnforceStatus
} from './tasks.helpers.js';

const parseIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((row): row is string => typeof row === 'string' && row.length > 0) : [];

const resolveTaskRecipients = async (input: { orgId: string; assigneeIds: string[] }) => {
  if (input.assigneeIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { orgId: input.orgId, id: { in: input.assigneeIds }, licenseActive: true },
    select: { id: true, email: true, displayName: true }
  });
  return users
    .filter((row) => Boolean(row.email))
    .map((row) => ({ userId: row.id, email: row.email, displayName: row.displayName }));
};

const dueStateForTask = (dueDate?: Date | null): 'due-soon' | 'overdue' | null => {
  if (!dueDate) return null;
  const now = Date.now();
  const dueAt = dueDate.getTime();
  if (dueAt <= now) return 'overdue';
  if (dueAt - now <= 24 * 60 * 60 * 1000) return 'due-soon';
  return null;
};

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
    const assignees = parseIds(task.assigneeIds);
    const recipients = await resolveTaskRecipients({ orgId: input.orgId, assigneeIds: assignees });
    if (recipients.length > 0 && assignees.length > 0) {
      await workspaceNotificationService.notify({
        orgId: input.orgId,
        eventType: 'task_assignment',
        actorUserId: input.actor.userId,
        includeActorRecipient: true,
        title: `Task assigned: ${task.title}`,
        summary: `${actorName} assigned you to a task in ${project.name}.`,
        recipients,
        facts: [
          { title: 'Project', value: project.name },
          { title: 'Status', value: task.status }
        ],
        openPath: `/app?projectId=${encodeURIComponent(project.id)}`,
        dedupeEntityKey: `task-assigned-${task.id}-${task.updatedAt.getTime()}`
      });
    }
    const dueState = dueStateForTask(task.dueDate);
    if (recipients.length > 0 && dueState) {
      await workspaceNotificationService.notify({
        orgId: input.orgId,
        eventType: 'task_due_overdue',
        actorUserId: input.actor.userId,
        includeActorRecipient: true,
        title: dueState === 'overdue' ? `Task overdue: ${task.title}` : `Task due soon: ${task.title}`,
        summary:
          dueState === 'overdue'
            ? `${task.title} is overdue in ${project.name}.`
            : `${task.title} is due within the next 24 hours in ${project.name}.`,
        recipients,
        facts: [
          { title: 'Project', value: project.name },
          { title: 'Due date', value: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : 'Not set' }
        ],
        openPath: `/app?projectId=${encodeURIComponent(project.id)}`,
        dedupeEntityKey: `task-due-${dueState}-${task.id}-${task.dueDate?.getTime() || 0}`
      });
    }

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
    const previousAssignees = parseIds(task.assigneeIds);
    const nextAssignees = parseIds(updated.assigneeIds);
    const addedAssignees = nextAssignees.filter((userId) => !previousAssignees.includes(userId));
    if (addedAssignees.length > 0) {
      const recipients = await resolveTaskRecipients({ orgId: input.orgId, assigneeIds: addedAssignees });
      await workspaceNotificationService.notify({
        orgId: input.orgId,
        eventType: 'task_assignment',
        actorUserId: input.actor.userId,
        includeActorRecipient: true,
        title: `Task assigned: ${updated.title}`,
        summary: `${actorName} assigned you to a task in ${project.name}.`,
        recipients,
        facts: [
          { title: 'Project', value: project.name },
          { title: 'Status', value: updated.status }
        ],
        openPath: `/app?projectId=${encodeURIComponent(project.id)}`,
        dedupeEntityKey: `task-assigned-${updated.id}-${updated.updatedAt.getTime()}`
      });
    }

    if (updated.status !== task.status && nextAssignees.length > 0) {
      const recipients = await resolveTaskRecipients({ orgId: input.orgId, assigneeIds: nextAssignees });
      await workspaceNotificationService.notify({
        orgId: input.orgId,
        eventType: 'task_status_changes',
        actorUserId: input.actor.userId,
        includeActorRecipient: true,
        title: `Task status changed: ${updated.title}`,
        summary: `${actorName} moved this task from ${task.status} to ${updated.status}.`,
        recipients,
        facts: [
          { title: 'Project', value: project.name },
          { title: 'From', value: task.status },
          { title: 'To', value: updated.status }
        ],
        openPath: `/app?projectId=${encodeURIComponent(project.id)}`,
        dedupeEntityKey: `task-status-${updated.id}-${updated.updatedAt.getTime()}`
      });
    }

    const dueState = dueStateForTask(updated.dueDate);
    const dueDateChanged =
      (task.dueDate?.getTime() || 0) !== (updated.dueDate?.getTime() || 0) ||
      parseIds(updated.assigneeIds).join(',') !== parseIds(task.assigneeIds).join(',');
    if (dueDateChanged && dueState && nextAssignees.length > 0) {
      const recipients = await resolveTaskRecipients({ orgId: input.orgId, assigneeIds: nextAssignees });
      await workspaceNotificationService.notify({
        orgId: input.orgId,
        eventType: 'task_due_overdue',
        actorUserId: input.actor.userId,
        includeActorRecipient: true,
        title: dueState === 'overdue' ? `Task overdue: ${updated.title}` : `Task due soon: ${updated.title}`,
        summary:
          dueState === 'overdue'
            ? `${updated.title} is overdue in ${project.name}.`
            : `${updated.title} is due within the next 24 hours in ${project.name}.`,
        recipients,
        facts: [
          { title: 'Project', value: project.name },
          { title: 'Due date', value: updated.dueDate ? updated.dueDate.toISOString().slice(0, 10) : 'Not set' }
        ],
        openPath: `/app?projectId=${encodeURIComponent(project.id)}`,
        dedupeEntityKey: `task-due-${dueState}-${updated.id}-${updated.dueDate?.getTime() || 0}`
      });
    }

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
    const actor = await prisma.user.findUnique({ where: { id: input.actor.userId }, select: { displayName: true } });
    void sendSlackTaskEvent({
      event: 'deleted',
      project,
      task,
      actorDisplay: actor?.displayName || 'User'
    });
  }
};
