import React from 'react';
import { Trash2, X } from 'lucide-react';
import { Task, TaskPriority, User } from '../../types';
import Badge from '../ui/Badge';
import { dialogService } from '../../services/dialogService';
import TaskAssigneeEditor from './TaskAssigneeEditor';
import TaskPriorityEditor from './TaskPriorityEditor';
import { getPermissionMessage } from '../../services/permissionAccessService';

interface TaskDetailHeaderProps {
  task: Task;
  onClose: () => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
  allUsers: User[];
  assigneeIds: string[];
  canManageTask?: boolean;
  onAssigneesChange: (ids: string[]) => void;
  onPriorityChange: (priority: TaskPriority) => void;
}

const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  task,
  onClose,
  onDelete,
  canDelete = true,
  allUsers,
  assigneeIds,
  canManageTask = false,
  onAssigneesChange,
  onPriorityChange
}) => {
  return (
    <div className="px-3 py-3 md:px-5 md:py-4 flex flex-col gap-3 md:gap-0 md:flex-row md:items-start md:justify-between border-b border-slate-200 flex-shrink-0 bg-white">
      <div className="flex-1 overflow-visible">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="indigo">{task.status.toUpperCase()}</Badge>
          {task.isAtRisk && <Badge variant="rose">AT RISK</Badge>}
          <TaskPriorityEditor task={task} canManageTask={canManageTask} onPriorityChange={onPriorityChange} />
        </div>
        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight leading-tight truncate" title={task.title}>
          {task.title}
        </h2>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 md:ml-3 w-full md:w-auto">
        <TaskAssigneeEditor allUsers={allUsers} assigneeIds={assigneeIds} canManageTask={canManageTask} onAssigneesChange={onAssigneesChange} />
        <button
          onClick={async () => {
            if (!canDelete) return;
            const confirmed = await dialogService.confirm('Delete this task?', { title: 'Delete task', confirmText: 'Delete', danger: true });
            if (confirmed) {
              onDelete(task.id);
              onClose();
            }
          }}
          disabled={!canDelete}
          title={canDelete ? 'Delete task' : getPermissionMessage('project_owner_or_admin', 'delete')}
          className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-rose-50 hover:text-rose-700 transition-all disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-slate-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={onClose} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 transition-all active:scale-95">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TaskDetailHeader;
