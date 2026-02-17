import React from 'react';
import { StatusFilter } from './types';

interface ProjectsLifecycleHeaderProps {
  counts: { all: number; active: number; archived: number; completed: number; deleted: number };
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
}

const ProjectsLifecycleHeader: React.FC<ProjectsLifecycleHeaderProps> = ({ counts, statusFilter, setStatusFilter }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
      <h2 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900">Projects</h2>
      <p className="text-xs md:text-sm text-slate-600 mt-1">Simple lifecycle management with clear project details and task history.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { key: 'All', label: `All (${counts.all})` },
          { key: 'Active', label: `Active (${counts.active})` },
          { key: 'Archived', label: `Archived (${counts.archived})` },
          { key: 'Completed', label: `Completed (${counts.completed})` },
          { key: 'Deleted', label: `Deleted (${counts.deleted})` }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setStatusFilter(item.key as StatusFilter)}
            className={`h-10 md:h-8 px-3 rounded-lg border text-sm md:text-xs font-medium transition-colors ${
              statusFilter === item.key
                ? 'bg-slate-900 text-white border-slate-900'
                : item.key === 'Active'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : item.key === 'Completed'
                    ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                    : item.key === 'Archived'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : item.key === 'Deleted'
                        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProjectsLifecycleHeader;
