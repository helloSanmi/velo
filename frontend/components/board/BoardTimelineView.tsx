import React, { useMemo, useState } from 'react';
import { CalendarDays, Link2 } from 'lucide-react';
import { Task } from '../../types';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';

interface BoardTimelineViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  includeUnscheduled: boolean;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

const DAY_MS = 86400000;
const CELL_WIDTH = 34;

const dayStart = (ts: number) => {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const BoardTimelineView: React.FC<BoardTimelineViewProps> = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  includeUnscheduled,
  onSelectTask,
  onUpdateTask
}) => {
  const [rangeDays, setRangeDays] = useState<21 | 30 | 60>(30);
  const [editingDepsForTaskId, setEditingDepsForTaskId] = useState<string | null>(null);
  const [draftDependencyIds, setDraftDependencyIds] = useState<string[]>([]);

  const tasks = useMemo(
    () =>
      (statusFilter === 'All'
        ? statusOptions.flatMap((stage) => categorizedTasks[stage.id] || [])
        : categorizedTasks[statusFilter] || []
      ).slice().sort((a, b) => a.order - b.order),
    [categorizedTasks, statusFilter, statusOptions]
  );
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const unscheduledTasks = useMemo(() => (includeUnscheduled ? tasks.filter((task) => !task.dueDate) : []), [includeUnscheduled, tasks]);
  const scheduledTasks = useMemo(() => tasks.filter((task) => Boolean(task.dueDate)), [tasks]);

  const nowDay = dayStart(Date.now());
  const dueDates = tasks.map((task) => task.dueDate).filter((value): value is number => typeof value === 'number');
  const minDue = dueDates.length > 0 ? Math.min(...dueDates) : nowDay;
  const maxDue = dueDates.length > 0 ? Math.max(...dueDates) : nowDay + DAY_MS * 7;
  const timelineStart = dayStart(Math.min(nowDay - DAY_MS * 3, minDue - DAY_MS * 3));
  const timelineEnd = dayStart(Math.max(timelineStart + DAY_MS * (rangeDays - 1), maxDue + DAY_MS * 3));
  const totalDays = Math.floor((timelineEnd - timelineStart) / DAY_MS) + 1;
  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, index) => timelineStart + index * DAY_MS),
    [timelineStart, totalDays]
  );

  const onDropDueDate = (event: React.DragEvent<HTMLDivElement>, dueTs: number) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/task-id');
    if (!taskId) return;
    onUpdateTask(taskId, { dueDate: dueTs });
  };

  const bars = useMemo(
    () =>
      scheduledTasks
        .map((task, rowIndex) => {
          const due = task.dueDate ? dayStart(task.dueDate) : undefined;
          if (!due) return null;
          const durationDays = Math.max(1, Math.min(10, Math.ceil((task.estimateMinutes || 480) / 480)));
          const endIndex = Math.floor((due - timelineStart) / DAY_MS);
          if (endIndex < 0 || endIndex >= days.length) return null;
          const startIndex = Math.max(0, endIndex - durationDays + 1);
          return {
            taskId: task.id,
            rowIndex,
            x1: startIndex * CELL_WIDTH + 2,
            x2: endIndex * CELL_WIDTH + Math.max(12, CELL_WIDTH - 2),
            y: rowIndex * 45 + 19
          };
        })
        .filter(Boolean) as Array<{ taskId: string; rowIndex: number; x1: number; x2: number; y: number }>,
    [days.length, scheduledTasks, timelineStart]
  );
  const barsByTaskId = useMemo(() => new Map(bars.map((bar) => [bar.taskId, bar])), [bars]);
  const dependencyLines = useMemo(() => {
    const lines: Array<{ fromId: string; toId: string; d: string }> = [];
    scheduledTasks.forEach((task) => {
      const toBar = barsByTaskId.get(task.id);
      if (!toBar) return;
      (task.blockedByIds || []).forEach((depId) => {
        const fromBar = barsByTaskId.get(depId);
        if (!fromBar) return;
        const midX = (fromBar.x2 + toBar.x1) / 2;
        const d = `M ${fromBar.x2} ${fromBar.y} C ${midX} ${fromBar.y}, ${midX} ${toBar.y}, ${toBar.x1} ${toBar.y}`;
        lines.push({ fromId: depId, toId: task.id, d });
      });
    });
    return lines;
  }, [barsByTaskId, scheduledTasks]);

  const beginEditDependencies = (task: Task) => {
    setEditingDepsForTaskId(task.id);
    setDraftDependencyIds(Array.isArray(task.blockedByIds) ? task.blockedByIds : []);
  };

  const saveDependencies = () => {
    if (!editingDepsForTaskId) return;
    onUpdateTask(editingDepsForTaskId, { blockedByIds: draftDependencyIds });
    setEditingDepsForTaskId(null);
    setDraftDependencyIds([]);
  };

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={`${BOARD_INNER_WRAP_CLASS} h-full`}>
        <div className="h-full rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-xs md:text-sm font-medium text-slate-700">Timeline ({tasks.length} tasks)</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Range</span>
            <select
              className="velo-select h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
              value={rangeDays}
              onChange={(event) => setRangeDays(Number(event.target.value) as 21 | 30 | 60)}
            >
              <option value={21}>3 weeks</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
          </div>
        </div>

        <div className="overflow-auto">
          <div className="min-w-[980px] relative">
            {unscheduledTasks.length > 0 ? (
              <div className="border-b border-slate-200 px-3 py-2 bg-amber-50">
                <p className="text-xs font-medium text-amber-800 mb-1">Unscheduled tasks</p>
                <div className="flex flex-wrap gap-1.5">
                  {unscheduledTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData('text/task-id', task.id)}
                      onClick={() => onSelectTask(task)}
                      className="rounded border border-amber-200 bg-white px-2 py-1 text-[11px] text-amber-800 hover:bg-amber-100"
                      title="Drag to a day in timeline to schedule"
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 flex">
              <div className="w-[300px] shrink-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Task
              </div>
              <div className="flex">
                {days.map((day) => (
                  <div
                    key={day}
                    className="h-10 border-l border-slate-200 px-1 py-1 text-[10px] text-slate-500"
                    style={{ width: `${CELL_WIDTH}px` }}
                    title={new Date(day).toLocaleDateString()}
                  >
                    <div className="text-center">{new Date(day).getDate()}</div>
                  </div>
                ))}
              </div>
            </div>

            {scheduledTasks.map((task) => {
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

              return (
                <div key={task.id} className="flex border-b border-slate-100 min-h-[44px] hover:bg-slate-50/60">
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
                            beginEditDependencies(task);
                          }}
                        >
                          Edit deps
                        </button>
                      </div>
                    </button>
                    {editingDepsForTaskId === task.id ? (
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
                              saveDependencies();
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingDepsForTaskId(null);
                              setDraftDependencyIds([]);
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
            })}
            {scheduledTasks.length > 0 ? (
              <svg
                className="absolute pointer-events-none"
                style={{ left: '300px', top: '40px', width: `${days.length * CELL_WIDTH}px`, height: `${scheduledTasks.length * 45}px` }}
                aria-hidden="true"
              >
                {dependencyLines.map((line, index) => (
                  <path key={`${line.fromId}-${line.toId}-${index}`} d={line.d} stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
                ))}
              </svg>
            ) : null}

            {scheduledTasks.length === 0 && unscheduledTasks.length === 0 ? (
              <div className="h-28 flex items-center justify-center text-sm text-slate-500">
                No tasks match the current filters.
              </div>
            ) : null}
          </div>
        </div>
        </div>
      </div>
    </main>
  );
};

export default BoardTimelineView;
