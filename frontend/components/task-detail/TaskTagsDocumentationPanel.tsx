import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Task } from '../../types';
import Button from '../ui/Button';
import { TASK_SECTION_SHELL, TASK_SECTION_TITLE } from './taskDetailStyles';

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
  const [showAddTag, setShowAddTag] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const tags = task.tags || [];
  const visibleTags = showAllTags ? tags : tags.slice(0, 4);
  const hiddenCount = Math.max(0, tags.length - visibleTags.length);

  const addTag = () => {
    const next = newTag.trim();
    if (!next || tags.includes(next)) return;
    onUpdate(task.id, { tags: [...tags, next] });
    setNewTag('');
    setShowAddTag(false);
  };

  return (
    <div className={`${TASK_SECTION_SHELL} mt-1`}>
      <h4 className={`${TASK_SECTION_TITLE} mb-1`}>Details</h4>
      {canManageTask ? (
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => {
            if (description !== task.description) {
              onUpdate(task.id, { description });
            }
          }}
          className="w-full bg-white border border-slate-100 rounded-md p-2.5 text-sm h-24 outline-none focus:ring-2 focus:ring-slate-300 transition-all resize-none font-medium mb-1.5"
        />
      ) : (
        <div className="max-h-24 overflow-y-auto custom-scrollbar pr-1 rounded-md border border-slate-100 bg-white p-2.5 mb-1.5">
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {task.description || 'No details provided.'}
          </p>
        </div>
      )}

      <div className="rounded-md border border-slate-100 bg-white p-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className={TASK_SECTION_TITLE}>Tags</h4>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              {task.tags?.length || 0} {(task.tags?.length || 0) === 1 ? 'tag' : 'tags'}
            </span>
            {canManageTask ? (
              <button
                type="button"
                className="h-6 rounded-md border border-slate-200 px-2 text-[11px] text-slate-700 hover:bg-slate-50"
                onClick={() => setShowAddTag((prev) => !prev)}
              >
                {showAddTag ? 'Hide' : 'Add tag'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 custom-scrollbar">
          {tags.length === 0 ? (
            <p className="text-[11px] text-slate-500">No tags yet.</p>
          ) : (
            visibleTags.map((tag) => (
              <span key={tag} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-100 bg-slate-50/40 px-2 py-0.5 text-[11px] text-slate-700">
                {tag}
                {canManageTask ? (
                  <button
                    type="button"
                    onClick={() => onUpdate(task.id, { tags: tags.filter((item) => item !== tag) })}
                    className="text-slate-500 hover:text-slate-700"
                    title="Remove tag"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : null}
              </span>
            ))
          )}
          {hiddenCount > 0 ? (
            <button
              type="button"
              className="inline-flex h-6 shrink-0 items-center rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 hover:bg-slate-50"
              onClick={() => setShowAllTags(true)}
            >
              +{hiddenCount}
            </button>
          ) : null}
          {showAllTags && tags.length > 4 ? (
            <button
              type="button"
              className="inline-flex h-6 shrink-0 items-center rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 hover:bg-slate-50"
              onClick={() => setShowAllTags(false)}
            >
              Collapse
            </button>
          ) : null}
        </div>

        {canManageTask && showAddTag ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                addTag();
              }}
              className="h-7 flex-1 rounded-md border border-slate-300 px-2 text-[11px] outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Add tag"
            />
            <Button type="button" variant="secondary" className="h-7 px-2.5 text-[11px]" onClick={addTag}>
              Add
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TaskTagsDocumentationPanel;
