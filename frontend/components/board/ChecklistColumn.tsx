import React from 'react';
import { Plus } from 'lucide-react';
import { Task } from '../../types';
import { BOARD_SCROLL_COLUMN_WIDTH_CLASS } from './layout';
import ChecklistTaskCard from './ChecklistTaskCard';

interface ChecklistColumnProps {
  id: string;
  title: string;
  index: number;
  tasks: Task[];
  isCompact: boolean;
  singleColumn: boolean;
  shouldStretchColumns: boolean;
  dragOverStatus: string | null;
  userMap: Map<string, string>;
  draftSubtaskByTaskId: Record<string, string>;
  onSetDragOverStatus: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectTask: (task: Task) => void;
  onMoveTask: (taskId: string, targetStatus: string, targetTaskId?: string) => void;
  onAddNewTask: () => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onDraftSubtaskChange: (taskId: string, value: string) => void;
  onAddSubtask: (task: Task) => void;
}

const ChecklistColumn: React.FC<ChecklistColumnProps> = ({
  id,
  title,
  index,
  tasks,
  isCompact,
  singleColumn,
  shouldStretchColumns,
  dragOverStatus,
  userMap,
  draftSubtaskByTaskId,
  onSetDragOverStatus,
  onSelectTask,
  onMoveTask,
  onAddNewTask,
  onToggleSubtask,
  onDraftSubtaskChange,
  onAddSubtask
}) => (
  <section
    className={`h-full min-h-0 bg-slate-100 border rounded-xl flex flex-col transition-colors ${
      dragOverStatus === id ? 'border-slate-400 bg-slate-100' : 'border-slate-200'
    } ${singleColumn ? '' : shouldStretchColumns ? 'w-[300px] sm:w-[320px] flex-shrink-0 snap-start md:w-full md:min-w-0' : BOARD_SCROLL_COLUMN_WIDTH_CLASS}`}
    onDragOver={(event) => {
      event.preventDefault();
      onSetDragOverStatus(id);
    }}
    onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        onSetDragOverStatus((current) => (current === id ? null : current));
      }
    }}
    onDrop={(event) => {
      event.preventDefault();
      onSetDragOverStatus(null);
      const taskId = event.dataTransfer.getData('taskId');
      if (!taskId) return;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const taskElement = element?.closest('[data-task-id]');
      const targetTaskId = taskElement?.getAttribute('data-task-id') || undefined;
      onMoveTask(taskId, id, targetTaskId);
    }}
  >
    <header className={`${isCompact ? 'px-2.5 py-2' : 'px-3 py-2.5'} border-b border-slate-200 flex items-center justify-between`}>
      <h3 className="text-sm text-slate-800 truncate">
        <span className="font-semibold">{title}:</span> <span className="font-normal">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
      </h3>
      {index === 0 ? (
        <button
          onClick={onAddNewTask}
          className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center"
          title="Add task"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="w-7 h-7" aria-hidden />
      )}
    </header>

    <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${isCompact ? 'p-2 space-y-2' : 'p-2.5 space-y-2.5'}`}>
      {tasks.length === 0 ? (
        <div className="h-full min-h-[160px] border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-500 bg-white">
          No tasks
        </div>
      ) : null}

      {tasks.map((task) => (
        <ChecklistTaskCard
          key={task.id}
          task={task}
          isCompact={isCompact}
          userMap={userMap}
          draftSubtask={draftSubtaskByTaskId[task.id] || ''}
          onSelectTask={onSelectTask}
          onToggleSubtask={onToggleSubtask}
          onDraftSubtaskChange={onDraftSubtaskChange}
          onAddSubtask={onAddSubtask}
        />
      ))}
    </div>
  </section>
);

export default ChecklistColumn;
