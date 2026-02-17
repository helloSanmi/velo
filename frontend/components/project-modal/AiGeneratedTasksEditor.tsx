import React from 'react';
import { AiTaskDraft } from './types';

interface AiGeneratedTasksEditorProps {
  tasks: AiTaskDraft[];
  onRegenerate: () => void;
  onUpdateTask: (index: number, updates: Partial<AiTaskDraft>) => void;
  onRemoveTask: (index: number) => void;
}

const AiGeneratedTasksEditor: React.FC<AiGeneratedTasksEditorProps> = ({
  tasks,
  onRegenerate,
  onUpdateTask,
  onRemoveTask
}) => {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs text-slate-500">AI generated tasks ({tasks.length})</label>
        <button type="button" onClick={onRegenerate} className="text-xs text-slate-600 hover:text-slate-900">
          Regenerate
        </button>
      </div>
      <div className="max-h-[240px] overflow-y-auto custom-scrollbar space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
        {tasks.map((task, index) => (
          <div key={`${task.title}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <input
                value={task.title}
                onChange={(event) => onUpdateTask(index, { title: event.target.value })}
                className="flex-1 h-9 rounded-md border border-slate-300 px-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Task title"
              />
              <button type="button" onClick={() => onRemoveTask(index)} className="h-9 px-2 rounded-md text-xs text-slate-600 hover:bg-slate-100">
                Remove
              </button>
            </div>
            <textarea
              value={task.description}
              onChange={(event) => onUpdateTask(index, { description: event.target.value })}
              className="w-full min-h-[60px] rounded-md border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Task description"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiGeneratedTasksEditor;
