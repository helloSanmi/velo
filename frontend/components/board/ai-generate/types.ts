import { TaskPriority } from '../../../types';

export interface GeneratedTaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  tags: string[];
  assigneeIds?: string[];
}
