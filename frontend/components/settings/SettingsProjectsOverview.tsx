import React from 'react';
import { Project } from '../../types';

interface SettingsProjectsOverviewProps {
  activeProjects: Project[];
  archivedProjects: Project[];
  completedProjects: Project[];
  deletedProjects: Project[];
  focusedProjectId: string | null;
  onSelectProject: (id: string) => void;
}

const SettingsProjectsOverview: React.FC<SettingsProjectsOverviewProps> = ({
  activeProjects,
  archivedProjects,
  completedProjects,
  deletedProjects,
  focusedProjectId,
  onSelectProject
}) => (
  <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-3">
    <div className="mb-2 grid grid-cols-2 gap-2">
      {[
        { title: 'Active', count: activeProjects.length },
        { title: 'Archived', count: archivedProjects.length },
        { title: 'Completed', count: completedProjects.length },
        { title: 'Deleted', count: deletedProjects.length }
      ].map((item) => (
        <div key={item.title} className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{item.title}</p>
          <p className="text-xs font-semibold text-slate-900">{item.count}</p>
        </div>
      ))}
    </div>
    <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      {[
        { title: 'Active', items: activeProjects, empty: 'No active projects.' },
        { title: 'Archived', items: archivedProjects, empty: 'No archived projects.' },
        { title: 'Completed', items: completedProjects, empty: 'No completed projects.' },
        { title: 'Deleted', items: deletedProjects, empty: 'No deleted projects.' }
      ].map((group) => (
        <div key={group.title} className="space-y-1.5">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</p>
          {group.items.length === 0 ? (
            <div className="flex h-14 items-center justify-center rounded-lg border border-dashed border-slate-200 px-3 text-center text-xs text-slate-500">
              {group.empty}
            </div>
          ) : (
            group.items.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                  focusedProjectId === project.id ? 'border-slate-900 bg-slate-100 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${project.color}`} />
                  <p className="truncate text-sm font-medium text-slate-900">{project.name}</p>
                </div>
              </button>
            ))
          )}
        </div>
      ))}
    </div>
  </section>
);

export default SettingsProjectsOverview;
