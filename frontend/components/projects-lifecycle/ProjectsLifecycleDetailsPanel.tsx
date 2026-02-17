import React, { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Trash2, X } from 'lucide-react';
import { Project, Task, User } from '../../types';
import DateInputField from '../ui/DateInputField';

type EditSection = 'timeline' | 'budget' | 'scope' | 'owners' | null;

interface ProjectsLifecycleDetailsPanelProps {
  currentUserRole?: 'admin' | 'member' | 'guest';
  allUsers: User[];
  canManageProject: boolean;
  focusedProject: Project;
  focusedProjectTasks: Task[];
  focusedProjectStats: {
    total: number;
    done: number;
    backlog: number;
    inProgress: number;
    completionRate: number;
    estimatedSpent?: number;
    trackedHours?: number;
    scopeGap?: number;
  } | null;
  projectStatus: string;
  editingProjectId: string | null;
  editingProjectName: string;
  setEditingProjectId: (id: string | null) => void;
  setEditingProjectName: (name: string) => void;
  submitProjectRename: () => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onCompleteProject: (id: string) => void;
  onReopenProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onPurgeProject: (id: string) => void;
}

const toDateInput = (value?: number) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const ProjectsLifecycleDetailsPanel: React.FC<ProjectsLifecycleDetailsPanelProps> = ({
  currentUserRole,
  allUsers,
  canManageProject,
  focusedProject,
  focusedProjectTasks,
  focusedProjectStats,
  projectStatus,
  editingProjectId,
  editingProjectName,
  setEditingProjectId,
  setEditingProjectName,
  submitProjectRename,
  onUpdateProject,
  onCompleteProject,
  onReopenProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onPurgeProject
}) => {
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [draftStartDate, setDraftStartDate] = useState(toDateInput(focusedProject.startDate));
  const [draftEndDate, setDraftEndDate] = useState(toDateInput(focusedProject.endDate));
  const [draftBudget, setDraftBudget] = useState(
    typeof focusedProject.budgetCost === 'number' ? String(focusedProject.budgetCost) : ''
  );
  const [draftHourlyRate, setDraftHourlyRate] = useState(
    typeof focusedProject.hourlyRate === 'number' ? String(focusedProject.hourlyRate) : ''
  );
  const [draftScopeSize, setDraftScopeSize] = useState(
    typeof focusedProject.scopeSize === 'number' ? String(focusedProject.scopeSize) : ''
  );
  const [draftScopeSummary, setDraftScopeSummary] = useState(focusedProject.scopeSummary || '');
  const [draftOwnerIds, setDraftOwnerIds] = useState<string[]>(
    Array.from(new Set([...(focusedProject.ownerIds || []), ...(focusedProject.createdBy ? [focusedProject.createdBy] : [])]))
  );

  const ownerIds = useMemo(
    () => Array.from(new Set([...(focusedProject.ownerIds || []), ...(focusedProject.createdBy ? [focusedProject.createdBy] : [])])),
    [focusedProject.ownerIds, focusedProject.createdBy]
  );
  const ownerNames = ownerIds
    .map((id) => allUsers.find((user) => user.id === id)?.displayName)
    .filter(Boolean) as string[];
  const resolveUserLabel = (userId?: string) => {
    if (!userId) return 'Unknown';
    return allUsers.find((user) => user.id === userId)?.displayName || 'Unknown';
  };
  const lifecycleMeta = [
    focusedProject.isCompleted
      ? {
          key: 'completed',
          label: 'Completed',
          timestamp: focusedProject.completedAt || focusedProject.updatedAt || 0,
          actor: resolveUserLabel(focusedProject.completedById),
          isApproximate: !focusedProject.completedAt
        }
      : null,
    focusedProject.isArchived
      ? {
          key: 'archived',
          label: 'Archived',
          timestamp: focusedProject.archivedAt || focusedProject.updatedAt || 0,
          actor: resolveUserLabel(focusedProject.archivedById),
          isApproximate: !focusedProject.archivedAt
        }
      : null,
    focusedProject.isDeleted
      ? {
          key: 'deleted',
          label: 'Deleted',
          timestamp: focusedProject.deletedAt || focusedProject.updatedAt || 0,
          actor: resolveUserLabel(focusedProject.deletedById),
          isApproximate: !focusedProject.deletedAt
        }
      : null
  ].filter(Boolean) as Array<{ key: string; label: string; timestamp: number; actor: string; isApproximate: boolean }>;

  const openSectionEditor = (section: EditSection) => {
    setEditSection(section);
    setDraftStartDate(toDateInput(focusedProject.startDate));
    setDraftEndDate(toDateInput(focusedProject.endDate));
    setDraftBudget(typeof focusedProject.budgetCost === 'number' ? String(focusedProject.budgetCost) : '');
    setDraftHourlyRate(typeof focusedProject.hourlyRate === 'number' ? String(focusedProject.hourlyRate) : '');
    setDraftScopeSize(typeof focusedProject.scopeSize === 'number' ? String(focusedProject.scopeSize) : '');
    setDraftScopeSummary(focusedProject.scopeSummary || '');
    setDraftOwnerIds(ownerIds);
  };

  const closeEditor = () => setEditSection(null);

  const saveSection = () => {
    if (!editSection) return;
    if (editSection === 'timeline') {
      const startDate = draftStartDate ? new Date(`${draftStartDate}T00:00:00`).getTime() : undefined;
      const endDate = draftEndDate ? new Date(`${draftEndDate}T00:00:00`).getTime() : undefined;
      onUpdateProject(focusedProject.id, { startDate, endDate });
    }
    if (editSection === 'budget') {
      onUpdateProject(focusedProject.id, {
        budgetCost: draftBudget ? Math.max(0, Number(draftBudget)) : undefined,
        hourlyRate: draftHourlyRate ? Math.max(0, Number(draftHourlyRate)) : undefined
      });
    }
    if (editSection === 'scope') {
      onUpdateProject(focusedProject.id, {
        scopeSize: draftScopeSize ? Math.max(0, Math.round(Number(draftScopeSize))) : undefined,
        scopeSummary: draftScopeSummary.trim() || undefined
      });
    }
    if (editSection === 'owners' && currentUserRole === 'admin') {
      const nextOwnerIds = Array.from(new Set(draftOwnerIds.filter(Boolean)));
      if (nextOwnerIds.length > 0) {
        const primaryOwnerId = nextOwnerIds[0];
        const nextMembers = Array.from(new Set([...(focusedProject.members || []), ...nextOwnerIds]));
        onUpdateProject(focusedProject.id, { createdBy: primaryOwnerId, ownerIds: nextOwnerIds, members: nextMembers });
      }
    }
    closeEditor();
  };

  const toggleOwner = (userId: string) => {
    setDraftOwnerIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  return (
    <section className="border border-slate-200 rounded-xl bg-white p-3 md:p-5 flex flex-col min-h-0 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{projectStatus}</p>
          <h3 className="text-lg md:text-xl font-semibold text-slate-900 truncate mt-1">{focusedProject.name}</h3>
          <p className="text-xs md:text-sm text-slate-600 mt-1">{focusedProject.description || 'No description provided.'}</p>
        </div>
      </div>

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

      <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="rounded-lg border border-slate-200 px-3 py-2 bg-white relative">
          <p className="text-[11px] text-slate-500">Timeline</p>
          <p className="text-sm font-semibold text-slate-900">
            {focusedProject.startDate ? new Date(focusedProject.startDate).toLocaleDateString() : 'No start'} -{' '}
            {focusedProject.endDate ? new Date(focusedProject.endDate).toLocaleDateString() : 'No end'}
          </p>
          {canManageProject ? (
            <button onClick={() => openSectionEditor('timeline')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" title="Edit timeline">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-200 px-3 py-2 bg-white relative">
          <p className="text-[11px] text-slate-500">Budget / Tracked spend</p>
          <p className="text-sm font-semibold text-slate-900">
            {focusedProject.budgetCost ? `$${focusedProject.budgetCost.toLocaleString()}` : 'No budget'} /{' '}
            {focusedProjectStats?.estimatedSpent ? `$${Math.round(focusedProjectStats.estimatedSpent).toLocaleString()}` : '-'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {focusedProjectStats?.trackedHours ? `${focusedProjectStats.trackedHours.toFixed(1)}h tracked` : '0.0h tracked'}
            {typeof focusedProject.hourlyRate === 'number' ? ` @ $${focusedProject.hourlyRate.toFixed(2)}/h` : ''}
          </p>
          {canManageProject ? (
            <button onClick={() => openSectionEditor('budget')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" title="Edit budget">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-200 px-3 py-2 bg-white relative">
          <p className="text-[11px] text-slate-500">Scope target</p>
          <p className="text-sm font-semibold text-slate-900">
            {typeof focusedProject.scopeSize === 'number' ? `${focusedProject.scopeSize} tasks` : 'Not set'}
            {typeof focusedProjectStats?.scopeGap === 'number' ? ` (${focusedProjectStats.scopeGap >= 0 ? '+' : ''}${focusedProjectStats.scopeGap} gap)` : ''}
          </p>
          {canManageProject ? (
            <button onClick={() => openSectionEditor('scope')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" title="Edit scope">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-200 px-3 py-2 bg-white relative">
          <p className="text-[11px] text-slate-500">Project owners</p>
          <p className="text-sm font-semibold text-slate-900 truncate">
            {ownerNames.length > 0 ? ownerNames.join(', ') : 'Not set'}
          </p>
          {currentUserRole === 'admin' ? (
            <button onClick={() => openSectionEditor('owners')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" title="Edit owners">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-slate-200 px-3 py-2 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-500">Public project</p>
            <p className="text-sm font-semibold text-slate-900">{focusedProject.isPublic ? 'Enabled' : 'Disabled'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Allow read-only public sharing.</p>
          </div>
          {canManageProject ? (
            <button
              type="button"
              onClick={() => onUpdateProject(focusedProject.id, { isPublic: !focusedProject.isPublic })}
              className={`w-11 h-6 rounded-full p-1 transition-colors ${focusedProject.isPublic ? 'bg-slate-900' : 'bg-slate-300'}`}
              title={focusedProject.isPublic ? 'Disable public sharing' : 'Enable public sharing'}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${focusedProject.isPublic ? 'translate-x-5' : ''}`} />
            </button>
          ) : null}
        </div>
      </div>
      {focusedProject.scopeSummary ? (
        <div className="mt-2 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
          <p className="text-[11px] text-slate-500">Scope summary</p>
          <p className="text-sm text-slate-700 mt-1">{focusedProject.scopeSummary}</p>
        </div>
      ) : null}
      {focusedProject.completionComment ? (
        <div className="mt-2 rounded-lg border border-emerald-200 px-3 py-2 bg-emerald-50">
          <p className="text-[11px] text-emerald-700">Completion note</p>
          <p className="text-sm text-emerald-900 mt-1">{focusedProject.completionComment}</p>
        </div>
      ) : null}
      {lifecycleMeta.length > 0 ? (
        <div className="mt-2 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Lifecycle history</p>
          <div className="mt-1.5 space-y-1">
            {lifecycleMeta.map((item) => (
              <p key={item.key} className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{item.label}</span>{' '}
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'time not recorded'} by {item.actor}
                {item.isApproximate ? ' (legacy record)' : ''}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {canManageProject && !focusedProject.isDeleted && !focusedProject.isArchived && !focusedProject.isCompleted && editingProjectId === focusedProject.id ? (
          <>
            <input
              autoFocus
              value={editingProjectName}
              onChange={(event) => setEditingProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitProjectRename();
                if (event.key === 'Escape') {
                  setEditingProjectId(null);
                  setEditingProjectName('');
                }
              }}
              className="h-9 w-full md:w-auto flex-1 min-w-0 md:min-w-[200px] rounded-lg border border-slate-300 px-3 text-sm bg-white outline-none"
            />
            <button onClick={submitProjectRename} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
              Save
            </button>
          </>
        ) : canManageProject && !focusedProject.isDeleted && !focusedProject.isArchived && !focusedProject.isCompleted ? (
          <button
            onClick={() => {
              setEditingProjectId(focusedProject.id);
              setEditingProjectName(focusedProject.name);
            }}
            className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
          >
            Rename
          </button>
        ) : null}

        {canManageProject && !focusedProject.isDeleted && !focusedProject.isArchived && !focusedProject.isCompleted && (
          <>
            <button onClick={() => onCompleteProject(focusedProject.id)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
              Complete
            </button>
            <button onClick={() => onArchiveProject(focusedProject.id)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 inline-flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
          </>
        )}
        {canManageProject && focusedProject.isArchived && (
          <button onClick={() => onRestoreProject(focusedProject.id)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 inline-flex items-center gap-1.5">
            <ArchiveRestore className="w-3.5 h-3.5" /> Restore
          </button>
        )}
        {canManageProject && focusedProject.isCompleted && (
          <button onClick={() => onReopenProject(focusedProject.id)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
            Reopen
          </button>
        )}
        {canManageProject && !focusedProject.isDeleted ? (
          <button onClick={() => onDeleteProject(focusedProject.id)} className="h-9 px-3 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-700 inline-flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        ) : canManageProject && focusedProject.isDeleted ? (
          <>
            <button onClick={() => onRestoreProject(focusedProject.id)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
              Restore
            </button>
            <button onClick={() => onPurgeProject(focusedProject.id)} className="h-9 px-3 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-700">
              Purge
            </button>
          </>
        ) : null}
      </div>

      <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden flex-1 min-h-0">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tasks</div>
        <div className="max-h-[42vh] md:max-h-[38vh] overflow-y-auto custom-scrollbar">
          {focusedProjectTasks.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No tasks found for this project.</p>
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
      </div>

      {editSection ? (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] p-4 rounded-xl z-10">
          <div className="h-full border border-slate-200 rounded-xl bg-white p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 capitalize">Edit {editSection}</p>
              <button onClick={closeEditor} className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
                <X className="w-3.5 h-3.5 m-auto" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-3">
              {editSection === 'timeline' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="text-xs text-slate-600">
                    Start date
                    <DateInputField value={draftStartDate} onChange={setDraftStartDate} compact className="mt-1" />
                  </label>
                  <label className="text-xs text-slate-600">
                    End date
                    <DateInputField value={draftEndDate} onChange={setDraftEndDate} compact className="mt-1" />
                  </label>
                </div>
              ) : null}

              {editSection === 'budget' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="text-xs text-slate-600 block">
                    Budget (USD)
                    <input type="number" min={0} value={draftBudget} onChange={(event) => setDraftBudget(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-xs" />
                  </label>
                  <label className="text-xs text-slate-600 block">
                    Hourly rate ($/h)
                    <input type="number" min={0} step={0.01} value={draftHourlyRate} onChange={(event) => setDraftHourlyRate(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-xs" />
                  </label>
                </div>
              ) : null}

              {editSection === 'scope' ? (
                <>
                  <label className="text-xs text-slate-600 block">
                    Scope size (tasks)
                    <input type="number" min={0} value={draftScopeSize} onChange={(event) => setDraftScopeSize(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-xs" />
                  </label>
                  <label className="text-xs text-slate-600 block">
                    Scope summary
                    <textarea value={draftScopeSummary} onChange={(event) => setDraftScopeSummary(event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-xs" />
                  </label>
                </>
              ) : null}

              {editSection === 'owners' && currentUserRole === 'admin' ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600">Select one or more project owners</p>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                    {allUsers
                      .filter((user) => user.orgId === focusedProject.orgId)
                      .map((user) => (
                        <label key={user.id} className="flex items-center justify-between gap-2 px-2 py-2 text-xs">
                          <span className="text-slate-700">{user.displayName}</span>
                          <input type="checkbox" checked={draftOwnerIds.includes(user.id)} onChange={() => toggleOwner(user.id)} />
                        </label>
                      ))}
                  </div>
                  <p className="text-[11px] text-slate-500">First selected owner becomes primary owner.</p>
                </div>
              ) : null}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button onClick={closeEditor} className="h-8 px-3 rounded-md border border-slate-200 text-xs text-slate-700">Cancel</button>
              <button onClick={saveSection} className="h-8 px-3 rounded-md bg-slate-900 text-xs text-white">Save</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ProjectsLifecycleDetailsPanel;
