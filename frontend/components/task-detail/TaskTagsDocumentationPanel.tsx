import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Task } from '../../types';
import Button from '../ui/Button';

interface TaskTagsDocumentationPanelProps {
  task: Task;
  description: string;
  setDescription: (value: string) => void;
  canManageTask: boolean;
  onUpdate: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

const TaskTagsDocumentationPanel: React.FC<TaskTagsDocumentationPanelProps> = ({
  task,
  description,
  setDescription,
  canManageTask,
  onUpdate
}) => {
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    const next = newTag.trim();
    if (!next || (task.tags || []).includes(next)) return;
    onUpdate(task.id, { tags: [...(task.tags || []), next] });
    setNewTag('');
  };

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tags</h4>
          <span className="text-[11px] text-slate-500">
            {task.tags?.length || 0} {(task.tags?.length || 0) === 1 ? 'tag' : 'tags'}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {(task.tags || []).length === 0 ? (
            <p className="text-[12px] text-slate-500">No tags yet.</p>
          ) : (
            (task.tags || []).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
                {tag}
                {canManageTask ? (
                  <button
                    type="button"
                    onClick={() => onUpdate(task.id, { tags: (task.tags || []).filter((item) => item !== tag) })}
                    className="text-slate-500 hover:text-slate-700"
                    title="Remove tag"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : null}
              </span>
            ))
          )}
        </div>

        {canManageTask ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addTag();
              }}
              className="h-8 flex-1 rounded-md border border-slate-300 px-2 text-xs outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Add tag"
            />
            <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={addTag}>
              Add
            </Button>
          </div>
        ) : null}
      </div>

      <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Documentation</h4>
      {canManageTask ? (
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => {
            if (description !== task.description) {
              onUpdate(task.id, { description });
            }
          }}
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm h-28 outline-none focus:ring-2 focus:ring-slate-300 transition-all resize-none font-medium"
        />
      ) : (
        <div className="max-h-28 overflow-y-auto custom-scrollbar pr-1">
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {task.description || 'No documentation provided.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskTagsDocumentationPanel;
