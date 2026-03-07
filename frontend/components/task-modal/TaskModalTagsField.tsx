import React from 'react';
import { Hash, Loader2, Sparkles } from 'lucide-react';

interface TaskModalTagsFieldProps {
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onTagInputKeyDown: (event: React.KeyboardEvent) => void;
  tags: string[];
  onRemoveTag: (tag: string) => void;
  onSuggestTags: () => void;
  isSuggestingTags: boolean;
  suggestLabel?: string;
}

const TaskModalTagsField: React.FC<TaskModalTagsFieldProps> = ({
  tagInput,
  onTagInputChange,
  onTagInputKeyDown,
  tags,
  onRemoveTag,
  onSuggestTags,
  isSuggestingTags,
  suggestLabel
}) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="block text-xs text-slate-500">Tags</label>
      <button type="button" onClick={onSuggestTags} className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
        {isSuggestingTags ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} {suggestLabel || 'Suggest'}
      </button>
    </div>
    <div className="relative">
      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        value={tagInput}
        onChange={(e) => onTagInputChange(e.target.value)}
        onKeyDown={onTagInputKeyDown}
        placeholder="Press Enter to add"
        className="w-full h-10 rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
      />
    </div>
    {tags.length > 0 ? (
      <div className="mt-2 max-h-20 overflow-y-auto custom-scrollbar pr-1 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button key={tag} type="button" onClick={() => onRemoveTag(tag)} className="px-2 py-1 rounded-md text-xs border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100">
            {tag} ×
          </button>
        ))}
      </div>
    ) : null}
  </div>
);

export default TaskModalTagsField;
