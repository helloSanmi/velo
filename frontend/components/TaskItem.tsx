import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Clock, Link2, Pause, Play, Sparkles, Trash2, RotateCcw } from 'lucide-react';
import { Task, TaskPriority } from '../types';
import Badge from './ui/Badge';
import { projectService } from '../services/projectService';
import { settingsService } from '../services/settingsService';
import { userService } from '../services/userService';
import { estimationService } from '../services/estimationService';
import { taskService } from '../services/taskService';
import { getUserFullName } from '../utils/userDisplay';

interface TaskItemProps {
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

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  showProjectName = true,
  isSelected,
  onToggleSelection,
  onDelete,
  onAIAssist,
  onSelect,
  onToggleTimer,
  readOnly = false,
  canDelete = true,
  canUseAIAssist = true,
  canToggleTimer = true
}) => {
  const [settings, setSettings] = useState(settingsService.getSettings());
  const [elapsed, setElapsed] = useState(0);
  const [showDependencyTooltip, setShowDependencyTooltip] = useState(false);
  const [showTagsTooltip, setShowTagsTooltip] = useState(false);

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => setSettings(e.detail);
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    let interval: any;
    if (task.isTimerRunning && task.timerStartedAt) {
      interval = setInterval(() => {
        setElapsed(Date.now() - task.timerStartedAt!);
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [task.isTimerRunning, task.timerStartedAt]);

  const priorityVariants = {
    [TaskPriority.HIGH]: 'rose' as const,
    [TaskPriority.MEDIUM]: 'amber' as const,
    [TaskPriority.LOW]: 'indigo' as const
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('taskId', task.id);
    e.currentTarget.classList.add('opacity-60');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-60');
  };

  const totalMs = (task.timeLogged || 0) + elapsed;
  const minutes = Math.floor(totalMs / 60000);
  const hours = Math.floor(minutes / 60);
  const formattedTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  const isTimerActive = !!task.isTimerRunning;

  const isCompact = settings.compactMode;
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = (task.subtasks || []).filter((subtask) => subtask.isCompleted).length;
  const totalTags = task.tags?.length || 0;
  const tagsTooltip = [
    ...task.tags.slice(0, 4),
    task.tags.length > 4 ? `+${task.tags.length - 4} more` : ''
  ]
    .filter(Boolean)
    .join('\n');
  const dependencyIds = Array.isArray(task.blockedByIds) ? task.blockedByIds : [];
  const allProjects = projectService.getProjects(task.orgId);
  const allOrgTasks = taskService.getAllTasksForOrg(task.orgId);
  const dependencies = dependencyIds
    .map((depId) => allOrgTasks.find((candidate) => candidate.id === depId))
    .filter((dep): dep is Task => Boolean(dep));
  const missingDependencyCount = Math.max(0, dependencyIds.length - dependencies.length);
  const incompleteDependencyCount = dependencies.filter((dep) => {
    const depProject = allProjects.find((project) => project.id === dep.projectId);
    const doneStageId = depProject?.stages?.length ? depProject.stages[depProject.stages.length - 1].id : 'done';
    return dep.status !== doneStageId;
  }).length;
  const hasDependencies = dependencyIds.length > 0;
  const dependencyTone = missingDependencyCount > 0 ? 'critical' : incompleteDependencyCount > 0 ? 'blocked' : hasDependencies ? 'ready' : 'none';
  const dependencyClass =
    dependencyTone === 'critical'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : dependencyTone === 'blocked'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-600';
  const dependencyTooltip = [
    missingDependencyCount > 0 ? `${missingDependencyCount} dependency ${missingDependencyCount > 1 ? 'tasks are' : 'task is'} missing.` : '',
    ...dependencies.slice(0, 3).map((dep) => {
      const depProject = allProjects.find((project) => project.id === dep.projectId);
      const doneStageId = depProject?.stages?.length ? depProject.stages[depProject.stages.length - 1].id : 'done';
      const doneStageName = depProject?.stages?.length ? depProject.stages[depProject.stages.length - 1].name : 'Done';
      const stateLabel = dep.status === doneStageId ? doneStageName : dep.status.replace(/-/g, ' ');
      return `${dep.title} (${stateLabel})`;
    }),
    dependencies.length > 3 ? `+${dependencies.length - 3} more dependencies` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const project = useMemo(() => {
    const projects = projectService.getProjects();
    return projects.find((p) => p.id === task.projectId);
  }, [task.projectId]);

  const assigneeIds = useMemo(() => {
    if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds;
    return task.assigneeId ? [task.assigneeId] : [];
  }, [task.assigneeIds, task.assigneeId]);

  const assignees = useMemo(() => {
    const users = userService.getUsers();
    return assigneeIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
  }, [assigneeIds]);
  const assigneeNames = useMemo(
    () => assignees.map((assignee: any) => getUserFullName(assignee)).join(', '),
    [assignees]
  );
  const adjustedEstimateLabel = useMemo(() => {
    if (!settings.showPersonalCalibration) return '';
    if (!task.estimateMinutes || task.estimateMinutes <= 0) return '';
    const estimator = task.estimateProvidedBy || task.userId;
    const preview = estimationService.getAdjustmentPreview(task.orgId, estimator, task.estimateMinutes, {
      projectId: task.projectId,
      status: task.status,
      tags: task.tags
    });
    const hours = Math.max(0.25, preview.adjustedMinutes / 60);
    return `Adj ${hours.toFixed(hours >= 10 ? 1 : 2)}h`;
  }, [settings.showPersonalCalibration, task]);

  return (
    <article
      draggable={!readOnly}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        if (!readOnly && e.shiftKey && onToggleSelection) {
          onToggleSelection(task.id);
          return;
        }
        onSelect(task);
      }}
      data-task-id={task.id}
      className={`group border rounded-lg bg-white p-2.5 cursor-pointer transition-all ${
        isSelected ? 'border-slate-700 ring-1 ring-slate-300' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      } ${dependencyTone === 'critical' ? 'border-l-2 border-l-rose-300' : dependencyTone === 'blocked' ? 'border-l-2 border-l-amber-300' : ''}`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1.5 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <Badge variant={priorityVariants[task.priority]}>{task.priority}</Badge>
          {showProjectName && project && (
            <span className="text-[9px] px-1 py-0.5 rounded border border-slate-200 text-slate-600 bg-slate-50 max-w-[120px] truncate">
              {project.name}
            </span>
          )}
          {task.movedBackAt && (
            <span className="inline-flex items-center gap-1 text-[9px] px-1 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700">
              <RotateCcw className="w-3 h-3" /> Moved back
            </span>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {settings.aiSuggestions && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAIAssist(task);
                }}
                disabled={!canUseAIAssist}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                title={canUseAIAssist ? 'AI assist' : 'Only project owner/admin can run AI suggestions'}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
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
        )}
      </div>

      <h4 className={`text-[13px] font-medium text-slate-900 leading-snug ${isCompact ? '' : 'mb-1'}`}>{task.title}</h4>

      {!isCompact && task.description && (
        <p className="text-[11px] text-slate-600 truncate mb-1.5">{task.description}</p>
      )}

      <div className="flex items-center justify-between gap-1.5 mt-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {totalTags > 0 && (
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
          )}
          {totalSubtasks > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] text-slate-600 px-1 py-0.5 rounded bg-slate-50 border border-slate-200">
              <CheckSquare className="w-3 h-3" />
              {completedSubtasks}/{totalSubtasks} subtasks
            </span>
          )}
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
          {(totalMs > 0 || isTimerActive) && (
            <span className="inline-flex items-center gap-1 text-[9px] text-slate-600">
              <Clock className="w-3 h-3" /> {formattedTime}
            </span>
          )}
          {adjustedEstimateLabel ? (
            <span className="inline-flex items-center gap-1 text-[9px] text-slate-600 px-1 py-0.5 rounded bg-slate-50 border border-slate-200">
              {adjustedEstimateLabel}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          {!readOnly && onToggleTimer && (
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
          )}

          {assignees.length > 0 && (
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
          )}
        </div>
      </div>
    </article>
  );
};

export default TaskItem;
