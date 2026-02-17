import { Dispatch, SetStateAction, useCallback } from 'react';
import { Project, Task, TaskStatus, User } from '../types';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { dialogService } from '../services/dialogService';
import { toastService } from '../services/toastService';
import { notifyProjectLifecycle } from '../services/projectNotificationService';
import { isTaskInFinalStage } from '../services/completionFlowService';

interface UseProjectLifecycleActionsParams {
  user: User | null;
  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: Dispatch<SetStateAction<string | null>>;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  refreshTasks: () => void;
  canManageProject: (project?: Project) => boolean;
  onOpenMoveTasksBackPicker: (payload: {
    projectId: string;
    finalStageId: string;
    finalStageName: string;
    previousStageId: string;
    previousStageName: string;
    taskIds: string[];
    tasks: Task[];
  }) => void;
}

export const useProjectLifecycleActions = ({
  user,
  projects,
  activeProjectId,
  setActiveProjectId,
  setProjects,
  setSelectedTask,
  refreshTasks,
  canManageProject,
  onOpenMoveTasksBackPicker
}: UseProjectLifecycleActionsParams) => {
  const handleRenameProject = useCallback((id: string, name: string) => {
    if (!user) return;
    const target = projects.find((project) => project.id === id);
    if (!target) return;
    if (target.isCompleted || target.isArchived || target.isDeleted) {
      toastService.warning('Rename blocked', 'Only active projects can be renamed.');
      return;
    }
    if (!canManageProject(target)) {
      toastService.warning('Permission denied', 'Only admins or the project creator can rename projects.');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;
    projectService.renameProject(id, trimmed);
    setProjects((prev) => prev.map((project) => (project.id === id ? { ...project, name: trimmed } : project)));
    notifyProjectLifecycle(user, target, 'renamed', trimmed);
    toastService.success('Project renamed', `"${trimmed}" is now the project name.`);
  }, [user, projects, canManageProject, setProjects]);

  const handleArchiveProject = useCallback((id: string) => {
    if (!user) return;
    const project = projects.find((item) => item.id === id);
    if (!canManageProject(project)) {
      toastService.warning('Permission denied', 'Only admins or the project creator can archive projects.');
      return;
    }
    dialogService
      .confirm(`Archive "${project?.name || 'this project'}"?`, {
        title: 'Archive project',
        description: 'Archived projects are removed from the active board until restored.',
        confirmText: 'Archive',
        danger: true
      })
      .then((confirmed) => {
        if (!confirmed) return;
        projectService.archiveProject(id, user.id);
        setProjects((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  isArchived: true,
                  archivedAt: Date.now(),
                  archivedById: user.id,
                  isCompleted: false,
                  completedAt: undefined,
                  completedById: undefined,
                  isDeleted: false,
                  deletedAt: undefined,
                  deletedById: undefined
                }
              : item
          )
        );
        if (activeProjectId === id) setActiveProjectId(null);
        refreshTasks();
        notifyProjectLifecycle(user, project, 'archived');
        toastService.info('Project archived', project ? `"${project.name}" moved to archived.` : 'Project moved to archived.');
      });
  }, [user, projects, canManageProject, setProjects, activeProjectId, setActiveProjectId, refreshTasks]);

  const handleCompleteProject = useCallback((id: string, options?: { skipConfirm?: boolean }) => {
    if (!user) return;
    const target = projects.find((project) => project.id === id);
    if (!target) return;
    const projectTasks = taskService.getAllTasksForOrg(user.orgId).filter((task) => task.projectId === id);
    const finalStageId = target.stages?.length ? target.stages[target.stages.length - 1].id : TaskStatus.DONE;
    const finalStageName = target.stages?.length ? target.stages[target.stages.length - 1].name : 'Done';
    const hasTasksOutsideFinalStage = projectTasks.some((task) => !isTaskInFinalStage(task, finalStageId));
    if (hasTasksOutsideFinalStage) {
      toastService.warning(
        'Completion blocked',
        `Move all project tasks into "${finalStageName}" before completing this project.`
      );
      return;
    }
    const hasRunningTimer = taskService
      .getAllTasksForOrg(user.orgId)
      .some((task) => task.projectId === id && Boolean(task.isTimerRunning));
    if (hasRunningTimer) {
      toastService.warning('Completion blocked', 'Stop all running task timers in this project before completing it.');
      return;
    }
    if (!canManageProject(target)) {
      toastService.warning('Permission denied', 'Only admins or the project creator can complete projects.');
      return;
    }
    const project = projects.find((item) => item.id === id);

    const completeNow = () => {
      projectService.completeProject(id, user.id);
      setProjects((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                isCompleted: true,
                completedAt: Date.now(),
                completedById: user.id,
                isArchived: false,
                archivedAt: undefined,
                archivedById: undefined,
                isDeleted: false,
                deletedAt: undefined,
                deletedById: undefined
              }
            : item
        )
      );
      if (activeProjectId === id) setActiveProjectId(null);
      refreshTasks();
      notifyProjectLifecycle(user, project, 'completed');
      toastService.success('Project completed', project ? `"${project.name}" marked complete.` : 'Project marked complete.');
    };

    if (options?.skipConfirm) {
      completeNow();
      return;
    }

    dialogService
      .confirm(`Mark "${project?.name || 'this project'}" as completed?`, {
        title: 'Complete project',
        description: 'Completed projects move out of the active board and into completed state.',
        confirmText: 'Complete',
        danger: false
      })
      .then((confirmed) => {
        if (!confirmed) return;
        completeNow();
      });
  }, [user, projects, canManageProject, setProjects, activeProjectId, setActiveProjectId, refreshTasks]);

  const handleReopenProject = useCallback((id: string) => {
    if (!user) return;
    const target = projects.find((project) => project.id === id);
    if (!target) return;
    if (!canManageProject(target)) {
      toastService.warning('Permission denied', 'Only admins or the project creator can reopen projects.');
      return;
    }
    dialogService
      .prompt('Please add a short justification to reopen this project:', {
        title: 'Reopen project',
        confirmText: 'Reopen',
        cancelText: 'Cancel',
        placeholder: 'Brief reason...',
        required: true,
        multiline: false
      })
      .then((justification) => {
        if (justification === null) return;
        if (!justification.trim()) {
          toastService.warning('Justification required', 'Add a brief reason before reopening this project.');
          return;
        }
        projectService.reopenProject(id, user.id);
        setProjects((prev) =>
          prev.map((project) =>
            project.id === id
              ? {
                  ...project,
                isCompleted: false,
                completedAt: undefined,
                completedById: undefined,
                completionRequestedAt: undefined,
                completionRequestedById: undefined,
                completionRequestedByName: undefined,
                completionRequestedComment: undefined,
                reopenedAt: Date.now(),
                  reopenedById: user.id
                }
              : project
          )
        );
        refreshTasks();
        const reopenedProjectTasks = taskService.getAllTasksForOrg(user.orgId).filter((task) => task.projectId === id);
        const finalStageId = target.stages?.length ? target.stages[target.stages.length - 1].id : TaskStatus.DONE;
        const finalStageName = target.stages?.length ? target.stages[target.stages.length - 1].name : 'Done';
        const allStillInFinalStage =
          reopenedProjectTasks.length > 0 &&
          reopenedProjectTasks.every((task) => isTaskInFinalStage(task, finalStageId));
        const project = projects.find((item) => item.id === id);
        notifyProjectLifecycle(user, project, 'reopened');
        if (allStillInFinalStage) {
          const previousStageId =
            target.stages && target.stages.length > 1 ? target.stages[target.stages.length - 2].id : TaskStatus.IN_PROGRESS;
          const previousStageName =
            target.stages && target.stages.length > 1 ? target.stages[target.stages.length - 2].name : 'In Progress';
          dialogService
            .confirm('All tasks are still in the final stage. Move one task back now?', {
              title: 'Choose next step',
              description: `You can move one task to "${previousStageName}" now, or keep all tasks done and add a new task later.`,
              confirmText: 'I will choose task',
              cancelText: 'Not now',
              danger: false
            })
            .then((moveNow) => {
              if (!moveNow) {
                toastService.info(
                  'Project reopened',
                  project
                    ? `"${project.name}" reopened. Create a new task or move one task back from "${finalStageName}" when ready.`
                    : 'Project reopened. Create a new task or move one task back from the final stage when ready.'
                );
                return;
              }
              setActiveProjectId(id);
              setSelectedTask(null);
              onOpenMoveTasksBackPicker({
                projectId: id,
                finalStageId,
                finalStageName,
                previousStageId,
                previousStageName,
                taskIds: reopenedProjectTasks.filter((task) => isTaskInFinalStage(task, finalStageId)).map((task) => task.id),
                tasks: reopenedProjectTasks.filter((task) => isTaskInFinalStage(task, finalStageId))
              });
            });
          return;
        }
        toastService.info('Project reopened', project ? `"${project.name}" is active again.` : 'Project is active again.');
      });
  }, [user, projects, canManageProject, setProjects, setSelectedTask, refreshTasks, onOpenMoveTasksBackPicker]);

  const handleRestoreProject = useCallback((id: string) => {
    if (!user) return;
    const target = projects.find((project) => project.id === id);
    if (!canManageProject(target)) {
      toastService.warning('Permission denied', 'Only admins or the project creator can restore projects.');
      return;
    }
    const wasCompleted = Boolean(target?.isCompleted);
    projectService.restoreProject(id, user.id);
    setProjects((prev) =>
      prev.map((project) =>
        project.id === id
          ? {
              ...project,
              isArchived: false,
              archivedAt: undefined,
              archivedById: undefined,
              isCompleted: false,
              completedAt: undefined,
              completedById: undefined,
              completionRequestedAt: undefined,
              completionRequestedById: undefined,
              completionRequestedByName: undefined,
              completionRequestedComment: undefined,
              reopenedAt: Date.now(),
              reopenedById: user.id,
              isDeleted: false,
              deletedAt: undefined,
              deletedById: undefined
            }
          : project
      )
    );
    refreshTasks();
    const project = projects.find((item) => item.id === id);
    notifyProjectLifecycle(user, project, 'restored');
    if (!wasCompleted) {
      toastService.success('Project restored', project ? `"${project.name}" restored to active.` : 'Project restored to active.');
      return;
    }
    const restoredProjectTasks = taskService.getAllTasksForOrg(user.orgId).filter((task) => task.projectId === id);
    const finalStageId = target?.stages?.length ? target.stages[target.stages.length - 1].id : TaskStatus.DONE;
    const finalStageName = target?.stages?.length ? target.stages[target.stages.length - 1].name : 'Done';
    const allStillInFinalStage =
      restoredProjectTasks.length > 0 &&
      restoredProjectTasks.every((task) => isTaskInFinalStage(task, finalStageId));
    if (!allStillInFinalStage) {
      toastService.success('Project restored', project ? `"${project.name}" restored to active.` : 'Project restored to active.');
      return;
    }

    const previousStageId =
      target?.stages && target.stages.length > 1 ? target.stages[target.stages.length - 2].id : TaskStatus.IN_PROGRESS;
    const previousStageName =
      target?.stages && target.stages.length > 1 ? target.stages[target.stages.length - 2].name : 'In Progress';
    dialogService
      .confirm('All tasks are still in the final stage. Move one task back now?', {
        title: 'Choose next step',
        description: `You can move one task to "${previousStageName}" now, or keep all tasks done and add a new task later.`,
        confirmText: 'I will choose task',
        cancelText: 'Not now',
        danger: false
      })
      .then((moveNow) => {
        if (!moveNow) {
          toastService.info(
            'Project restored',
            project
              ? `"${project.name}" restored. Create a new task or move one task back from "${finalStageName}" when ready.`
              : 'Project restored. Create a new task or move one task back from the final stage when ready.'
          );
          return;
        }
        setActiveProjectId(id);
        setSelectedTask(null);
        onOpenMoveTasksBackPicker({
          projectId: id,
          finalStageId,
          finalStageName,
          previousStageId,
          previousStageName,
          taskIds: restoredProjectTasks.filter((task) => isTaskInFinalStage(task, finalStageId)).map((task) => task.id),
          tasks: restoredProjectTasks.filter((task) => isTaskInFinalStage(task, finalStageId))
        });
      });
  }, [user, projects, canManageProject, setProjects, setActiveProjectId, setSelectedTask, refreshTasks, onOpenMoveTasksBackPicker]);

  const handleDeleteProject = useCallback((id: string) => {
    if (!user) return;
    const project =
      projects.find((item) => item.id === id) ||
      projectService.getProjects(user.orgId).find((item) => item.id === id);
    if (!project) {
      toastService.warning('Project not found', 'Refresh workspace data and try again.');
      return;
    }
    if (project.isDeleted) {
      toastService.info('Already deleted', `"${project.name}" is already in deleted projects.`);
      return;
    }
    if (!canManageProject(project)) {
      toastService.warning('Permission denied', 'Only admins or the project creator can delete projects.');
      return;
    }
    dialogService
      .confirm(`Move "${project.name}" to deleted?`, {
        title: 'Delete project',
        description: 'This keeps project data in Deleted until permanently purged.',
        confirmText: 'Delete',
        danger: true
      })
      .then((confirmed) => {
        if (!confirmed) return;
        projectService.deleteProject(id, user.id);
        setProjects((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  isDeleted: true,
                  deletedAt: Date.now(),
                  deletedById: user.id,
                  isArchived: false,
                  archivedAt: undefined,
                  archivedById: undefined,
                  isCompleted: false,
                  completedAt: undefined,
                  completedById: undefined
                }
              : item
          )
        );
        if (activeProjectId === id) setActiveProjectId(null);
        setSelectedTask((prev) => (prev?.projectId === id ? null : prev));
        refreshTasks();
        notifyProjectLifecycle(user, project, 'deleted');
        toastService.warning('Project deleted', `"${project.name}" moved to deleted.`);
      });
  }, [user, projects, canManageProject, setProjects, activeProjectId, setActiveProjectId, setSelectedTask, refreshTasks]);

  const handlePurgeProject = useCallback((id: string) => {
    if (!user) return;
    const project = projects.find((item) => item.id === id);
    if (!canManageProject(project)) {
      toastService.warning('Permission denied', 'Only admins or the project creator can purge projects.');
      return;
    }
    dialogService
      .confirm(`Permanently purge "${project?.name || 'this project'}"?`, {
        title: 'Purge project',
        description: 'This permanently removes the project and all related tasks. This cannot be undone.',
        confirmText: 'Purge',
        danger: true
      })
      .then((confirmed) => {
        if (!confirmed) return;
        projectService.purgeProject(id);
        taskService.deleteTasksByProject(user.id, user.orgId, id);
        setProjects((prev) => prev.filter((item) => item.id !== id));
        if (activeProjectId === id) setActiveProjectId(null);
        setSelectedTask((prev) => (prev?.projectId === id ? null : prev));
        refreshTasks();
        notifyProjectLifecycle(user, project, 'purged');
        toastService.warning('Project permanently deleted', 'Project and related tasks were removed.');
      });
  }, [user, projects, canManageProject, setProjects, activeProjectId, setActiveProjectId, setSelectedTask, refreshTasks]);

  const handleBulkLifecycleAction = useCallback((action: 'archive' | 'complete' | 'delete' | 'restore', ids: string[]) => {
    ids.forEach((id) => {
      if (action === 'archive') handleArchiveProject(id);
      if (action === 'complete') handleCompleteProject(id);
      if (action === 'delete') handleDeleteProject(id);
      if (action === 'restore') handleRestoreProject(id);
    });
  }, [handleArchiveProject, handleCompleteProject, handleDeleteProject, handleRestoreProject]);

  return {
    handleRenameProject,
    handleArchiveProject,
    handleCompleteProject,
    handleReopenProject,
    handleRestoreProject,
    handleDeleteProject,
    handlePurgeProject,
    handleBulkLifecycleAction
  };
};
