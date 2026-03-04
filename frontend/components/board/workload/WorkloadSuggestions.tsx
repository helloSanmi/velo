import React from 'react';
import { WorkloadSuggestion } from './types';

interface WorkloadSuggestionsProps {
  suggestions: WorkloadSuggestion[];
  onApplySuggestion: (id: string) => void;
  onIgnoreSuggestion: (id: string) => void;
}

const WorkloadSuggestions: React.FC<WorkloadSuggestionsProps> = ({
  suggestions,
  onApplySuggestion,
  onIgnoreSuggestion
}) => {
  if (suggestions.length === 0) return null;
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-700">Auto-balance suggestions</p>
        <button
          type="button"
          className="h-7 rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-700 hover:bg-slate-100"
          onClick={() => suggestions.forEach((suggestion) => onApplySuggestion(suggestion.id))}
        >
          Apply all
        </button>
      </div>
      <div className="mt-2 space-y-1.5">
        {suggestions.slice(0, 4).map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1.5"
          >
            <p className="text-[11px] text-slate-700">
              Move <span className="font-medium">{suggestion.task.title}</span> from {suggestion.fromName} to{' '}
              {suggestion.toName}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-6 rounded border border-slate-300 bg-white px-1.5 text-[10px] text-slate-700 hover:bg-slate-50"
                onClick={() => onApplySuggestion(suggestion.id)}
              >
                Apply
              </button>
              <button
                type="button"
                className="h-6 rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-600 hover:bg-slate-50"
                onClick={() => onIgnoreSuggestion(suggestion.id)}
              >
                Ignore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkloadSuggestions;
