import React from 'react';
import { Task } from '../../../types';
import { toDayStart } from './shared';

interface CalendarDayCellProps {
  day: Date;
  inMonth: boolean;
  zoom: 'month' | 'week' | 'day';
  dayTasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  day,
  inMonth,
  zoom,
  dayTasks,
  onSelectTask,
  onUpdateTask
}) => {
  const dayTs = toDayStart(day.getTime());
  return (
    <div
      className={`min-h-[140px] border-r border-b border-slate-100 p-2 ${inMonth ? 'bg-white' : 'bg-slate-50/70'} ${
        zoom === 'day' ? 'min-h-[420px]' : ''
      }`}
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
        {dayTasks.length > 3 ? <p className="text-[11px] text-slate-500">+{dayTasks.length - 3} more</p> : null}
      </div>
    </div>
  );
};

export default CalendarDayCell;
