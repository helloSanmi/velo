import { Prisma, Project, UserRole, Task } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { enforce } from '../policy/policy.service.js';

export interface TaskActor {
  userId: string;
  role: UserRole;
}

export type TaskPatch = Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeIds: string[];
  securityGroupIds: string[];
  blockedByIds: string[];
  tags: string[];
  dueDate: Date | null;
  comments: Record<string, unknown>[];
  subtasks: Record<string, unknown>[];
  auditLog: Record<string, unknown>[];
  timeLoggedMs: number;
  isTimerRunning: boolean;
  timerStartedAt: Date | null;
  metadata: Record<string, unknown>;
}>;

export const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export const parseStageDefs = (value: unknown): { id: string; name: string }[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id.trim() : '',
          name: typeof item.name === 'string' ? item.name.trim() : ''
        }))
        .filter((stage) => stage.id.length > 0 && stage.name.length > 0)
    : [];

export const getFinalStageForProject = (project: { stageDefs: unknown }) => {
  const stages = parseStageDefs(project.stageDefs);
  if (stages.length > 0) return stages[stages.length - 1];
  return { id: 'done', name: 'Done' };
};

export const parseProjectOwnerIds = (project: { ownerId: string; metadata: unknown }): string[] => {
  const metadata = project.metadata && typeof project.metadata === 'object' ? (project.metadata as Record<string, unknown>) : {};
  const ownerIds = Array.isArray(metadata.ownerIds)
    ? metadata.ownerIds.filter((item): item is string => typeof item === 'string')
    : [];
  return Array.from(new Set([project.ownerId, ...ownerIds]));
};

export const getProjectOrThrow = async (orgId: string, projectId: string): Promise<Project> => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.orgId !== orgId) throw new HttpError(404, 'Project not found.');
  return project;
};

export const getTaskOrThrow = async (orgId: string, projectId: string, taskId: string): Promise<Task> => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.orgId !== orgId || task.projectId !== projectId) {
    throw new HttpError(404, 'Task not found.');
  }
  return task;
};

export const enforceTaskPolicy = (
  action: 'task:assign' | 'task:status' | 'task:edit' | 'task:delete',
  input: { actor: TaskActor; project: Project; task?: Task }
) => {
  const isProjectMember = parseStringArray(input.project.memberIds).includes(input.actor.userId);
  const isTaskAssignee = input.task ? parseStringArray(input.task.assigneeIds).includes(input.actor.userId) : false;
  const projectOwnerIds = parseProjectOwnerIds(input.project);
  enforce(action, {
    role: input.actor.role,
    userId: input.actor.userId,
    projectOwnerId: input.project.ownerId,
    projectOwnerIds,
    isProjectMember,
    isTaskAssignee
  });
};

export const shouldEnforceAssign = (patch: TaskPatch) =>
  patch.assigneeIds !== undefined || patch.securityGroupIds !== undefined;

export const shouldEnforceStatus = (patch: TaskPatch) => patch.status !== undefined;

export const shouldEnforceOperate = (patch: TaskPatch) =>
  patch.comments !== undefined ||
  patch.auditLog !== undefined ||
  patch.timeLoggedMs !== undefined ||
  patch.isTimerRunning !== undefined ||
  patch.timerStartedAt !== undefined;

export const shouldEnforceEdit = (patch: TaskPatch) =>
  patch.title !== undefined ||
  patch.description !== undefined ||
  patch.priority !== undefined ||
  patch.tags !== undefined ||
  patch.subtasks !== undefined ||
  patch.dueDate !== undefined ||
  patch.blockedByIds !== undefined ||
  patch.metadata !== undefined;

export const mergeTaskMetadata = (task: Task, patchMetadata?: Record<string, unknown>) => {
  if (!patchMetadata) return undefined;
  return {
    ...((task.metadata as Record<string, unknown> | null) || {}),
    ...patchMetadata
  } as Prisma.InputJsonValue;
};
