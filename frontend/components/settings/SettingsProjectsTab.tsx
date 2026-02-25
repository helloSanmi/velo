import React from 'react';
import { Search } from 'lucide-react';
import { Project, Task, User } from '../../types';
import SettingsProjectsOverview from './SettingsProjectsOverview';
import SettingsProjectDetailsPanel from './SettingsProjectDetailsPanel';

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

const SettingsProjectsTab: React.FC<SettingsProjectsTabProps> = (props) => {
  const {
    currentUserRole, currentUserId, allUsers, projectQuery, setProjectQuery, activeProjects, archivedProjects, completedProjects, deletedProjects,
    focusedProjectId, setFocusedProjectId, focusedProject, focusedProjectTasks, editingProjectId, editingProjectName, setEditingProjectId, setEditingProjectName,
    submitProjectRename, onCompleteProject, onReopenProject, onArchiveProject, onRestoreProject, onDeleteProject, onPurgeProject, onChangeProjectOwner
  } = props;

  return (
    <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 flex h-full min-h-0 flex-col space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-base font-semibold text-slate-900">Project Lifecycle</h3>
        <p className="mt-1 text-xs text-slate-500">Select any project to open its full details panel.</p>
      </div>
      <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="Filter projects" className="w-full bg-transparent text-sm text-slate-700 outline-none" />
      </label>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <SettingsProjectsOverview
          activeProjects={activeProjects}
          archivedProjects={archivedProjects}
          completedProjects={completedProjects}
          deletedProjects={deletedProjects}
          focusedProjectId={focusedProjectId}
          onSelectProject={setFocusedProjectId}
        />
        {focusedProject ? (
          <SettingsProjectDetailsPanel
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            allUsers={allUsers}
            focusedProject={focusedProject}
            focusedProjectTasks={focusedProjectTasks}
            editingProjectId={editingProjectId}
            editingProjectName={editingProjectName}
            setFocusedProjectId={setFocusedProjectId}
            setEditingProjectId={setEditingProjectId}
            setEditingProjectName={setEditingProjectName}
            submitProjectRename={submitProjectRename}
            onCompleteProject={onCompleteProject}
            onReopenProject={onReopenProject}
            onArchiveProject={onArchiveProject}
            onRestoreProject={onRestoreProject}
            onDeleteProject={onDeleteProject}
            onPurgeProject={onPurgeProject}
            onChangeProjectOwner={onChangeProjectOwner}
          />
        ) : null}
      </div>
    </div>
  );
};

export default SettingsProjectsTab;
