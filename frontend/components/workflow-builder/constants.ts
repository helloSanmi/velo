import { WorkflowAction, WorkflowTrigger } from '../../types';

export const TRIGGER_LABEL: Record<WorkflowTrigger, string> = {
  TASK_CREATED: 'Task is created',
  STATUS_CHANGED: 'Task status changes',
  PRIORITY_CHANGED: 'Task priority changes'
};

export const ACTION_LABEL: Record<WorkflowAction, string> = {
  SET_PRIORITY: 'Set task priority',
  ASSIGN_USER: 'Assign task to user',
  ADD_TAG: 'Add task tag',
  NOTIFY_OWNER: 'Notify project owner'
};
