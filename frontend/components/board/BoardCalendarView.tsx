import React, { useMemo, useState } from 'react';
import { Task } from '../../types';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';

interface BoardCalendarViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  includeUnscheduled: boolean;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

const toDayStart = (value: number) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const BoardCalendarView: React.FC<BoardCalendarViewProps> = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  includeUnscheduled,
  onSelectTask,
  onUpdateTask
}) => {
  const [zoom, setZoom] = useState<'month' | 'week' | 'day'>('month');
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const tasks = useMemo(
    () =>
      statusFilter === 'All'
        ? statusOptions.flatMap((stage) => categorizedTasks[stage.id] || [])
        : categorizedTasks[statusFilter] || [],
    [categorizedTasks, statusFilter, statusOptions]
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = toDayStart(task.dueDate);
      const existing = map.get(key) || [];
      existing.push(task);
      map.set(key, existing);
    });
    return map;
  }, [tasks]);
  const unscheduledTasks = useMemo(
    () => (includeUnscheduled ? tasks.filter((task) => !task.dueDate) : []),
    [includeUnscheduled, tasks]
  );

  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const monthEnd = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
  const leading = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const monthCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const weekStart = new Date(viewMonth);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const visibleDays = Array.from({ length: zoom === 'month' ? monthCells : zoom === 'week' ? 7 : 1 }, (_, index) => {
    if (zoom === 'month') {
      const dayOffset = index - leading;
      return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 + dayOffset);
    }
    return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
  });
  const gridCols = zoom === 'month' ? 'grid-cols-7' : zoom === 'week' ? 'grid-cols-7' : 'grid-cols-1';

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={BOARD_INNER_WRAP_CLASS}>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            {zoom === 'day'
              ? viewMonth.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5">
              {(['month', 'week', 'day'] as const).map((nextZoom) => (
                <button
                  key={nextZoom}
                  type="button"
                  onClick={() => setZoom(nextZoom)}
                  className={`h-7 rounded px-2 text-xs ${zoom === nextZoom ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {nextZoom[0].toUpperCase() + nextZoom.slice(1)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (zoom === 'month') setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
                else if (zoom === 'week') setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), viewMonth.getDate() - 7));
                else setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), viewMonth.getDate() - 1));
              }}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => {
                if (zoom === 'month') setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
                else if (zoom === 'week') setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), viewMonth.getDate() + 7));
                else setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), viewMonth.getDate() + 1));
              }}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className={`grid ${gridCols} border-b border-slate-200 bg-slate-50`}>
          {(zoom === 'day' ? ['Day'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((label) => (
            <div key={label} className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </div>
          ))}
        </div>

        <div className={`grid ${includeUnscheduled ? 'md:grid-cols-[260px_1fr]' : 'grid-cols-1'}`}>
          {includeUnscheduled ? (
            <aside
              className="border-r border-slate-200 p-2 bg-amber-50/50"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const taskId = event.dataTransfer.getData('text/task-id');
                if (!taskId) return;
                onUpdateTask(taskId, { dueDate: undefined });
              }}
            >
              <p className="text-xs font-semibold text-amber-800 mb-1">Unscheduled</p>
              <div className="space-y-1">
                {unscheduledTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/task-id', task.id)}
                    onClick={() => onSelectTask(task)}
                    className="w-full rounded border border-amber-200 bg-white px-1.5 py-1 text-left text-[11px] text-amber-800 truncate hover:bg-amber-100"
                  >
                    {task.title}
                  </button>
                ))}
                {unscheduledTasks.length === 0 ? <p className="text-[11px] text-amber-700">No unscheduled tasks.</p> : null}
              </div>
            </aside>
          ) : null}
          <div className={`grid ${gridCols}`}>
            {visibleDays.map((day) => {
            const dayTs = toDayStart(day.getTime());
            const dayTasks = tasksByDay.get(dayTs) || [];
            const inMonth = zoom !== 'month' || day.getMonth() === viewMonth.getMonth();
            return (
              <div
                key={dayTs}
                className={`min-h-[140px] border-r border-b border-slate-100 p-2 ${inMonth ? 'bg-white' : 'bg-slate-50/70'} ${zoom === 'day' ? 'min-h-[420px]' : ''}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const taskId = event.dataTransfer.getData('text/task-id');
                  if (!taskId) return;
                  onUpdateTask(taskId, { dueDate: dayTs });
                }}
              >
                <p className={`text-xs font-medium ${inMonth ? 'text-slate-700' : 'text-slate-400'}`}>{day.getDate()}</p>
                <div className="mt-1.5 space-y-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const estimateMinutes = Math.max(30, task.estimateMinutes || 240);
                    const durationDays = Math.max(1, Math.round(estimateMinutes / 480));
                    return (
                      <div
                        key={task.id}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 hover:bg-slate-100"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData('text/task-id', task.id)}
                        title={task.title}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectTask(task)}
                          className="w-full text-left text-[11px] text-slate-700 truncate"
                        >
                          {task.title}
                        </button>
                        <div className="mt-1 flex items-center justify-between gap-1">
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              className="rounded border border-slate-300 bg-white px-1 text-[10px] text-slate-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                onUpdateTask(task.id, { estimateMinutes: Math.max(30, estimateMinutes - 480) });
                              }}
                              title="Shorten duration by 1 day"
                            >
                              -d
                            </button>
                            <button
                              type="button"
                              className="rounded border border-slate-300 bg-white px-1 text-[10px] text-slate-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                onUpdateTask(task.id, { estimateMinutes: estimateMinutes + 480 });
                              }}
                              title="Extend duration by 1 day"
                            >
                              +d
                            </button>
                          </div>
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              className="rounded border border-slate-300 bg-white px-1 text-[10px] text-slate-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!task.dueDate) return;
                                onUpdateTask(task.id, { dueDate: toDayStart(task.dueDate) - 86400000 });
                              }}
                              title="Move end date 1 day earlier"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              className="rounded border border-slate-300 bg-white px-1 text-[10px] text-slate-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!task.dueDate) return;
                                onUpdateTask(task.id, { dueDate: toDayStart(task.dueDate) + 86400000 });
                              }}
                              title="Move end date 1 day later"
                            >
                              →
                            </button>
                          </div>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-500">{durationDays}d</p>
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 ? (
                    <p className="text-[11px] text-slate-500">+{dayTasks.length - 3} more</p>
                  ) : null}
                </div>
              </div>
            );
            })}
          </div>
        </div>
        </div>
      </div>
    </main>
  );
};

export default BoardCalendarView;
