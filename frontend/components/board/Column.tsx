import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Task } from '../../types';
import TaskItem from '../TaskItem';

interface ColumnProps {
  title: string;
  status: string;
  icon: React.ReactNode;
  colorClass: string;
  tasks: Task[];
  selectedTaskIds?: string[];
  onToggleTaskSelection?: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onMoveTask: (taskId: string, targetStatus: string, targetTaskId?: string) => void;
  onAIAssist: (task: Task) => void;
  onSelectTask: (task: Task) => void;
  onAddNewTask: () => void;
  showAddButton?: boolean;
  readOnly?: boolean;
  onToggleTimer?: (id: string) => void;
  canDeleteTask?: (taskId: string) => boolean;
  canUseTaskAI?: (taskId: string) => boolean;
  canToggleTaskTimer?: (taskId: string) => boolean;
  showProjectName?: boolean;
  className?: string;
}

const Column: React.FC<ColumnProps> = ({
  title,
  status,
  icon,
  tasks,
  selectedTaskIds = [],
  onToggleTaskSelection,
  onDeleteTask,
  onUpdateStatus,
  onMoveTask,
  onAIAssist,
  onSelectTask,
  onAddNewTask,
  showAddButton = true,
  readOnly = false,
  onToggleTimer,
  canDeleteTask,
  canUseTaskAI,
  canToggleTaskTimer,
  showProjectName = true,
  className = ''
}) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const taskElement = element?.closest('[data-task-id]');
    const targetTaskId = taskElement?.getAttribute('data-task-id') || undefined;
    onMoveTask(taskId, status, targetTaskId);
  };

  return (
    <section
      className={`h-full min-h-0 bg-slate-100 border rounded-xl flex flex-col transition-colors ${
        isOver ? 'border-slate-400 bg-slate-100' : 'border-slate-200'
      } ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm text-slate-800 truncate">
              <span className="font-semibold">{title}:</span>{' '}
              <span className="font-normal">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
            </h3>
          </div>
        </div>

        {showAddButton ? (
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

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2.5 space-y-2.5">
        {tasks.length === 0 && (
          <div className="h-full min-h-[180px] border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-500 bg-white">
            Drop tasks here
          </div>
        )}

        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            showProjectName={showProjectName}
            isSelected={selectedTaskIds.includes(task.id)}
            onToggleSelection={onToggleTaskSelection}
            onDelete={onDeleteTask}
            onUpdateStatus={onUpdateStatus}
            onAIAssist={onAIAssist}
            onSelect={onSelectTask}
            readOnly={readOnly}
            onToggleTimer={onToggleTimer}
            canDelete={canDeleteTask ? canDeleteTask(task.id) : true}
            canUseAIAssist={canUseTaskAI ? canUseTaskAI(task.id) : true}
            canToggleTimer={canToggleTaskTimer ? canToggleTaskTimer(task.id) : true}
          />
        ))}
      </div>
    </section>
  );
};

export default Column;
