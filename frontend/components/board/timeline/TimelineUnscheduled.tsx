import React from 'react';
import { Task } from '../../../types';

interface TimelineUnscheduledProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

const TimelineUnscheduled: React.FC<TimelineUnscheduledProps> = ({ tasks, onSelectTask }) => {
  if (tasks.length === 0) return null;
  return (
    <div className="border-b border-slate-200 px-3 py-2 bg-amber-50">
      <p className="text-xs font-medium text-amber-800 mb-1">Unscheduled tasks</p>
      <div className="flex flex-wrap gap-1.5">
        {tasks.map((task) => (
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
  );
};

export default TimelineUnscheduled;
