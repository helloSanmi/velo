import React from 'react';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';

interface ProjectsLifecycleActionsRowProps {
  canManageProject: boolean;
  projectId: string;
  isDeleted: boolean;
  isArchived: boolean;
  isCompleted: boolean;
  editingProjectId: string | null;
  editingProjectName: string;
  projectName: string;
  setEditingProjectId: (id: string | null) => void;
  setEditingProjectName: (name: string) => void;
  submitProjectRename: () => void;
  onCompleteProject: (id: string) => void;
  onReopenProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onPurgeProject: (id: string) => void;
}

const ProjectsLifecycleActionsRow: React.FC<ProjectsLifecycleActionsRowProps> = ({
  canManageProject,
  projectId,
  isDeleted,
  isArchived,
  isCompleted,
  editingProjectId,
  editingProjectName,
  projectName,
  setEditingProjectId,
  setEditingProjectName,
  submitProjectRename,
  onCompleteProject,
  onReopenProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onPurgeProject
}) => {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {canManageProject && !isDeleted && !isArchived && !isCompleted && editingProjectId === projectId ? (
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
      ) : canManageProject && !isDeleted && !isArchived && !isCompleted ? (
        <button
          onClick={() => {
            setEditingProjectId(projectId);
            setEditingProjectName(projectName);
          }}
          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
        >
          Rename
        </button>
      ) : null}

      {canManageProject && !isDeleted && !isArchived && !isCompleted ? (
        <>
          <button onClick={() => onCompleteProject(projectId)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
            Complete
          </button>
          <button onClick={() => onArchiveProject(projectId)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 inline-flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5" /> Archive
          </button>
        </>
      ) : null}

      {canManageProject && isArchived ? (
        <button onClick={() => onRestoreProject(projectId)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 inline-flex items-center gap-1.5">
          <ArchiveRestore className="w-3.5 h-3.5" /> Restore
        </button>
      ) : null}

      {canManageProject && isCompleted ? (
        <button onClick={() => onReopenProject(projectId)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
          Reopen
        </button>
      ) : null}

      {canManageProject && !isDeleted ? (
        <button onClick={() => onDeleteProject(projectId)} className="h-9 px-3 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-700 inline-flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      ) : canManageProject && isDeleted ? (
        <>
          <button onClick={() => onRestoreProject(projectId)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
            Restore
          </button>
          <button onClick={() => onPurgeProject(projectId)} className="h-9 px-3 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-700">
            Purge
          </button>
        </>
      ) : null}
    </div>
  );
};

export default ProjectsLifecycleActionsRow;
