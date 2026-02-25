import React from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { Project, Task, TaskStatus, User } from '../../types';
import AppSelect from '../ui/AppSelect';

interface SettingsProjectDetailsPanelProps {
  currentUserRole?: User['role'];
  currentUserId: string;
  allUsers: User[];
  focusedProject: Project;
  focusedProjectTasks: Task[];
  editingProjectId: string | null;
  editingProjectName: string;
  setFocusedProjectId: (id: string | null) => void;
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

const SettingsProjectDetailsPanel: React.FC<SettingsProjectDetailsPanelProps> = (props) => {
  const {
    currentUserRole, currentUserId, allUsers, focusedProject, focusedProjectTasks, editingProjectId, editingProjectName,
    setFocusedProjectId, setEditingProjectId, setEditingProjectName, submitProjectRename,
    onCompleteProject, onReopenProject, onArchiveProject, onRestoreProject, onDeleteProject, onPurgeProject, onChangeProjectOwner
  } = props;
  const ownerById = new Map(allUsers.map((user) => [user.id, user]));
  const canChangeOwner = currentUserRole === 'admin';
  const ownerId = focusedProject.createdBy || focusedProject.members?.[0];
  const canManage = currentUserRole === 'admin' || ownerId === currentUserId;

  return (
    <section className="ring-slate-200 flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 ring-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project details</p>
          <h4 className="mt-1 truncate text-base font-semibold text-slate-900">{focusedProject.name}</h4>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{focusedProject.description || 'No description.'}</p>
        </div>
        <button onClick={() => setFocusedProjectId(null)} className="h-7 rounded-md border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-50">Close</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[['Total', focusedProjectTasks.length], ['To do', focusedProjectTasks.filter((t) => t.status === TaskStatus.TODO).length], ['In progress', focusedProjectTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length], ['Done', focusedProjectTasks.filter((t) => t.status === TaskStatus.DONE).length]].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-sm font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="custom-scrollbar mt-3 max-h-[28vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 md:max-h-[32vh]">
        {focusedProjectTasks.length === 0 ? <p className="p-4 text-xs text-slate-500">No tasks found for this project.</p> : (
          <div className="divide-y divide-slate-200">
            {focusedProjectTasks.map((task) => (
              <div key={task.id} className="p-3">
                <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{task.status.replace('-', ' ')} • {task.priority}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {focusedProject.completionComment ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-emerald-700">Completion note</p><p className="mt-1 text-xs text-emerald-900">{focusedProject.completionComment}</p></div> : null}
      <div className="mt-3">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Project owner</p>
        {canChangeOwner ? (
          <div className="w-full md:w-auto md:min-w-[180px]">
            <AppSelect
              value={ownerId || ''}
              onChange={(value) => onChangeProjectOwner?.(focusedProject.id, value)}
              className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
              options={allUsers.map((user) => ({ value: user.id, label: user.displayName }))}
            />
          </div>
        ) : <div className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">{ownerById.get(ownerId || '')?.displayName || 'Unknown owner'}</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {canManage && editingProjectId === focusedProject.id ? (
          <>
            <input autoFocus value={editingProjectName} onChange={(event) => setEditingProjectName(event.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none md:w-auto md:min-w-[120px]" />
            <button onClick={submitProjectRename} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700">Save</button>
          </>
        ) : canManage ? <button onClick={() => { setEditingProjectId(focusedProject.id); setEditingProjectName(focusedProject.name); }} className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700">Rename</button> : null}
        {canManage && !focusedProject.isDeleted && !focusedProject.isArchived && !focusedProject.isCompleted ? <><button onClick={() => onCompleteProject?.(focusedProject.id)} className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700">Complete</button><button onClick={() => onArchiveProject?.(focusedProject.id)} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"><Archive className="h-3 w-3" /> Archive</button></> : null}
        {canManage && focusedProject.isArchived ? <button onClick={() => onRestoreProject?.(focusedProject.id)} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"><ArchiveRestore className="h-3 w-3" /> Restore</button> : null}
        {canManage && focusedProject.isCompleted ? <button onClick={() => onReopenProject?.(focusedProject.id)} className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700">Reopen</button> : null}
        {canManage && !focusedProject.isDeleted ? <button onClick={() => onDeleteProject?.(focusedProject.id)} className="h-7 rounded-md border border-rose-200 bg-rose-50 px-2 text-xs text-rose-700">Delete</button> : null}
        {canManage && focusedProject.isDeleted ? <button onClick={() => onPurgeProject?.(focusedProject.id)} className="h-7 rounded-md border border-rose-200 bg-rose-50 px-2 text-xs text-rose-700">Purge</button> : null}
      </div>
    </section>
  );
};

export default SettingsProjectDetailsPanel;
