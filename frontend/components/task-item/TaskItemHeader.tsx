import React from 'react';
import { RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { Task, TaskPriority } from '../../types';
import Badge from '../ui/Badge';
import { getAiAccessTitle } from '../../services/aiAccessService';

interface TaskItemHeaderProps {
  task: Task;
  showProjectName: boolean;
  projectName?: string;
  readOnly: boolean;
  aiPlanEnabled: boolean;
  aiEnabled: boolean;
  canManageAIAssist: boolean;
  canDelete: boolean;
  onAIAssist: (task: Task) => void;
  onDelete: (id: string) => void;
}

const priorityVariants = {
  [TaskPriority.HIGH]: 'rose' as const,
  [TaskPriority.MEDIUM]: 'amber' as const,
  [TaskPriority.LOW]: 'indigo' as const
};

export const TaskItemHeader: React.FC<TaskItemHeaderProps> = ({
  task,
  showProjectName,
  projectName,
  readOnly,
  aiPlanEnabled,
  aiEnabled,
  canManageAIAssist,
  canDelete,
  onAIAssist,
  onDelete
}) => {
  const aiAssistTitle = !aiPlanEnabled
    ? getAiAccessTitle({ aiPlanEnabled, aiEnabled, hasPermission: canManageAIAssist, featureLabel: 'AI assist' })
    : getAiAccessTitle({
        aiPlanEnabled,
        aiEnabled,
        hasPermission: canManageAIAssist,
        featureLabel: 'AI assist',
        permissionMessage: 'Only project owner/admin can use AI assist'
      });

  return (
    <div className="flex items-start justify-between gap-1.5 mb-1.5 min-w-0">
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        <Badge variant={priorityVariants[task.priority]}>{task.priority}</Badge>
        {showProjectName && projectName ? (
          <span className="text-[9px] px-1 py-0.5 rounded border border-slate-200 text-slate-600 bg-slate-50 max-w-[120px] truncate">
            {projectName}
          </span>
        ) : null}
        {task.movedBackAt ? (
          <span className="inline-flex items-center gap-1 text-[9px] px-1 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700">
            <RotateCcw className="w-3 h-3" /> Moved back
          </span>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAIAssist(task);
            }}
            disabled={aiPlanEnabled && aiEnabled && !canManageAIAssist}
            className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title={aiAssistTitle}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!canDelete) return;
              onDelete(task.id);
            }}
            disabled={!canDelete}
            className="w-7 h-7 rounded-md hover:bg-rose-50 flex items-center justify-center text-slate-500 hover:text-rose-700 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
            title={canDelete ? 'Delete' : 'Only project owner/admin can delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
};
