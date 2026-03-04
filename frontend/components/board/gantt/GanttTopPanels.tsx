import React from 'react';
import { Task } from '../../../types';

interface GanttTopPanelsProps {
  tasksCount: number;
  dependencyView: 'focused' | 'all' | 'off';
  rangeDays: 15 | 30 | 45 | 60;
  focusedTaskId: string | null;
  unscheduledTasks: Task[];
  onDependencyViewChange: (value: 'focused' | 'all' | 'off') => void;
  onRangeDaysChange: (value: 15 | 30 | 45 | 60) => void;
  onClearFocused: () => void;
  onSelectTask: (task: Task) => void;
  onUnscheduledDragStart: (event: React.DragEvent<HTMLButtonElement>, taskId: string) => void;
  onUnscheduledDragEnd: () => void;
}

const GanttTopPanels: React.FC<GanttTopPanelsProps> = ({
  tasksCount,
  dependencyView,
  rangeDays,
  focusedTaskId,
  unscheduledTasks,
  onDependencyViewChange,
  onRangeDaysChange,
  onClearFocused,
  onSelectTask,
  onUnscheduledDragStart,
  onUnscheduledDragEnd
}) => {
  return (
    <>
      <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">Gantt chart</p>
          <p className="text-xs text-slate-500">{tasksCount} tasks</p>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-slate-500">Dependencies</span>
          <select
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
            value={dependencyView}
            onChange={(event) => onDependencyViewChange(event.target.value as 'focused' | 'all' | 'off')}
          >
            <option value="focused">Focused</option>
            <option value="all">All</option>
            <option value="off">Off</option>
          </select>
          <span className="text-xs text-slate-500">Range</span>
          <select
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
            value={rangeDays}
            onChange={(event) => onRangeDaysChange(Number(event.target.value) as 15 | 30 | 45 | 60)}
          >
            <option value={15}>15 days</option>
            <option value={30}>30 days</option>
            <option value={45}>45 days</option>
            <option value={60}>60 days</option>
          </select>
        </div>
      </div>
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">
            <span className="inline-block h-2 w-2 rounded bg-indigo-300" />
            Bar = scheduled duration
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">Drag bar = move</span>
          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">Drag handles = resize</span>
          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">Deps button = edit dependencies</span>
          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />
            Dependency on-track
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-rose-500" />
            Dependency blocked risk
          </span>
          {focusedTaskId ? (
            <button
              type="button"
              className="inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-indigo-700 hover:bg-indigo-100"
              onClick={onClearFocused}
            >
              Focused task selected · Clear
            </button>
          ) : null}
        </div>
      </div>

      {unscheduledTasks.length > 0 ? (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[11px] font-medium text-amber-800 mb-1">Unscheduled tasks</p>
          <p className="text-[11px] text-amber-700 mb-2">Drag a task chip onto the timeline to schedule it on that date.</p>
          <div className="flex flex-wrap gap-1.5">
            {unscheduledTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                draggable
                onDragStart={(event) => onUnscheduledDragStart(event, task.id)}
                onDragEnd={onUnscheduledDragEnd}
                className="rounded border border-amber-200 bg-white px-2 py-1 text-[11px] text-amber-800 hover:bg-amber-100"
                onClick={() => onSelectTask(task)}
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default GanttTopPanels;
