import React from 'react';

interface ProjectsLifecycleStatsGridProps {
  focusedProjectStats: {
    total: number;
    done: number;
    backlog: number;
    inProgress: number;
  } | null;
}

const ProjectsLifecycleStatsGrid: React.FC<ProjectsLifecycleStatsGridProps> = ({ focusedProjectStats }) => {
  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
      <div className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
        <p className="text-[11px] text-slate-500">Total</p>
        <p className="text-base font-semibold text-slate-900">{focusedProjectStats?.total || 0}</p>
      </div>
      <div className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
        <p className="text-[11px] text-slate-500">Backlog</p>
        <p className="text-base font-semibold text-slate-900">{focusedProjectStats?.backlog || 0}</p>
      </div>
      <div className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
        <p className="text-[11px] text-slate-500">In progress</p>
        <p className="text-base font-semibold text-slate-900">{focusedProjectStats?.inProgress || 0}</p>
      </div>
      <div className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
        <p className="text-[11px] text-slate-500">Done</p>
        <p className="text-base font-semibold text-slate-900">{focusedProjectStats?.done || 0}</p>
      </div>
    </div>
  );
};

export default ProjectsLifecycleStatsGrid;
