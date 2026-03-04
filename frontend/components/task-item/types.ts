import { Task } from '../../types';

export interface TaskItemProps {
  task: Task;
  showProjectName?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onAIAssist: (task: Task) => void;
  onSelect: (task: Task) => void;
  onToggleTimer?: (id: string) => void;
  readOnly?: boolean;
  canDelete?: boolean;
  canUseAIAssist?: boolean;
  canToggleTimer?: boolean;
}
