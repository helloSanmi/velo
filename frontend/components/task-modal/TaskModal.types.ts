import { TaskPriority } from '../../types';

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags: string[],
    dueDate?: number,
    assigneeIds?: string[],
    estimateMinutes?: number,
    creationAuditAction?: string
  ) => void;
  canAssignMembers?: boolean;
  projectId?: string | null;
  aiPlanEnabled?: boolean;
  aiEnabled?: boolean;
}
