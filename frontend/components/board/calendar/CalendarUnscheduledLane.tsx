import React from 'react';
import { Task } from '../../../types';

interface CalendarUnscheduledLaneProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUnscheduleTask: (taskId: string) => void;
}

const CalendarUnscheduledLane: React.FC<CalendarUnscheduledLaneProps> = ({ tasks, onSelectTask, onUnscheduleTask }) => (
  <aside
    className="border-r border-slate-200 p-2 bg-amber-50/50"
    onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => {
      const taskId = event.dataTransfer.getData('text/task-id');
      if (!taskId) return;
      onUnscheduleTask(taskId);
    }}
  >
    <p className="text-xs font-semibold text-amber-800 mb-1">Unscheduled</p>
    <div className="space-y-1">
      {tasks.map((task) => (
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
      {tasks.length === 0 ? <p className="text-[11px] text-amber-700">No unscheduled tasks.</p> : null}
    </div>
  </aside>
);

export default CalendarUnscheduledLane;
