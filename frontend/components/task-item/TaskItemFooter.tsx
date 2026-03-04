import React, { useState } from 'react';
import { CheckSquare, Clock, Link2, Pause, Play } from 'lucide-react';
import { Task } from '../../types';
import { getUserFullName } from '../../utils/userDisplay';

interface TaskItemFooterProps {
  task: Task;
  totalTags: number;
  tagsTooltip: string;
  totalSubtasks: number;
  completedSubtasks: number;
  hasDependencies: boolean;
  dependencyIds: string[];
  dependencyClass: string;
  dependencyTooltip: string;
  totalMs: number;
  formattedTime: string;
  adjustedEstimateLabel: string;
  readOnly: boolean;
  onToggleTimer?: (id: string) => void;
  canToggleTimer: boolean;
  isTimerActive: boolean;
  assignees: any[];
  assigneeNames: string;
}

export const TaskItemFooter: React.FC<TaskItemFooterProps> = ({
  task,
  totalTags,
  tagsTooltip,
  totalSubtasks,
  completedSubtasks,
  hasDependencies,
  dependencyIds,
  dependencyClass,
  dependencyTooltip,
  totalMs,
  formattedTime,
  adjustedEstimateLabel,
  readOnly,
  onToggleTimer,
  canToggleTimer,
  isTimerActive,
  assignees,
  assigneeNames
}) => {
  const [showDependencyTooltip, setShowDependencyTooltip] = useState(false);
  const [showTagsTooltip, setShowTagsTooltip] = useState(false);

  return (
    <div className="flex items-center justify-between gap-1.5 mt-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        {totalTags > 0 ? (
          <span className="relative inline-flex">
            <span
              onMouseEnter={() => setShowTagsTooltip(true)}
              onMouseLeave={() => setShowTagsTooltip(false)}
              className="text-[9px] px-1 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600"
            >
              {totalTags} {totalTags === 1 ? 'tag' : 'tags'}
            </span>
            {showTagsTooltip ? (
              <span className="pointer-events-none absolute left-0 top-[-6px] -translate-y-full z-30 w-[140px] rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[9px] leading-snug text-slate-700 shadow-lg whitespace-pre-line">
                {tagsTooltip}
              </span>
            ) : null}
          </span>
        ) : null}

        {totalSubtasks > 0 ? (
          <span className="inline-flex items-center gap-1 text-[9px] text-slate-600 px-1 py-0.5 rounded bg-slate-50 border border-slate-200">
            <CheckSquare className="w-3 h-3" />
            {completedSubtasks}/{totalSubtasks} subtasks
          </span>
        ) : null}

        {hasDependencies ? (
          <span className="relative inline-flex">
            <span
              onMouseEnter={() => setShowDependencyTooltip(true)}
              onMouseLeave={() => setShowDependencyTooltip(false)}
              className={`inline-flex items-center gap-1 text-[9px] px-1 py-0.5 rounded border ${dependencyClass}`}
            >
              <Link2 className="w-3 h-3" />
              {dependencyIds.length}
            </span>
            {showDependencyTooltip ? (
              <span className="pointer-events-none absolute left-0 top-[-8px] -translate-y-full z-30 w-[220px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] leading-relaxed text-slate-700 shadow-lg whitespace-pre-line">
                {dependencyTooltip || `${dependencyIds.length} dependencies`}
              </span>
            ) : null}
          </span>
        ) : null}

        {totalMs > 0 || isTimerActive ? (
          <span className="inline-flex items-center gap-1 text-[9px] text-slate-600">
            <Clock className="w-3 h-3" /> {formattedTime}
          </span>
        ) : null}

        {adjustedEstimateLabel ? (
          <span className="inline-flex items-center gap-1 text-[9px] text-slate-600 px-1 py-0.5 rounded bg-slate-50 border border-slate-200">
            {adjustedEstimateLabel}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        {!readOnly && onToggleTimer ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!canToggleTimer) return;
              onToggleTimer(task.id);
            }}
            disabled={!canToggleTimer}
            className={`h-6 w-6 rounded-md border text-[10px] font-medium inline-flex items-center justify-center transition-colors ${
              isTimerActive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            } disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white`}
            title={canToggleTimer ? (isTimerActive ? 'Stop timer' : 'Start timer') : 'Only assigned members can track time'}
          >
            {isTimerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        ) : null}

        {assignees.length > 0 ? (
          <div className="flex items-center -space-x-1" title={assigneeNames} aria-label={assigneeNames}>
            {assignees.slice(0, 3).map((assignee: any) => (
              <div key={assignee.id} className="relative">
                <img
                  src={assignee.avatar}
                  alt={assignee.displayName}
                  title={getUserFullName(assignee)}
                  className="w-6 h-6 rounded-lg border border-white shadow-sm"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

