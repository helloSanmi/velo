import React from 'react';
import { Check, CheckSquare, ListChecks, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Subtask, Task } from '../../types';
import Button from '../ui/Button';

interface TaskDetailSubtasksTabProps {
  task: Task;
  newSubtaskTitle: string;
  setNewSubtaskTitle: (value: string) => void;
  onAddSubtask: (e: React.FormEvent) => void;
  onToggleSubtask: (subtaskId: string) => void;
  onRemoveSubtask: (subtaskId: string) => void;
  canManageSubtasks: boolean;
  aiEnabled: boolean;
  isGeneratingSubtasksAI: boolean;
  onGenerateSubtasksWithAI: () => void;
}

const TaskDetailSubtasksTab: React.FC<TaskDetailSubtasksTabProps> = ({
  task,
  newSubtaskTitle,
  setNewSubtaskTitle,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  canManageSubtasks,
  aiEnabled,
  isGeneratingSubtasksAI,
  onGenerateSubtasksWithAI
}) => {
  const completedSubtasks = (task.subtasks || []).filter((subtask: Subtask) => subtask.isCompleted).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-600" /> Subtasks
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Break work into small, trackable steps.</p>
        </div>
        <div className="flex items-center gap-2">
          {aiEnabled ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 px-2.5 text-xs"
              onClick={onGenerateSubtasksWithAI}
              disabled={isGeneratingSubtasksAI || !canManageSubtasks}
              title={canManageSubtasks ? 'Generate subtasks with AI' : 'Only project owner/admin can generate subtasks'}
            >
              {isGeneratingSubtasksAI ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
              AI steps
            </Button>
          ) : null}
          <div className="text-right">
            <p className="text-xl font-semibold text-slate-900">{completedSubtasks}/{task.subtasks.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">done</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 rounded-xl bg-white p-3">
        <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 h-full">
          {task.subtasks.length === 0 ? (
            <div className="h-full min-h-24 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-center px-4 text-center">
              No subtasks yet.
            </div>
          ) : (
            task.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-white">
                <button
                  onClick={() => canManageSubtasks && onToggleSubtask(subtask.id)}
                  disabled={!canManageSubtasks}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                    subtask.isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-slate-300 text-slate-400 hover:border-slate-400'
                  } ${!canManageSubtasks ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {subtask.isCompleted ? <Check className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                </button>
                <p className={`text-sm flex-1 min-w-0 truncate ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {subtask.title}
                </p>
                <button
                  onClick={() => canManageSubtasks && onRemoveSubtask(subtask.id)}
                  disabled={!canManageSubtasks}
                  className="w-7 h-7 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <form onSubmit={onAddSubtask} className="flex gap-2">
        <input
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          disabled={!canManageSubtasks}
          placeholder="Add subtask..."
          className="flex-1 h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />
        <Button type="submit" variant="secondary" className="px-3 h-10" disabled={!canManageSubtasks}>
          <Plus className="w-4 h-4" />
        </Button>
      </form>
      {!canManageSubtasks ? <p className="text-[11px] text-slate-500">Only project owner/admin can edit or generate subtasks.</p> : null}
    </div>
  );
};

export default TaskDetailSubtasksTab;
