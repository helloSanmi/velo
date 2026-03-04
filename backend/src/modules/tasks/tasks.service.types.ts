import type { TaskActor, TaskPatch } from './tasks.helpers.js';

export type ListTasksInput = { orgId: string; projectId?: string };

export type CreateTaskInput = {
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
};

export type UpdateTaskInput = {
  orgId: string;
  projectId: string;
  taskId: string;
  actor: TaskActor;
  patch: TaskPatch;
};

export type RemoveTaskInput = {
  orgId: string;
  projectId: string;
  taskId: string;
  actor: TaskActor;
};
