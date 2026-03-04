import React, { useMemo, useState } from 'react';
import { Task } from '../../types';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';
import CalendarDayCell from './calendar/CalendarDayCell';
import CalendarHeader from './calendar/CalendarHeader';
import CalendarUnscheduledLane from './calendar/CalendarUnscheduledLane';
import { toDayStart } from './calendar/shared';

interface BoardCalendarViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  includeUnscheduled: boolean;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

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
  const weekLabels = zoom === 'day' ? ['Day'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goPrev = () => {
    if (zoom === 'month') setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
    else if (zoom === 'week') setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), viewMonth.getDate() - 7));
    else setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), viewMonth.getDate() - 1));
  };

  const goNext = () => {
    if (zoom === 'month') setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
    else if (zoom === 'week') setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), viewMonth.getDate() + 7));
    else setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), viewMonth.getDate() + 1));
  };

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={BOARD_INNER_WRAP_CLASS}>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <CalendarHeader zoom={zoom} viewDate={viewMonth} onZoomChange={setZoom} onPrev={goPrev} onNext={goNext} />

          <div className={`grid ${gridCols} border-b border-slate-200 bg-slate-50`}>
            {weekLabels.map((label) => (
            <div key={label} className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </div>
            ))}
          </div>

          <div className={`grid ${includeUnscheduled ? 'md:grid-cols-[260px_1fr]' : 'grid-cols-1'}`}>
            {includeUnscheduled ? (
              <CalendarUnscheduledLane
                tasks={unscheduledTasks}
                onSelectTask={onSelectTask}
                onUnscheduleTask={(taskId) => onUpdateTask(taskId, { dueDate: undefined })}
              />
            ) : null}
            <div className={`grid ${gridCols}`}>
            {visibleDays.map((day) => {
              const dayTs = toDayStart(day.getTime());
              const dayTasks = tasksByDay.get(dayTs) || [];
              const inMonth = zoom !== 'month' || day.getMonth() === viewMonth.getMonth();
              return (
                <CalendarDayCell
                  key={dayTs}
                  day={day}
                  inMonth={inMonth}
                  zoom={zoom}
                  dayTasks={dayTasks}
                  onSelectTask={onSelectTask}
                  onUpdateTask={onUpdateTask}
                />
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
