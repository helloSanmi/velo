import React from 'react';
import { Check, Circle, GripVertical, PlusCircle } from 'lucide-react';
import { Task } from '../../types';

interface ChecklistTaskCardProps {
  task: Task;
  isCompact: boolean;
  userMap: Map<string, string>;
  draftSubtask: string;
  onSelectTask: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onDraftSubtaskChange: (taskId: string, value: string) => void;
  onAddSubtask: (task: Task) => void;
}

const ChecklistTaskCard: React.FC<ChecklistTaskCardProps> = ({
  task,
  isCompact,
  userMap,
  draftSubtask,
  onSelectTask,
  onToggleSubtask,
  onDraftSubtaskChange,
  onAddSubtask
}) => {
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.isCompleted).length;
  const assigneeIds = task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
  const dueLabel = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;
  const visibleSubtasks = isCompact ? 8 : 5;

  return (
    <article
      data-task-id={task.id}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('taskId', task.id);
      }}
      className={`rounded-xl border border-slate-200 bg-white ${isCompact ? 'p-2.5 space-y-2' : 'p-3 space-y-3'}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('taskId', task.id);
          }}
          className="mt-0.5 w-5 h-5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 inline-flex items-center justify-center cursor-grab active:cursor-grabbing"
          title="Drag task"
        >
          <GripVertical className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => onSelectTask(task)} className="flex-1 min-w-0 text-left">
          <h4 className={`${isCompact ? 'text-[13px]' : 'text-sm'} font-semibold text-slate-900 truncate`}>{task.title}</h4>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>
          {completedSubtasks}/{subtasks.length} complete
        </span>
        <div className="flex items-center gap-1.5 min-w-0">
          {dueLabel ? <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 truncate">Due {dueLabel}</span> : null}
          {assigneeIds.length ? (
            <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 truncate max-w-[160px]">
              {assigneeIds
                .map((id) => userMap.get(id))
                .filter((name): name is string => Boolean(name))
                .join(', ') || 'Assigned'}
            </span>
          ) : null}
        </div>
      </div>

      <div className={isCompact ? 'space-y-1' : 'space-y-1.5'}>
        {subtasks.slice(0, visibleSubtasks).map((subtask) => (
          <button
            key={subtask.id}
            type="button"
            onClick={() => onToggleSubtask(task, subtask.id)}
            className={`w-full flex items-start gap-2 text-left rounded-md ${isCompact ? 'px-1 py-0.5' : 'px-1.5 py-1'} hover:bg-slate-50`}
          >
            <span
              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${
                subtask.isCompleted ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'border-slate-300 text-transparent'
              }`}
            >
              {subtask.isCompleted ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
            </span>
            <span className={`${isCompact ? 'text-[11px]' : 'text-xs'} ${subtask.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {subtask.title}
            </span>
          </button>
        ))}
        {subtasks.length > visibleSubtasks ? (
          <p className="px-1.5 text-[11px] text-slate-500">+{subtasks.length - visibleSubtasks} more subtasks</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={draftSubtask}
          onChange={(event) => onDraftSubtaskChange(task.id, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAddSubtask(task);
            }
          }}
          placeholder="Add subtask"
          className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <button
          type="button"
          onClick={() => onAddSubtask(task)}
          className="h-8 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1 text-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </article>
  );
};

export default ChecklistTaskCard;
