import React, { useEffect, useState } from 'react';
import { TaskItemHeader } from './task-item/TaskItemHeader';
import { TaskItemFooter } from './task-item/TaskItemFooter';
import { useTaskItemMeta } from './task-item/useTaskItemMeta';
import { TaskItemProps } from './task-item/types';
import { settingsService } from '../services/settingsService';

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
  aiPlanEnabled = true,
  aiEnabled = true,
  canManageAIAssist = true,
  canToggleTimer = true
}) => {
  const [settings, setSettings] = useState(settingsService.getSettings());
  const [elapsed, setElapsed] = useState(0);

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

  const {
    totalMs,
    formattedTime,
    isTimerActive,
    totalSubtasks,
    completedSubtasks,
    totalTags,
    tagsTooltip,
    dependencyIds,
    hasDependencies,
    dependencyTone,
    dependencyClass,
    dependencyTooltip,
    project,
    assignees,
    assigneeNames,
    adjustedEstimateLabel
  } = useTaskItemMeta(task, settings.showPersonalCalibration, elapsed);

  const isCompact = settings.compactMode;

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
      <TaskItemHeader
        task={task}
        showProjectName={showProjectName}
        projectName={project?.name}
        readOnly={readOnly}
        aiPlanEnabled={aiPlanEnabled}
        aiEnabled={aiEnabled}
        canManageAIAssist={canManageAIAssist}
        canDelete={canDelete}
        onAIAssist={onAIAssist}
        onDelete={onDelete}
      />

      <h4 className={`text-[13px] font-medium text-slate-900 leading-snug ${isCompact ? '' : 'mb-1'}`}>{task.title}</h4>

      {!isCompact && task.description ? (
        <p className="text-[11px] text-slate-600 truncate mb-1.5">{task.description}</p>
      ) : null}

      <TaskItemFooter
        task={task}
        totalTags={totalTags}
        tagsTooltip={tagsTooltip}
        totalSubtasks={totalSubtasks}
        completedSubtasks={completedSubtasks}
        hasDependencies={hasDependencies}
        dependencyIds={dependencyIds}
        dependencyClass={dependencyClass}
        dependencyTooltip={dependencyTooltip}
        totalMs={totalMs}
        formattedTime={formattedTime}
        adjustedEstimateLabel={adjustedEstimateLabel}
        readOnly={readOnly}
        onToggleTimer={onToggleTimer}
        canToggleTimer={canToggleTimer}
        isTimerActive={isTimerActive}
        assignees={assignees}
        assigneeNames={assigneeNames}
      />
    </article>
  );
};

export default TaskItem;
