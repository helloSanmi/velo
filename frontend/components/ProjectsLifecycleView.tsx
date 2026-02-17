import React, { useMemo, useState } from 'react';
import { Project, Task, User } from '../types';
import { DEFAULT_PROJECT_STAGES } from '../services/projectService';
import ProjectsLifecycleHeader from './projects-lifecycle/ProjectsLifecycleHeader';
import ProjectsLifecycleListPanel from './projects-lifecycle/ProjectsLifecycleListPanel';
import ProjectsLifecycleDetailsPanel from './projects-lifecycle/ProjectsLifecycleDetailsPanel';
import { getProjectStatus, StatusFilter, statusOrder } from './projects-lifecycle/types';

interface ProjectsLifecycleViewProps {
  currentUserRole?: 'admin' | 'member' | 'guest';
  currentUserId: string;
  projects: Project[];
  allUsers: User[];
  projectTasks: Task[];
  activeProjectId: string | null;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onRenameProject: (id: string, name: string) => void;
  onCompleteProject: (id: string) => void;
  onReopenProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onPurgeProject: (id: string) => void;
  onBulkLifecycleAction: (action: 'archive' | 'complete' | 'delete' | 'restore', ids: string[]) => void;
}

const ProjectsLifecycleView: React.FC<ProjectsLifecycleViewProps> = ({
  currentUserRole,
  currentUserId,
  projects,
  allUsers,
  projectTasks,
  activeProjectId,
  onUpdateProject,
  onRenameProject,
  onCompleteProject,
  onReopenProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onPurgeProject,
  onBulkLifecycleAction
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((project) => (statusFilter === 'All' ? true : getProjectStatus(project) === statusFilter))
      .filter((project) => (q ? `${project.name} ${project.description}`.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const byStatus = statusOrder[getProjectStatus(a)] - statusOrder[getProjectStatus(b)];
        if (byStatus !== 0) return byStatus;
        return a.name.localeCompare(b.name);
      });
  }, [projects, query, statusFilter]);

  const focusedProject = projects.find((project) => project.id === focusedProjectId) || null;
  const focusedProjectTasks = useMemo(
    () => (focusedProject ? projectTasks.filter((task) => task.projectId === focusedProject.id) : []),
    [projectTasks, focusedProject]
  );
  const focusedProjectStats = useMemo(() => {
    if (!focusedProject) return null;
    const stages = focusedProject.stages?.length ? focusedProject.stages : DEFAULT_PROJECT_STAGES;
    const firstStageId = stages[0]?.id;
    const lastStageId = stages[stages.length - 1]?.id;
    const total = focusedProjectTasks.length;
    const done = lastStageId ? focusedProjectTasks.filter((task) => task.status === lastStageId).length : 0;
    const backlog = firstStageId ? focusedProjectTasks.filter((task) => task.status === firstStageId).length : 0;
    const inProgress = Math.max(0, total - done - backlog);
    const completionRate = total > 0 ? done / total : 0;
    const trackedMs = focusedProjectTasks.reduce((sum, task) => {
      const base = task.timeLogged || 0;
      if (task.isTimerRunning && task.timerStartedAt) return sum + base + Math.max(0, Date.now() - task.timerStartedAt);
      return sum + base;
    }, 0);
    const trackedHours = trackedMs / 3600000;
    const estimatedSpent =
      typeof focusedProject.hourlyRate === 'number' ? trackedHours * focusedProject.hourlyRate : undefined;
    const scopeGap = typeof focusedProject.scopeSize === 'number' ? focusedProject.scopeSize - total : undefined;

    return { total, done, backlog, inProgress, completionRate, estimatedSpent, scopeGap, trackedHours };
  }, [focusedProject, focusedProjectTasks]);

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted).length,
      archived: projects.filter((project) => project.isArchived && !project.isDeleted).length,
      completed: projects.filter((project) => project.isCompleted && !project.isDeleted).length,
      deleted: projects.filter((project) => project.isDeleted).length
    }),
    [projects]
  );

  const submitProjectRename = () => {
    if (!editingProjectId) return;
    const trimmed = editingProjectName.trim();
    if (!trimmed) return;
    onRenameProject(editingProjectId, trimmed);
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const canManageProject = (project: Project) => {
    const ownerIds = Array.from(new Set([...(project.ownerIds || []), ...(project.createdBy ? [project.createdBy] : [])]));
    return currentUserRole === 'admin' || ownerIds.includes(currentUserId);
  };

  const toggleProjectSelection = (id: string) => {
    setSelectedProjectIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-3 md:p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-5">
        <ProjectsLifecycleHeader counts={counts} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-3 md:gap-4 min-h-0 xl:min-h-[68vh]">
          <ProjectsLifecycleListPanel
            filteredProjects={filteredProjects}
            projectTasks={projectTasks}
            selectedProjectIds={selectedProjectIds}
            focusedProjectId={focusedProjectId}
            query={query}
            setQuery={setQuery}
            setFocusedProjectId={setFocusedProjectId}
            toggleProjectSelection={toggleProjectSelection}
            onBulkLifecycleAction={onBulkLifecycleAction}
            canDeleteProject={(projectId) => {
              const target = projects.find((project) => project.id === projectId);
              return target ? canManageProject(target) : false;
            }}
            clearSelection={() => setSelectedProjectIds([])}
            activeProjectId={activeProjectId}
          />

          {focusedProject ? (
            <ProjectsLifecycleDetailsPanel
              currentUserRole={currentUserRole}
              allUsers={allUsers}
              canManageProject={canManageProject(focusedProject)}
              focusedProject={focusedProject}
              focusedProjectTasks={focusedProjectTasks}
              focusedProjectStats={focusedProjectStats}
              projectStatus={getProjectStatus(focusedProject)}
              editingProjectId={editingProjectId}
              editingProjectName={editingProjectName}
              setEditingProjectId={setEditingProjectId}
              setEditingProjectName={setEditingProjectName}
              submitProjectRename={submitProjectRename}
              onUpdateProject={onUpdateProject}
              onCompleteProject={onCompleteProject}
              onReopenProject={onReopenProject}
              onArchiveProject={onArchiveProject}
              onRestoreProject={onRestoreProject}
              onDeleteProject={onDeleteProject}
              onPurgeProject={onPurgeProject}
            />
          ) : (
            <section className="border border-dashed border-slate-200 rounded-xl p-6 text-slate-500 bg-white flex items-center justify-center">
              <p className="text-sm">Select a project from the left panel.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsLifecycleView;
