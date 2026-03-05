import { Project, Task, TaskPriority } from '../../types';

export interface BoardContext {
  projects?: Project[];
  activeProjectId?: string | null;
  currentUserName?: string;
  responseStyle?: 'concise' | 'action_plan' | 'executive';
}

export type VoiceActionType =
  | 'switch_project'
  | 'create_task'
  | 'set_status'
  | 'set_priority'
  | 'assign_task';

export interface VoiceActionPlanItem {
  type: VoiceActionType;
  label: string;
  taskId?: string;
  projectId?: string | null;
  status?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface BoardSummary {
  label: string;
  total: number;
  open: number;
  done: number;
  overdue: Task[];
  high: Task[];
  atRisk: Task[];
}
