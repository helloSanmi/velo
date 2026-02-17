import { Project, Task, TaskPriority } from '../../types';

export interface AICommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  activeProjectId?: string | null;
  currentUserName?: string;
  currentUserId: string;
  orgId: string;
  onSelectProject?: (projectId: string) => void;
  onCreateTask?: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags?: string[],
    dueDate?: number,
    projectId?: string
  ) => void;
  onSetTaskStatus?: (taskId: string, status: string) => void;
  onSetTaskPriority?: (taskId: string, priority: TaskPriority) => void;
  onAssignTask?: (taskId: string, assigneeId: string) => void;
  onPinInsight?: (projectId: string, insight: string) => void;
  onUnpinInsight?: (projectId: string, insight: string) => void;
  isInsightPinned?: (projectId: string, insight: string) => boolean;
}

