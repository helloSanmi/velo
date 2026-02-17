import React from 'react';
import { Archive, ArchiveRestore, Search } from 'lucide-react';
import { Project, Task, TaskStatus, User } from '../../types';

interface SettingsProjectsTabProps {
  currentUserRole?: User['role'];
  currentUserId: string;
  allUsers: User[];
  projectQuery: string;
  setProjectQuery: (value: string) => void;
  activeProjects: Project[];
  archivedProjects: Project[];
  completedProjects: Project[];
  deletedProjects: Project[];
  focusedProjectId: string | null;
  setFocusedProjectId: (id: string | null) => void;
  focusedProject: Project | null;
  focusedProjectTasks: Task[];
  editingProjectId: string | null;
  editingProjectName: string;
  setEditingProjectId: (id: string | null) => void;
  setEditingProjectName: (value: string) => void;
  submitProjectRename: () => void;
  onCompleteProject?: (id: string) => void;
  onReopenProject?: (id: string) => void;
  onArchiveProject?: (id: string) => void;
  onRestoreProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onPurgeProject?: (id: string) => void;
  onChangeProjectOwner?: (id: string, ownerId: string) => void;
}

const SettingsProjectsTab: React.FC<SettingsProjectsTabProps> = ({
  currentUserRole,
  currentUserId,
  allUsers,
  projectQuery,
  setProjectQuery,
  activeProjects,
  archivedProjects,
  completedProjects,
  deletedProjects,
  focusedProjectId,
  setFocusedProjectId,
  focusedProject,
  focusedProjectTasks,
  editingProjectId,
  editingProjectName,
  setEditingProjectId,
  setEditingProjectName,
  submitProjectRename,
  onCompleteProject,
  onReopenProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onPurgeProject,
  onChangeProjectOwner
}) => {
  const ownerById = new Map(allUsers.map((user) => [user.id, user]));
  const canChangeOwner = currentUserRole === 'admin';
  const canManageFocusedProject = (() => {
    if (!focusedProject) return false;
    const ownerId = focusedProject.createdBy || focusedProject.members?.[0];
    return currentUserRole === 'admin' || ownerId === currentUserId;
  })();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full min-h-0 flex flex-col">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <h3 className="text-base font-semibold text-slate-900">Project Lifecycle</h3>
        <p className="text-xs text-slate-500 mt-1">Select any project to open its full details panel.</p>
      </div>

      <label className="h-10 rounded-lg border border-slate-300 px-3 bg-white flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          value={projectQuery}
          onChange={(event) => setProjectQuery(event.target.value)}
          placeholder="Filter projects"
          className="w-full bg-transparent text-sm text-slate-700 outline-none"
        />
      </label>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-4 flex-1 min-h-0">
        <section className="border border-slate-200 rounded-xl bg-white p-3 flex flex-col min-h-0">
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[
              { title: 'Active', count: activeProjects.length },
              { title: 'Archived', count: archivedProjects.length },
              { title: 'Completed', count: completedProjects.length },
              { title: 'Deleted', count: deletedProjects.length }
            ].map((item) => (
              <div key={item.title} className="h-9 px-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{item.title}</p>
                <p className="text-xs font-semibold text-slate-900">{item.count}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-0">
            {[
              { title: 'Active', items: activeProjects, empty: 'No active projects.' },
              { title: 'Archived', items: archivedProjects, empty: 'No archived projects.' },
              { title: 'Completed', items: completedProjects, empty: 'No completed projects.' },
              { title: 'Deleted', items: deletedProjects, empty: 'No deleted projects.' }
            ].map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-1">{group.title}</p>
                {group.items.length === 0 ? (
                  <div className="h-14 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 flex items-center justify-center text-center px-3">
                    {group.empty}
                  </div>
                ) : (
                  group.items.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setFocusedProjectId(project.id)}
                      className={`w-full text-left border rounded-lg p-2.5 transition-colors ${
                        focusedProjectId === project.id ? 'border-slate-900 bg-slate-100 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${project.color} shrink-0`} />
                        <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        </section>

        {focusedProject ? (
          <section className="border border-slate-200 rounded-xl bg-white p-4 flex flex-col min-h-0 ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project details</p>
                <h4 className="text-base font-semibold text-slate-900 truncate mt-1">{focusedProject.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{focusedProject.description || 'No description.'}</p>
              </div>
              <button onClick={() => setFocusedProjectId(null)} className="h-7 px-2 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-sm font-semibold text-slate-900">{focusedProjectTasks.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <p className="text-xs text-slate-500">To do</p>
                <p className="text-sm font-semibold text-slate-900">{focusedProjectTasks.filter((task) => task.status === TaskStatus.TODO).length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <p className="text-xs text-slate-500">In progress</p>
                <p className="text-sm font-semibold text-slate-900">{focusedProjectTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                <p className="text-xs text-slate-500">Done</p>
                <p className="text-sm font-semibold text-slate-900">{focusedProjectTasks.filter((task) => task.status === TaskStatus.DONE).length}</p>
              </div>
            </div>
            <div className="mt-3 border border-slate-200 rounded-lg bg-slate-50/60 max-h-[28vh] md:max-h-[32vh] overflow-y-auto custom-scrollbar">
              {focusedProjectTasks.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">No tasks found for this project.</p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {focusedProjectTasks.map((task) => (
                    <div key={task.id} className="p-3">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {task.status.replace('-', ' ')} • {task.priority}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {focusedProject.completionComment ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] text-emerald-700 uppercase tracking-wide">Completion note</p>
                <p className="text-xs text-emerald-900 mt-1">{focusedProject.completionComment}</p>
              </div>
            ) : null}
            <div className="mt-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Project owner</p>
              {(() => {
                const ownerId = focusedProject.createdBy || focusedProject.members?.[0] || '';
                const owner = ownerById.get(ownerId);
                const ownerName = owner?.displayName || 'Unknown owner';
                if (!canChangeOwner) {
                  return (
                    <div className="h-8 px-2 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700 inline-flex items-center">
                      {ownerName}
                    </div>
                  );
                }
                return (
                  <select
                    value={ownerId}
                    onChange={(event) => onChangeProjectOwner?.(focusedProject.id, event.target.value)}
                    className="h-8 w-full md:w-auto md:min-w-[180px] rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none"
                  >
                    {allUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {canManageFocusedProject && editingProjectId === focusedProject.id ? (
                <>
                  <input
                    autoFocus
                    value={editingProjectName}
                    onChange={(event) => setEditingProjectName(event.target.value)}
                    className="h-8 w-full md:w-auto flex-1 min-w-0 md:min-w-[120px] rounded-md border border-slate-300 px-2 text-xs bg-white outline-none"
                  />
                  <button onClick={submitProjectRename} className="h-8 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700">
                    Save
                  </button>
                </>
              ) : canManageFocusedProject ? (
                <button
                  onClick={() => {
                    setEditingProjectId(focusedProject.id);
                    setEditingProjectName(focusedProject.name);
                  }}
                  className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                >
                  Rename
                </button>
              ) : null}
              {canManageFocusedProject && !focusedProject.isDeleted && !focusedProject.isArchived && !focusedProject.isCompleted && (
                <>
                  <button onClick={() => onCompleteProject?.(focusedProject.id)} className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700">
                    Complete
                  </button>
                  <button onClick={() => onArchiveProject?.(focusedProject.id)} className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 inline-flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Archive
                  </button>
                </>
              )}
              {canManageFocusedProject && focusedProject.isArchived && (
                <button onClick={() => onRestoreProject?.(focusedProject.id)} className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 inline-flex items-center gap-1">
                  <ArchiveRestore className="w-3 h-3" /> Restore
                </button>
              )}
              {canManageFocusedProject && focusedProject.isCompleted && (
                <button onClick={() => onReopenProject?.(focusedProject.id)} className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700">
                  Reopen
                </button>
              )}
              {canManageFocusedProject && !focusedProject.isDeleted ? (
                <button onClick={() => onDeleteProject?.(focusedProject.id)} className="h-7 px-2 rounded-md border border-rose-200 bg-rose-50 text-xs text-rose-700">
                  Delete
                </button>
              ) : canManageFocusedProject && focusedProject.isDeleted ? (
                <>
                  <button onClick={() => onRestoreProject?.(focusedProject.id)} className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700">
                    Restore
                  </button>
                  <button onClick={() => onPurgeProject?.(focusedProject.id)} className="h-7 px-2 rounded-md border border-rose-200 bg-rose-50 text-xs text-rose-700">
                    Purge
                  </button>
                </>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-500 bg-white flex items-center justify-center">
            <p className="text-sm">Select a project from the left list to open details.</p>
          </section>
        )}
      </div>
    </div>
  );
};

export default SettingsProjectsTab;
