import React from 'react';
import { CalendarDays, Link2 } from 'lucide-react';
import { Task } from '../../../types';
import { CELL_WIDTH, DAY_MS, dayStart } from './shared';

interface TimelineTaskRowProps {
  task: Task;
  tasks: Task[];
  days: number[];
  timelineStart: number;
  nowDay: number;
  statusOptions: Array<{ id: string; name: string }>;
  taskById: Map<string, Task>;
  editingDepsForTaskId: string | null;
  draftDependencyIds: string[];
  setDraftDependencyIds: (ids: string[]) => void;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onBeginEditDependencies: (task: Task) => void;
  onSaveDependencies: () => void;
  onCancelDependencyEdit: () => void;
  onDropDueDate: (event: React.DragEvent<HTMLDivElement>, dueTs: number) => void;
}

const TimelineTaskRow: React.FC<TimelineTaskRowProps> = ({
  task,
  tasks,
  days,
  timelineStart,
  nowDay,
  statusOptions,
  taskById,
  editingDepsForTaskId,
  draftDependencyIds,
  setDraftDependencyIds,
  onSelectTask,
  onUpdateTask,
  onBeginEditDependencies,
  onSaveDependencies,
  onCancelDependencyEdit,
  onDropDueDate
}) => {
  const due = task.dueDate ? dayStart(task.dueDate) : undefined;
  const durationDays = Math.max(1, Math.min(10, Math.ceil((task.estimateMinutes || 480) / 480)));
  const endIndex = typeof due === 'number' ? Math.floor((due - timelineStart) / DAY_MS) : -1;
  const startIndex = endIndex >= 0 ? Math.max(0, endIndex - durationDays + 1) : -1;
  const hasDependencies = Boolean(task.blockedByIds && task.blockedByIds.length > 0);
  const dependencyConflict = Boolean(
    hasDependencies &&
      due &&
      (task.blockedByIds || []).some((dependencyId) => {
        const dependencyTask = taskById.get(dependencyId);
        return Boolean(dependencyTask?.dueDate && dependencyTask.dueDate > due);
      })
  );
  const statusName = statusOptions.find((stage) => stage.id === task.status)?.name || task.status;
  const isEditing = editingDepsForTaskId === task.id;

  return (
    <div className="flex border-b border-slate-100 min-h-[44px] hover:bg-slate-50/60">
      <div className="w-[300px] shrink-0 px-3 py-2">
        <button type="button" className="text-left w-full" onClick={() => onSelectTask(task)}>
          <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
            <span>{statusName}</span>
            <span>•</span>
            <span>{task.priority}</span>
            {hasDependencies ? (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <Link2 className="h-3 w-3" /> {task.blockedByIds?.length} deps
                </span>
              </>
            ) : null}
            {dependencyConflict ? (
              <>
                <span>•</span>
                <span className="text-rose-700 font-medium">Dependency conflict</span>
              </>
            ) : null}
            <button
              type="button"
              className="ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50"
              onClick={(event) => {
                event.stopPropagation();
                onBeginEditDependencies(task);
              }}
            >
              Edit deps
            </button>
          </div>
        </button>
        {isEditing ? (
          <div className="mt-1 rounded border border-slate-200 bg-slate-50 p-1.5">
            <select
              multiple
              size={3}
              value={draftDependencyIds}
              onChange={(event) => {
                const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                setDraftDependencyIds(selected);
              }}
              className="w-full rounded border border-slate-300 bg-white px-1 py-1 text-[10px] text-slate-700"
            >
              {tasks
                .filter((candidate) => candidate.id !== task.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </option>
                ))}
            </select>
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-700"
                onClick={(event) => {
                  event.stopPropagation();
                  onSaveDependencies();
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600"
                onClick={(event) => {
                  event.stopPropagation();
                  onCancelDependencyEdit();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="relative flex">
        {days.map((day) => (
          <div
            key={`${task.id}-${day}`}
            className="h-[44px] border-l border-slate-100"
            style={{ width: `${CELL_WIDTH}px` }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDropDueDate(event, day)}
            title={`Drop to set due date: ${new Date(day).toLocaleDateString()}`}
          />
        ))}
        {endIndex >= 0 ? (
          <button
            type="button"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('text/task-id', task.id)}
            onClick={() => onSelectTask(task)}
            className="absolute top-1 h-[36px] rounded-md border border-[#76003f]/30 bg-[#76003f]/15 px-2 text-xs text-[#4d002a] hover:bg-[#76003f]/20"
            style={{
              left: `${startIndex * CELL_WIDTH + 2}px`,
              width: `${Math.max(CELL_WIDTH - 4, durationDays * CELL_WIDTH - 4)}px`
            }}
            title={`Due ${new Date(due).toLocaleDateString()} • Drag to reschedule`}
          >
            <span className="truncate block">{task.title}</span>
          </button>
        ) : (
          <button
            type="button"
            className="absolute top-1 left-1 h-[36px] rounded-md border border-slate-300 bg-slate-50 px-2 text-xs text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"
            onClick={() => onUpdateTask(task.id, { dueDate: nowDay })}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Schedule today
          </button>
        )}
      </div>
    </div>
  );
};

export default TimelineTaskRow;
