import React, { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Task, TaskPriority } from '../../types';
import Badge from '../ui/Badge';

interface TaskPriorityEditorProps {
  task: Task;
  canManageTask: boolean;
  onPriorityChange: (priority: TaskPriority) => void;
}

const TaskPriorityEditor: React.FC<TaskPriorityEditorProps> = ({ task, canManageTask, onPriorityChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center gap-1" ref={ref}>
      <Badge variant="amber">{task.priority.toUpperCase()}</Badge>
      {canManageTask ? (
        <>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 bg-white border border-slate-200 text-slate-500 rounded-md hover:bg-slate-100 transition-all"
            title="Edit task severity"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {isOpen ? (
            <div className="absolute top-[calc(100%+6px)] left-0 z-30 w-36 rounded-lg border border-slate-200 bg-white shadow-lg p-1.5">
              {(Object.values(TaskPriority) as TaskPriority[]).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => {
                    onPriorityChange(priority);
                    setIsOpen(false);
                  }}
                  className={`w-full h-8 px-2 rounded-md text-left text-xs transition-colors ${
                    task.priority === priority ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default TaskPriorityEditor;
