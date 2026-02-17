import { Task, TaskPriority } from '../../types';
import { projectService } from '../projectService';
import { userService } from '../userService';
import { getTaskAssigneeIds } from './storage';
import { createId } from '../../utils/id';

export const stageLabel = (status?: string) =>
  (status || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase())
    .trim() || 'Unknown';

export const formatDuration = (ms: number) => {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export const resolveActorDisplayName = (orgId: string, userId: string, displayName?: string) => {
  if (displayName?.trim()) return displayName.trim();
  const user = userService.getUsers(orgId).find((candidate) => candidate.id === userId);
  return user?.displayName || 'Unknown user';
};

export const createAuditEntry = (userId: string, displayName: string, action: string) => ({
  id: createId(),
  userId,
  displayName,
  action,
  timestamp: Date.now()
});

export const isDoneStatusForProject = (orgId: string, projectId: string, status?: string) => {
  if (!status) return false;
  const normalized = status.toLowerCase();
  if (normalized === 'done' || normalized === 'completed') return true;
  const project = projectService.getProjects(orgId).find((item) => item.id === projectId);
  const doneStageId = project?.stages?.[project.stages.length - 1]?.id;
  if (doneStageId && status === doneStageId) return true;
  return normalized.includes('done');
};

export const buildUpdateAuditActions = (
  task: Task,
  updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>,
  orgId: string
): string[] => {
  const actions: string[] = [];

  if (typeof updates.title === 'string' && updates.title !== task.title) {
    actions.push(`renamed task to "${updates.title}"`);
  }
  if (typeof updates.description === 'string' && updates.description !== task.description) {
    actions.push(updates.description.trim() ? 'updated description' : 'cleared description');
  }
  if (typeof updates.status === 'string' && updates.status !== task.status) {
    actions.push(`moved task to ${stageLabel(updates.status)}`);
  }
  if (updates.priority && updates.priority !== task.priority) {
    actions.push(`set priority to ${updates.priority}`);
  }
  if ('dueDate' in updates && updates.dueDate !== task.dueDate) {
    actions.push(updates.dueDate ? `set due date to ${new Date(updates.dueDate).toLocaleDateString()}` : 'cleared due date');
  }
  if (Array.isArray(updates.tags) && JSON.stringify(updates.tags) !== JSON.stringify(task.tags || [])) {
    actions.push(updates.tags.length > 0 ? `updated tags (${updates.tags.length})` : 'cleared tags');
  }
  if (Array.isArray(updates.blockedByIds) && JSON.stringify(updates.blockedByIds) !== JSON.stringify(task.blockedByIds || [])) {
    actions.push(`updated dependencies (${updates.blockedByIds.length})`);
  }
  if (Array.isArray(updates.subtasks) && JSON.stringify(updates.subtasks) !== JSON.stringify(task.subtasks || [])) {
    const completed = updates.subtasks.filter((subtask) => subtask.isCompleted).length;
    actions.push(`updated subtasks (${completed}/${updates.subtasks.length} complete)`);
  }
  if (typeof updates.timeLogged === 'number' && updates.timeLogged !== (task.timeLogged || 0)) {
    const delta = updates.timeLogged - (task.timeLogged || 0);
    actions.push(delta > 0 ? `logged ${formatDuration(delta)} manually` : 'updated tracked time');
  }
  if (typeof updates.estimateMinutes === 'number' && updates.estimateMinutes !== task.estimateMinutes) {
    actions.push(`updated estimate to ${updates.estimateMinutes}m`);
  }
  if ('estimateRiskApprovedAt' in updates && updates.estimateRiskApprovedAt && updates.estimateRiskApprovedAt !== task.estimateRiskApprovedAt) {
    actions.push('approved risk-adjusted completion');
  }
  if (typeof updates.isAtRisk === 'boolean' && updates.isAtRisk !== Boolean(task.isAtRisk)) {
    actions.push(updates.isAtRisk ? 'marked task at risk' : 'marked task on track');
  }
  if ('approvedAt' in updates && updates.approvedAt && updates.approvedAt !== task.approvedAt) {
    actions.push('approved this task');
  }
  if (typeof updates.movedBackReason === 'string' && updates.movedBackReason.trim()) {
    const fromStage = updates.movedBackFromStatus ? stageLabel(updates.movedBackFromStatus) : stageLabel(task.status);
    actions.push(`moved task backward from ${fromStage}: "${updates.movedBackReason.trim()}"`);
  }

  const previousAssigneeIds = getTaskAssigneeIds(task);
  const nextAssigneeIds =
    Array.isArray(updates.assigneeIds) && updates.assigneeIds.length > 0
      ? updates.assigneeIds
      : typeof updates.assigneeId === 'string'
        ? (updates.assigneeId ? [updates.assigneeId] : [])
        : previousAssigneeIds;
  if (JSON.stringify(previousAssigneeIds) !== JSON.stringify(nextAssigneeIds)) {
    const usersById = new Map(userService.getUsers(orgId).map((user) => [user.id, user.displayName]));
    const names = nextAssigneeIds.map((id) => usersById.get(id) || 'Unknown');
    actions.push(names.length > 0 ? `updated assignees: ${names.join(', ')}` : 'cleared assignees');
  }
  if (Array.isArray(updates.securityGroupIds) && JSON.stringify(updates.securityGroupIds) !== JSON.stringify(task.securityGroupIds || [])) {
    actions.push(updates.securityGroupIds.length > 0 ? `updated security groups (${updates.securityGroupIds.length})` : 'cleared security groups');
  }

  return actions;
};

export const isAdminOrLeadMention = (orgId: string, userId: string) => {
  const actor = userService.getUsers(orgId).find((candidate) => candidate.id === userId);
  return actor?.role === 'admin';
};

