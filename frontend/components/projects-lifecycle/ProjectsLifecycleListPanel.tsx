import React from 'react';
import { Search } from 'lucide-react';
import { Project, Task } from '../../types';
import { getProjectStatus, getStatusStyles } from './types';

interface ProjectsLifecycleListPanelProps {
  filteredProjects: Project[];
  projectTasks: Task[];
  selectedProjectIds: string[];
  focusedProjectId: string | null;
  query: string;
  setQuery: (value: string) => void;
  setFocusedProjectId: (id: string) => void;
  toggleProjectSelection: (id: string) => void;
  onBulkLifecycleAction: (action: 'archive' | 'complete' | 'delete' | 'restore', ids: string[]) => void;
  canDeleteProject: (id: string) => boolean;
  clearSelection: () => void;
  activeProjectId: string | null;
}

const ProjectsLifecycleListPanel: React.FC<ProjectsLifecycleListPanelProps> = ({
  filteredProjects,
  projectTasks,
  selectedProjectIds,
  focusedProjectId,
  query,
  setQuery,
  setFocusedProjectId,
  toggleProjectSelection,
  onBulkLifecycleAction,
  canDeleteProject,
  clearSelection,
  activeProjectId
}) => {
  const selectedDeletableIds = selectedProjectIds.filter((id) => canDeleteProject(id));

  return (
    <section className="border border-slate-200 rounded-xl bg-white p-3 flex flex-col min-h-0">
      {selectedProjectIds.length > 0 && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2 flex flex-wrap gap-2">
          <span className="text-xs text-slate-600 px-1">{selectedProjectIds.length} selected</span>
          <button onClick={() => onBulkLifecycleAction('archive', selectedProjectIds)} className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white text-sm md:text-xs text-slate-700">Archive</button>
          <button onClick={() => onBulkLifecycleAction('complete', selectedProjectIds)} className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white text-sm md:text-xs text-slate-700">Complete</button>
          {selectedDeletableIds.length > 0 && (
            <button onClick={() => onBulkLifecycleAction('delete', selectedDeletableIds)} className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-rose-200 bg-rose-50 text-sm md:text-xs text-rose-700">Delete</button>
          )}
          <button onClick={() => onBulkLifecycleAction('restore', selectedProjectIds)} className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white text-sm md:text-xs text-slate-700">Restore</button>
          <button onClick={clearSelection} className="h-9 md:h-7 px-3 md:px-2 rounded-md border border-slate-200 bg-white text-sm md:text-xs text-slate-700">Clear</button>
        </div>
      )}
      <label className="h-10 rounded-lg border border-slate-300 px-3 bg-white flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects"
          className="w-full bg-transparent text-sm text-slate-700 outline-none"
        />
      </label>

      <div className="space-y-2 md:overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-0">
        {filteredProjects.length === 0 ? (
          <div className="h-20 border border-dashed border-slate-200 rounded-lg text-sm text-slate-500 flex items-center justify-center text-center px-3">
            No projects found.
          </div>
        ) : (
          filteredProjects.map((project) => {
            const status = getProjectStatus(project);
            return (
              <button
                key={project.id}
                onClick={() => setFocusedProjectId(project.id)}
                className={`w-full text-left border rounded-lg p-3.5 md:p-3 transition-colors min-h-[86px] md:min-h-0 ${
                  focusedProjectId === project.id ? 'border-slate-900 bg-slate-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedProjectIds.includes(project.id)}
                    onChange={(event) => {
                      event.stopPropagation();
                      toggleProjectSelection(project.id);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-slate-300"
                  />
                  <div className={`w-3 h-3 rounded-full ${project.color} shrink-0 ${activeProjectId === project.id ? 'active-node ring-1 ring-[#76003f]/15 ring-offset-0' : ''}`} />
                  <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs md:text-[11px] px-2 py-1 md:py-0.5 rounded-md border ${getStatusStyles(status)}`}>{status}</span>
                  <span className="text-[11px] text-slate-500">{projectTasks.filter((task) => task.projectId === project.id).length} tasks</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

export default ProjectsLifecycleListPanel;
