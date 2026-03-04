import React from 'react';
import { Task, User } from '../../types';
import Button from '../ui/Button';
import { WorkloadSuggestion } from './types';

interface WorkloadSuggestionsProps {
  suggestions: WorkloadSuggestion[];
  tasks: Task[];
  users: User[];
  onApply: (item: WorkloadSuggestion) => void;
}

const WorkloadSuggestions: React.FC<WorkloadSuggestionsProps> = ({ suggestions, tasks, users, onApply }) => {
  if (!suggestions.length) return null;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">AI Suggestions</h3>
      <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
        {suggestions.map((item, idx) => {
          const task = tasks.find((taskItem) => taskItem.id === item.taskId);
          const from = users.find((user) => user.id === item.fromUserId);
          const to = users.find((user) => user.id === item.toUserId);

          return (
            <div key={idx} className="border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm text-slate-900">
                  Move <span className="font-medium">{task?.title || 'Task'}</span> from {from?.displayName || 'Unknown'} to {to?.displayName || 'Unknown'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
              </div>
              <Button size="sm" onClick={() => onApply(item)}>Apply</Button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WorkloadSuggestions;
