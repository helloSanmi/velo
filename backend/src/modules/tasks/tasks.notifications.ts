import { prisma } from '../../lib/prisma.js';
import { workspaceNotificationService } from '../tickets/workspace.notification.service.js';

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

export const notifyTaskCreated = async (input: {
  orgId: string;
  actorUserId: string;
  actorName: string;
  project: { id: string; name: string };
  task: { id: string; title: string; status: string; dueDate?: Date | null; assigneeIds: unknown; updatedAt: Date };
}) => {
  const assignees = parseIds(input.task.assigneeIds);
  const recipients = await resolveTaskRecipients({ orgId: input.orgId, assigneeIds: assignees });
  if (recipients.length > 0 && assignees.length > 0) {
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'task_assignment',
      actorUserId: input.actorUserId,
      includeActorRecipient: true,
      title: `Task assigned: ${input.task.title}`,
      summary: `${input.actorName} assigned you to a task in ${input.project.name}.`,
      recipients,
      facts: [
        { title: 'Project', value: input.project.name },
        { title: 'Status', value: input.task.status }
      ],
      openPath: `/app?projectId=${encodeURIComponent(input.project.id)}`,
      dedupeEntityKey: `task-assigned-${input.task.id}-${input.task.updatedAt.getTime()}`
    });
  }
  const dueState = dueStateForTask(input.task.dueDate);
  if (recipients.length > 0 && dueState) {
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'task_due_overdue',
      actorUserId: input.actorUserId,
      includeActorRecipient: true,
      title: dueState === 'overdue' ? `Task overdue: ${input.task.title}` : `Task due soon: ${input.task.title}`,
      summary:
        dueState === 'overdue'
          ? `${input.task.title} is overdue in ${input.project.name}.`
          : `${input.task.title} is due within the next 24 hours in ${input.project.name}.`,
      recipients,
      facts: [
        { title: 'Project', value: input.project.name },
        { title: 'Due date', value: input.task.dueDate ? input.task.dueDate.toISOString().slice(0, 10) : 'Not set' }
      ],
      openPath: `/app?projectId=${encodeURIComponent(input.project.id)}`,
      dedupeEntityKey: `task-due-${dueState}-${input.task.id}-${input.task.dueDate?.getTime() || 0}`
    });
  }
};

export const notifyTaskUpdated = async (input: {
  orgId: string;
  actorUserId: string;
  actorName: string;
  project: { id: string; name: string };
  before: { id: string; title: string; status: string; dueDate?: Date | null; assigneeIds: unknown };
  after: { id: string; title: string; status: string; dueDate?: Date | null; assigneeIds: unknown; updatedAt: Date };
}) => {
  const previousAssignees = parseIds(input.before.assigneeIds);
  const nextAssignees = parseIds(input.after.assigneeIds);
  const addedAssignees = nextAssignees.filter((userId) => !previousAssignees.includes(userId));
  if (addedAssignees.length > 0) {
    const recipients = await resolveTaskRecipients({ orgId: input.orgId, assigneeIds: addedAssignees });
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'task_assignment',
      actorUserId: input.actorUserId,
      includeActorRecipient: true,
      title: `Task assigned: ${input.after.title}`,
      summary: `${input.actorName} assigned you to a task in ${input.project.name}.`,
      recipients,
      facts: [
        { title: 'Project', value: input.project.name },
        { title: 'Status', value: input.after.status }
      ],
      openPath: `/app?projectId=${encodeURIComponent(input.project.id)}`,
      dedupeEntityKey: `task-assigned-${input.after.id}-${input.after.updatedAt.getTime()}`
    });
  }

  if (input.after.status !== input.before.status && nextAssignees.length > 0) {
    const recipients = await resolveTaskRecipients({ orgId: input.orgId, assigneeIds: nextAssignees });
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'task_status_changes',
      actorUserId: input.actorUserId,
      includeActorRecipient: true,
      title: `Task status changed: ${input.after.title}`,
      summary: `${input.actorName} moved this task from ${input.before.status} to ${input.after.status}.`,
      recipients,
      facts: [
        { title: 'Project', value: input.project.name },
        { title: 'From', value: input.before.status },
        { title: 'To', value: input.after.status }
      ],
      openPath: `/app?projectId=${encodeURIComponent(input.project.id)}`,
      dedupeEntityKey: `task-status-${input.after.id}-${input.after.updatedAt.getTime()}`
    });
  }

  const dueState = dueStateForTask(input.after.dueDate);
  const dueDateChanged =
    (input.before.dueDate?.getTime() || 0) !== (input.after.dueDate?.getTime() || 0) ||
    nextAssignees.join(',') !== previousAssignees.join(',');
  if (dueDateChanged && dueState && nextAssignees.length > 0) {
    const recipients = await resolveTaskRecipients({ orgId: input.orgId, assigneeIds: nextAssignees });
    await workspaceNotificationService.notify({
      orgId: input.orgId,
      eventType: 'task_due_overdue',
      actorUserId: input.actorUserId,
      includeActorRecipient: true,
      title: dueState === 'overdue' ? `Task overdue: ${input.after.title}` : `Task due soon: ${input.after.title}`,
      summary:
        dueState === 'overdue'
          ? `${input.after.title} is overdue in ${input.project.name}.`
          : `${input.after.title} is due within the next 24 hours in ${input.project.name}.`,
      recipients,
      facts: [
        { title: 'Project', value: input.project.name },
        { title: 'Due date', value: input.after.dueDate ? input.after.dueDate.toISOString().slice(0, 10) : 'Not set' }
      ],
      openPath: `/app?projectId=${encodeURIComponent(input.project.id)}`,
      dedupeEntityKey: `task-due-${dueState}-${input.after.id}-${input.after.dueDate?.getTime() || 0}`
    });
  }
};

