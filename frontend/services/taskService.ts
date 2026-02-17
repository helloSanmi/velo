import { Task, TaskPriority } from '../types';
import { getAllTasksForOrg, getTaskById, getTasksForViewer } from './task-service/query';
import {
  addCommentMutation,
  appendAuditEntryMutation,
  clearTasksData,
  createTaskMutation,
  deleteTaskMutation,
  deleteTasksByProjectMutation,
  reorderTasksMutation,
  toggleTimerMutation,
  updateTaskMutation
} from './task-service/mutations';

export const taskService = {
  getAllTasksForOrg,
  getTasks: getTasksForViewer,
  getTaskById,
  createTask: (
    userId: string,
    orgId: string,
    projectId: string,
    title: string,
    description: string,
    priority: TaskPriority,
    tags: string[] = [],
    dueDate?: number,
    assigneeIds: string[] = [],
    securityGroupIds: string[] = [],
    estimateMinutes?: number,
    estimateProvidedBy?: string,
    creationAuditAction?: string
  ): Task =>
    createTaskMutation(
      userId,
      orgId,
      projectId,
      title,
      description,
      priority,
      tags,
      dueDate,
      assigneeIds,
      securityGroupIds,
      estimateMinutes,
      estimateProvidedBy,
      creationAuditAction
    ),
  updateTask: (
    userId: string,
    orgId: string,
    id: string,
    updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>,
    displayName?: string
  ): Task[] => updateTaskMutation(userId, orgId, id, updates, displayName),
  toggleTimer: (userId: string, orgId: string, id: string): Task[] => toggleTimerMutation(userId, orgId, id),
  updateTaskStatus: (userId: string, orgId: string, id: string, status: string, displayName?: string): Task[] =>
    updateTaskMutation(userId, orgId, id, { status }, displayName),
  addComment: (userId: string, orgId: string, taskId: string, text: string, displayName: string): Task[] =>
    addCommentMutation(userId, orgId, taskId, text, displayName),
  appendAuditEntry: (userId: string, orgId: string, taskId: string, action: string, displayName?: string): Task[] =>
    appendAuditEntryMutation(userId, orgId, taskId, action, displayName),
  deleteTask: (userId: string, orgId: string, id: string): Task[] => deleteTaskMutation(userId, orgId, id),
  deleteTasksByProject: (userId: string, orgId: string, projectId: string): Task[] =>
    deleteTasksByProjectMutation(userId, orgId, projectId),
  reorderTasks: (orgId: string, reorderedTasks: Task[], actorId?: string, actorDisplayName?: string): void =>
    reorderTasksMutation(orgId, reorderedTasks, actorId, actorDisplayName),
  clearData: clearTasksData
};
