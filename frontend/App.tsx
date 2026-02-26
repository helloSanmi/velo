import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SecurityGroup, Task, Team, User, Project, MainViewType } from './types';
import { userService } from './services/userService';
import { projectService } from './services/projectService';
import { taskService } from './services/taskService';
import { workflowService } from './services/workflowService';
import { useTasks } from './hooks/useTasks';
import { useAccessControl } from './hooks/useAccessControl';
import { useProjectLifecycleActions } from './hooks/useProjectLifecycleActions';
import { useTaskPolicyActions } from './hooks/useTaskPolicyActions';
import { useWorkspaceBootstrap } from './hooks/useWorkspaceBootstrap';
import { useWorkspaceConnection } from './hooks/useWorkspaceConnection';
import { useActiveProjectPersistence } from './hooks/useActiveProjectPersistence';
import { useProjectManagement } from './hooks/useProjectManagement';
import { usePostSignupAdminSetup } from './hooks/usePostSignupAdminSetup';
import { useBulkTaskActions } from './hooks/useBulkTaskActions';
import { useCopilotInsights } from './hooks/useCopilotInsights';
import { useTaskModalActions } from './hooks/useTaskModalActions';
import { useProjectModalActions } from './hooks/useProjectModalActions';
import { settingsService, UserSettings } from './services/settingsService';
import { groupService } from './services/groupService';
import { teamService } from './services/teamService';

import WorkspaceLayout from './components/layout/WorkspaceLayout';
import GlobalModals from './components/modals/GlobalModals';
import PublicBoardView from './components/board/PublicBoardView';
import SelectionActionBar from './components/board/SelectionActionBar';
import Confetti from './components/ui/Confetti';
import { SettingsTabType } from './components/SettingsModal';
import DialogHost from './components/ui/DialogHost';
import ToastHost from './components/ui/ToastHost';
import { toastService } from './services/toastService';
import { syncGuardService } from './services/syncGuardService';
import { queuedTaskMutationCount, taskSyncQueueUpdatedEvent } from './services/task-service/syncQueue';
import { notificationService } from './services/notificationService';
import AuthRouter from './components/views/AuthRouter';
import WorkspaceMainView from './components/views/WorkspaceMainView';
import MoveBackReasonModal from './components/modals/MoveBackReasonModal';
import AdminSetupModal from './components/modals/AdminSetupModal';
import ProjectCompletionPromptModal from './components/modals/ProjectCompletionPromptModal';
import MoveTasksBackModal from './components/modals/MoveTasksBackModal';
import { TaskDetailTabType } from './components/task-detail/types';
import { canAccessViewForPlan, getPlanFeatures, normalizeWorkspacePlan } from './services/planFeatureService';
import { canUserAccessProject } from './services/accessPolicyService';
import {
  areAllTasksInFinalStage,
  computeCompletionPromptResetState,
  getCompletionActionLabel,
  getCompletionPromptMode,
  getReopenReleaseProjectIds,
  getStalePendingApprovalProjectIds,
  isTaskInFinalStage,
  pickTaskToMoveBackOnRejection,
  shouldEnforceCompletionApprovalLock,
  shouldAutoOpenCompletionPrompt,
  shouldShowCompletionPostponed
} from './services/completionFlowService';
import { isWorkspaceSubdomainHost } from './utils/workspaceHost';

const App: React.FC = () => {
  const parseWorkspaceTicketRoute = () => {
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    if (pathname === '/tickets') return { view: 'tickets' as MainViewType, ticketId: null as string | null };
    const ticketMatch = pathname.match(/^\/tickets\/([^/]+)$/);
    if (ticketMatch) {
      return { view: 'tickets' as MainViewType, ticketId: decodeURIComponent(ticketMatch[1]) };
    }
    return { view: null as MainViewType | null, ticketId: null as string | null };
  };

  const getCurrentViewStorageKey = (scopeUser: User) => `velo_current_view:${scopeUser.orgId}:${scopeUser.id}`;
  const getTaskContextStorageKey = (scopeUser: User) => `velo_task_context:${scopeUser.orgId}:${scopeUser.id}`;
  const isMainViewType = (value: unknown): value is MainViewType =>
    value === 'board' ||
    value === 'projects' ||
    value === 'analytics' ||
    value === 'roadmap' ||
    value === 'workflows' ||
    value === 'templates' ||
    value === 'resources' ||
    value === 'integrations' ||
    value === 'tickets';

  const [user, setUser] = useState<User | null>(() => userService.getCurrentUser());
  const [authView, setAuthView] = useState<'landing' | 'product' | 'solutions' | 'pricing' | 'support' | 'contact' | 'login' | 'register' | 'join'>(
    () => (isWorkspaceSubdomainHost() ? 'login' : 'landing')
  );
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const current = userService.getCurrentUser();
    return current ? userService.getUsers(current.orgId) : [];
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    const current = userService.getCurrentUser();
    return current ? projectService.getProjects(current.orgId) : [];
  });
  const [groups, setGroups] = useState<SecurityGroup[]>(() => {
    const current = userService.getCurrentUser();
    return current ? groupService.getGroups(current.orgId) : [];
  });
  const [teams, setTeams] = useState<Team[]>(() => {
    const current = userService.getCurrentUser();
    return current ? teamService.getTeams(current.orgId) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<MainViewType>('board');
  const [routeTicketId, setRouteTicketId] = useState<string | null>(null);
  const hasHydratedCurrentViewRef = useRef(false);
  const hasHydratedTaskContextRef = useRef(false);
  const reopenReleaseAttemptRef = useRef<Record<string, string>>({});
  const lastFinalStageMoveRef = useRef<Record<string, { actorId: string; timestamp: number }>>({});
  const completionPromptResetCutoffRef = useRef<Record<string, number>>({});
  const previousProjectLifecycleRef = useRef<Record<string, 'active' | 'completed' | 'archived' | 'deleted'>>({});
  const previousProjectPendingApprovalRef = useRef<Record<string, boolean>>({});
  const completionLockDebugStateRef = useRef<Record<string, string>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [publicProject, setPublicProject] = useState<Project | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalTemplateId, setProjectModalTemplateId] = useState<string | null>(null);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabType>('general');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailInitialTab, setTaskDetailInitialTab] = useState<TaskDetailTabType | undefined>(undefined);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [templateQuery, setTemplateQuery] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasPendingSync, setHasPendingSync] = useState(syncGuardService.hasPending());
  const [pendingSyncCount, setPendingSyncCount] = useState(() => {
    const current = userService.getCurrentUser();
    return current ? queuedTaskMutationCount(current.orgId) : 0;
  });
  const [onlineCount, setOnlineCount] = useState(1);
  const [projectCompletionPrompt, setProjectCompletionPrompt] = useState<{
    projectId: string;
    projectName: string;
    finalStageName: string;
    mode: 'direct' | 'request' | 'approve';
    requestedByName?: string;
    requestedComment?: string;
  } | null>(null);
  const [projectCompletionPromptBusy, setProjectCompletionPromptBusy] = useState(false);
  const [moveTasksBackPrompt, setMoveTasksBackPrompt] = useState<{
    projectId: string;
    finalStageId: string;
    finalStageName: string;
    previousStageId: string;
    previousStageName: string;
    taskIds: string[];
    tasks: Task[];
  } | null>(null);
  const [completionPromptSuppressUntil, setCompletionPromptSuppressUntil] = useState<Record<string, number>>({});
  const [autoCompleteDismissedProjectSignatures, setAutoCompleteDismissedProjectSignatures] = useState<Record<string, string>>({});
  
  const toggleTaskSelection = useCallback((id: string) => {
    setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(taskId => taskId !== id) : [...prev, id]);
  }, []);

  const [settings, setSettings] = useState<UserSettings>(settingsService.getSettings());

  const {
    tasks, categorizedTasks, aiLoading, aiSuggestions, activeTaskTitle,
    priorityFilter, statusFilter, tagFilter, assigneeFilter, projectFilter, searchQuery, dueStatusFilter, includeUnscheduled, dueFrom, dueTo, uniqueTags,
    confettiActive, setConfettiActive, setPriorityFilter, setStatusFilter,
    setTagFilter, setAssigneeFilter, setProjectFilter, setSearchQuery, setDueStatusFilter, setIncludeUnscheduled, setDueFrom, setDueTo, setAiSuggestions, refreshTasks,
    createTask, updateStatus, updateTask, addComment, moveTask, deleteTask,
    assistWithAI, applyAISuggestions, bulkUpdateTasks, bulkDeleteTasks, toggleTimer
  } = useTasks(user, activeProjectId || undefined);

  const refreshWorkspaceData = useCallback(() => {
    if (!user) return;
    userService.hydrateWorkspaceFromBackend(user.orgId).then((result) => {
      if (result) {
        if (syncGuardService.hasPending() && queuedTaskMutationCount(user.orgId) === 0) {
          syncGuardService.clearPending();
          setHasPendingSync(false);
        } else if (syncGuardService.hasPending()) {
          setHasPendingSync(true);
        }
        setAllUsers(result.users);
        setProjects(result.projects);
      } else {
        setAllUsers(userService.getUsers(user.orgId));
        setProjects(projectService.getProjects(user.orgId));
      }
      setGroups(groupService.getGroups(user.orgId));
      setTeams(teamService.getTeams(user.orgId));
      refreshTasks();
      setSelectedTask((prev) => {
        if (!prev) return null;
        const latest = taskService.getTaskById(prev.id);
        return latest || null;
      });
    });
  }, [user, refreshTasks]);

  useWorkspaceBootstrap({
    setUser,
    setAllUsers,
    setProjects,
    refreshTasks,
    setPublicProject,
    setIsCommandPaletteOpen
  });

  useWorkspaceConnection({
    user,
    allUsers,
    tasks,
    projects,
    settings,
    setSettings,
    setAllUsers,
    setProjects,
    setSelectedTask,
    refreshTasks,
    setIsOffline,
    setHasPendingSync,
    setOnlineCount
  });

  useEffect(() => {
    const refreshPendingSyncCount = () => {
      setPendingSyncCount(user ? queuedTaskMutationCount(user.orgId) : 0);
    };
    refreshPendingSyncCount();
    window.addEventListener(taskSyncQueueUpdatedEvent, refreshPendingSyncCount as EventListener);
    return () => window.removeEventListener(taskSyncQueueUpdatedEvent, refreshPendingSyncCount as EventListener);
  }, [user, tasks, projects, hasPendingSync]);

  useActiveProjectPersistence({
    user,
    projects,
    activeProjectId,
    currentView,
    setActiveProjectId
  });

  useEffect(() => {
    hasHydratedCurrentViewRef.current = false;
    hasHydratedTaskContextRef.current = false;
  }, [user?.id, user?.orgId]);

  useEffect(() => {
    if (!user) return;
    if (hasHydratedCurrentViewRef.current) return;
    hasHydratedCurrentViewRef.current = true;
    const stored = localStorage.getItem(getCurrentViewStorageKey(user));
    if (stored && isMainViewType(stored)) {
      setCurrentView(stored);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(getCurrentViewStorageKey(user), currentView);
  }, [user, currentView]);

  useEffect(() => {
    if (!user) return;
    const applyRoute = () => {
      const parsed = parseWorkspaceTicketRoute();
      if (parsed.view === 'tickets') {
        setCurrentView('tickets');
        setRouteTicketId(parsed.ticketId);
      } else {
        setRouteTicketId(null);
      }
    };
    applyRoute();
    window.addEventListener('popstate', applyRoute);
    return () => window.removeEventListener('popstate', applyRoute);
  }, [user]);

  const pushWorkspaceRoute = useCallback((nextPath: string) => {
    if (window.location.pathname === nextPath) return;
    window.history.pushState({}, '', nextPath);
  }, []);

  useEffect(() => {
    if (!user) return;
    const targetPath = currentView === 'tickets'
      ? routeTicketId
        ? `/tickets/${encodeURIComponent(routeTicketId)}`
        : '/tickets'
      : '/';
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, '', targetPath);
    }
  }, [user, currentView, routeTicketId]);

  const handleWorkspaceViewChange = useCallback((view: MainViewType) => {
    if (view === 'tickets') {
      setRouteTicketId(null);
      setCurrentView('tickets');
      pushWorkspaceRoute('/tickets');
      return;
    }
    setRouteTicketId(null);
    setCurrentView(view);
    pushWorkspaceRoute('/');
  }, [pushWorkspaceRoute]);

  const handleOpenTicketRoute = useCallback((ticketId: string | null) => {
    setCurrentView('tickets');
    setRouteTicketId(ticketId);
    pushWorkspaceRoute(ticketId ? `/tickets/${encodeURIComponent(ticketId)}` : '/tickets');
  }, [pushWorkspaceRoute]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ projectId?: string; actorId?: string; timestamp?: number }>;
      const projectId = custom.detail?.projectId;
      const actorId = custom.detail?.actorId;
      const timestamp = custom.detail?.timestamp;
      if (!projectId || !actorId || typeof timestamp !== 'number') return;
      lastFinalStageMoveRef.current = {
        ...lastFinalStageMoveRef.current,
        [projectId]: { actorId, timestamp }
      };
    };
    window.addEventListener('projectFinalStageTaskMoved', handler as EventListener);
    return () => window.removeEventListener('projectFinalStageTaskMoved', handler as EventListener);
  }, []);

  useEffect(() => {
    const { nextLifecycle, nextPendingApproval, nextCutoff } = computeCompletionPromptResetState({
      projects,
      previousLifecycle: previousProjectLifecycleRef.current,
      previousPendingApproval: previousProjectPendingApprovalRef.current,
      previousCutoff: completionPromptResetCutoffRef.current
    });
    completionPromptResetCutoffRef.current = nextCutoff;
    previousProjectLifecycleRef.current = nextLifecycle;
    previousProjectPendingApprovalRef.current = nextPendingApproval;
  }, [projects]);

  useEffect(() => {
    if (!user) return;
    if (hasHydratedTaskContextRef.current) return;
    if (selectedTask) {
      hasHydratedTaskContextRef.current = true;
      return;
    }
    const storageKey = getTaskContextStorageKey(user);
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      hasHydratedTaskContextRef.current = true;
      return;
    }
    let parsed: { taskId?: unknown; tab?: unknown } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      localStorage.removeItem(storageKey);
      hasHydratedTaskContextRef.current = true;
      return;
    }
    if (!parsed || typeof parsed.taskId !== 'string') {
      localStorage.removeItem(storageKey);
      hasHydratedTaskContextRef.current = true;
      return;
    }
    if (tasks.length === 0) return;
    const restoredTask = tasks.find((task) => task.id === parsed!.taskId) || taskService.getTaskById(parsed.taskId);
    if (!restoredTask) {
      localStorage.removeItem(storageKey);
      hasHydratedTaskContextRef.current = true;
      return;
    }
    if (
      parsed.tab === 'general' ||
      parsed.tab === 'dependencies' ||
      parsed.tab === 'subtasks' ||
      parsed.tab === 'comments' ||
      parsed.tab === 'activity'
    ) {
      setTaskDetailInitialTab(parsed.tab);
    }
    setSelectedTask(restoredTask);
    hasHydratedTaskContextRef.current = true;
  }, [user, tasks, selectedTask]);

  useEffect(() => {
    if (!user) return;
    const storageKey = getTaskContextStorageKey(user);
    if (!selectedTask) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        taskId: selectedTask.id,
        tab: taskDetailInitialTab || 'general'
      })
    );
  }, [user, selectedTask, taskDetailInitialTab]);

  useEffect(() => {
    if (user) {
      refreshWorkspaceData();
    }
  }, [user, refreshWorkspaceData]);

  const { isAdminSetupOpen, setIsAdminSetupOpen, completeSetup } = usePostSignupAdminSetup(
    user,
    teams,
    isSettingsOpen
  );

  const { canManageProject, canManageTask, hasTaskPermission, ensureTaskPermission } = useAccessControl({ user, projects, tasks });

  const {
    handleLogout,
    handleReset,
    handleOpenTaskFromNotification,
    handleUpdateProject,
    handleChangeProjectOwner
  } = useProjectManagement({
    user,
    allUsers,
    projects,
    refreshTasks,
    canManageProject,
    setProjects,
    setActiveProjectId,
    setSelectedTask,
    setTaskDetailInitialTab,
    setCurrentView,
    setUser,
    setAuthView
  });

  const handleOpenMoveTasksBackPicker = useCallback((payload: {
    projectId: string;
    finalStageId: string;
    finalStageName: string;
    previousStageId: string;
    previousStageName: string;
    taskIds: string[];
    tasks: Task[];
  }) => {
    const normalize = (value?: string) => (value || '').toLowerCase().trim();
    const normalizedFinalId = normalize(payload.finalStageId);
    const normalizedFinalName = normalize(payload.finalStageName);
    const fromMemory = payload.tasks || [];
    const fromOrgStore = user
      ? taskService
          .getAllTasksForOrg(user.orgId)
          .filter((task) => task.projectId === payload.projectId)
      : [];
    const mergedById = new Map<string, Task>();
    [...fromOrgStore, ...fromMemory].forEach((task) => {
      if (task.projectId !== payload.projectId) return;
      mergedById.set(task.id, task);
    });
    const candidates = Array.from(mergedById.values()).filter((task) => {
      const status = normalize(String(task.status));
      return (
        task.status === payload.finalStageId ||
        status === normalizedFinalId ||
        status === normalizedFinalName ||
        status === 'done' ||
        status === 'completed'
      );
    });

    setCurrentView('board');
    setActiveProjectId(payload.projectId);
    setMoveTasksBackPrompt({
      ...payload,
      taskIds: candidates.map((task) => task.id),
      tasks: candidates
    });
  }, [user]);

  const {
    handleRenameProject,
    handleArchiveProject,
    handleCompleteProject,
    handleReopenProject,
    handleRestoreProject,
    handleDeleteProject,
    handlePurgeProject,
    handleBulkLifecycleAction
  } = useProjectLifecycleActions({
    user,
    projects,
    activeProjectId,
    setActiveProjectId,
    setProjects,
    setSelectedTask,
    refreshTasks,
    canManageProject,
    onOpenMoveTasksBackPicker: handleOpenMoveTasksBackPicker
  });

  const {
    moveBackRequest,
    moveBackReason,
    moveBackReasonError,
    setMoveBackReason,
    closeMoveBackPrompt,
    submitMoveBackReason,
    handleMoveTaskWithPolicy,
    handleStatusUpdateWithPolicy,
    handleUpdateTaskWithPolicy,
    handleDeleteTaskWithPolicy,
    handleToggleTimerWithPolicy,
    handleCommentOnTaskWithPolicy,
    handleCreateTaskWithPolicy
  } = useTaskPolicyActions({
    user,
    tasks,
    projects,
    ensureTaskPermission,
    canManageProject,
    moveTask,
    updateStatus,
    updateTask,
    addComment,
    deleteTask,
    toggleTimer,
    createTask
  });

  const handleAssistWithAIPolicy = useCallback(
    (task: Task) => {
      if (!settings.aiSuggestions) {
        toastService.info('AI disabled', 'Enable AI in Settings to use AI task suggestions.');
        return;
      }
      if (!canManageTask(task)) {
        toastService.warning('Permission denied', 'Only project owners or admins can run AI suggestions.');
        return;
      }
      assistWithAI(task);
    },
    [assistWithAI, canManageTask, settings.aiSuggestions]
  );

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [activeProjectId, projects]);
  const allProjectTasks = useMemo(() => (user ? taskService.getAllTasksForOrg(user.orgId) : []), [user, tasks, projects]);
  const templates = useMemo(
    () =>
      workflowService
        .getTemplates()
        .filter((template) =>
          `${template.name} ${template.description}`.toLowerCase().includes(templateQuery.trim().toLowerCase())
        ),
    [templateQuery]
  );

  const themeClass = settings.theme === 'Dark' ? 'dark-theme' : settings.theme === 'Aurora' ? 'aurora-theme' : '';
  const org = useMemo(() => (user ? userService.getOrganization(user.orgId) : null), [user, allUsers.length, projects.length]);
  const workspacePlan = normalizeWorkspacePlan(org?.plan);
  const planFeatures = useMemo(() => getPlanFeatures(workspacePlan), [workspacePlan]);
  const aiFeaturesEnabled = settings.aiSuggestions && planFeatures.aiTools;
  const visibleProjects = useMemo(() => {
    if (!user) return [];
    return projects.filter((project) => canUserAccessProject({ user, project, tasks: allProjectTasks }));
  }, [allProjectTasks, projects, user]);
  const scopedProjects = useMemo(
    () => (user?.role === 'admin' ? projects : visibleProjects),
    [projects, user?.role, visibleProjects]
  );

  useEffect(() => {
    if (!activeProjectId) return;
    const hasAccess = scopedProjects.some((project) => project.id === activeProjectId);
    if (!hasAccess) setActiveProjectId(null);
  }, [activeProjectId, scopedProjects]);

  useEffect(() => {
    if (currentView === 'integrations' || currentView === 'workflows') {
      setCurrentView('board');
      toastService.info('Moved to Settings', `${currentView === 'integrations' ? 'Integrations' : 'Workflow automation'} is now in Settings.`);
      return;
    }
    if (!canAccessViewForPlan(currentView, workspacePlan)) {
      setCurrentView('board');
      toastService.warning('Upgrade required', 'Your current plan does not include that section.');
    }
  }, [currentView, workspacePlan]);

  useEffect(() => {
    if (aiFeaturesEnabled) return;
    setIsCommandCenterOpen(false);
    setIsVisionModalOpen(false);
    setAiSuggestions(null);
  }, [aiFeaturesEnabled]);

  const handleOpenSettings = useCallback((tab: SettingsTabType) => {
    setSettingsTab(tab);
    setIsProfileOpen(false);
    setIsSettingsOpen(true);
  }, []);

  const handleOpenProfile = useCallback(() => {
    setIsSettingsOpen(false);
    setIsProfileOpen(true);
  }, []);

  const canDeleteTaskById = useCallback((taskId: string) => hasTaskPermission(taskId, 'delete'), [hasTaskPermission]);
  const canToggleTaskTimerById = useCallback((taskId: string) => hasTaskPermission(taskId, 'complete'), [hasTaskPermission]);
  const canManageTaskById = useCallback((taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    return task ? canManageTask(task) : false;
  }, [tasks, canManageTask]);

  const isProjectCompletionPostponed = useCallback((projectId: string) => {
    if (!autoCompleteDismissedProjectSignatures[projectId]) return false;
    const project = projects.find((item) => item.id === projectId);
    if (!project) return false;
    const projectTasks = allProjectTasks.filter((task) => task.projectId === projectId);
    const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
    const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
    return shouldShowCompletionPostponed({
      hasDismissedSignature: true,
      isArchived: project.isArchived,
      isCompleted: project.isCompleted,
      isDeleted: project.isDeleted,
      tasks: projectTasks,
      finalStageId,
      finalStageName
    });
  }, [autoCompleteDismissedProjectSignatures, projects, allProjectTasks]);

  const getProjectCompletionActionLabel = useCallback((projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return 'Finish project';
    return getCompletionActionLabel(canManageProject(project));
  }, [projects]);

  const getProjectCompletionPendingLabel = useCallback((projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return undefined;
    const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
    const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
    const projectTasks = allProjectTasks.filter((task) => task.projectId === projectId);
    if (
      !shouldEnforceCompletionApprovalLock({
        completionRequestedAt: project.completionRequestedAt,
        completionRequestedById: project.completionRequestedById,
        isArchived: project.isArchived,
        isCompleted: project.isCompleted,
        isDeleted: project.isDeleted,
        tasks: projectTasks,
        finalStageId,
        finalStageName
      })
    ) {
      return undefined;
    }
    return 'Locked: approval pending';
  }, [projects, allProjectTasks]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const nextState: Record<string, string> = {};
    projects.forEach((project) => {
      if (project.isArchived || project.isCompleted || project.isDeleted) return;
      const signature = [
        project.completionRequestedAt || 0,
        project.completionRequestedById || '',
        project.completionRequestedByName || '',
        project.completionRequestedComment || ''
      ].join('::');
      nextState[project.id] = signature;
      const prevSignature = completionLockDebugStateRef.current[project.id];
      if (prevSignature === signature) return;
      const locked = Boolean(project.completionRequestedAt && project.completionRequestedById);
      console.debug('[completion-lock-transition]', {
        projectId: project.id,
        projectName: project.name,
        locked,
        completionRequestedAt: project.completionRequestedAt || null,
        completionRequestedById: project.completionRequestedById || null,
        completionRequestedByName: project.completionRequestedByName || null,
        source: 'projects-state-change'
      });
    });
    completionLockDebugStateRef.current = nextState;
  }, [projects]);

  const handleResumeProjectCompletion = useCallback((projectId: string) => {
    if (!user) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project || project.isArchived || project.isCompleted || project.isDeleted) return;
    const projectTasks = allProjectTasks.filter((task) => task.projectId === projectId);
    if (projectTasks.length === 0) {
      toastService.warning('No tasks', 'This project has no tasks to complete yet.');
      return;
    }
    if (projectTasks.some((task) => Boolean(task.isTimerRunning))) {
      toastService.warning('Completion blocked', 'Stop all running task timers in this project before completing it.');
      return;
    }
    const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
    const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
    if (!areAllTasksInFinalStage(projectTasks, finalStageId, finalStageName)) {
      toastService.warning('Completion blocked', `Move all project tasks into "${finalStageName}" before completing this project.`);
      return;
    }
    if (
      !canManageProject(project) &&
      shouldEnforceCompletionApprovalLock({
        completionRequestedAt: project.completionRequestedAt,
        completionRequestedById: project.completionRequestedById,
        isArchived: project.isArchived,
        isCompleted: project.isCompleted,
        isDeleted: project.isDeleted,
        tasks: projectTasks,
        finalStageId,
        finalStageName
      })
    ) {
      toastService.info(
        'Approval already pending',
        `${project.completionRequestedByName || 'A teammate'} already requested completion. Please wait for owner/admin approval.`
      );
      return;
    }
    const mode = getCompletionPromptMode({
      canManageProject: canManageProject(project),
      currentUserId: user.id,
      completionRequestedAt: project.completionRequestedAt,
      completionRequestedById: project.completionRequestedById
    });

    setProjectCompletionPrompt({
      projectId: project.id,
      projectName: project.name,
      finalStageName,
      mode,
      requestedByName: mode === 'approve' ? (project.completionRequestedByName || 'Team member') : undefined,
      requestedComment: mode === 'approve' ? project.completionRequestedComment : undefined
    });

    setAutoCompleteDismissedProjectSignatures((prev) => {
      const { [projectId]: _removed, ...rest } = prev;
      return rest;
    });
  }, [user, projects, allProjectTasks, canManageProject]);

  const getProjectCompletionSignature = useCallback((project: Project) => {
    const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
    const projectTasks = allProjectTasks.filter((task) => task.projectId === project.id);
    const taskSnapshot = projectTasks
      .map((task) => `${task.id}:${task.status}:${task.isTimerRunning ? '1' : '0'}`)
      .sort()
      .join('|');
    return [
      finalStageId,
      project.completionRequestedAt || 0,
      project.completionRequestedById || '',
      project.completionRequestedComment || '',
      taskSnapshot
    ].join('::');
  }, [allProjectTasks]);

  useEffect(() => {
    const now = Date.now();
    setCompletionPromptSuppressUntil((prev) => {
      const nextEntries = Object.entries(prev).filter(([, until]) => until > now);
      if (nextEntries.length === Object.keys(prev).length) return prev;
      return Object.fromEntries(nextEntries);
    });
  }, [projects, tasks]);

  useEffect(() => {
    if (!projectCompletionPrompt) {
      setProjectCompletionPromptBusy(false);
    }
  }, [projectCompletionPrompt]);

  useEffect(() => {
    if (!user) return;
    if (projectCompletionPrompt) return;

    const normalizeStageToken = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const findLatestFinalMove = (projectId: string, finalStageId: string, finalStageName: string) => {
      const finalStageTokens = Array.from(
        new Set(
          [
            finalStageName,
            finalStageId,
            finalStageId.replace(/-/g, ' ')
          ]
            .map(normalizeStageToken)
            .filter(Boolean)
        )
      );
      let latest: { actorId: string; actorName: string; timestamp: number } | null = null;
      allProjectTasks
        .filter((task) => task.projectId === projectId)
        .forEach((task) => {
          (task.auditLog || []).forEach((entry) => {
            const action = (entry.action || '').toLowerCase().trim();
            if (!action.startsWith('moved task to ')) return;
            const movedTo = normalizeStageToken(action.replace('moved task to ', '').trim());
            const isFinalMove = finalStageTokens.some((token) => movedTo === token || movedTo.endsWith(token));
            if (!isFinalMove) return;
            if (!entry.userId) return;
            if (!latest || entry.timestamp > latest.timestamp) {
              latest = {
                actorId: entry.userId,
                actorName: entry.displayName || 'Unknown user',
                timestamp: entry.timestamp
              };
            }
          });
        });
      if (latest) return latest;
      const fallback = lastFinalStageMoveRef.current[projectId];
      if (!fallback) return null;
      return {
        actorId: fallback.actorId,
        actorName: 'Recent actor',
        timestamp: fallback.timestamp
      };
    };

    const pendingApprovalProject = projects.find((project) => {
      if (project.isArchived || project.isCompleted || project.isDeleted) return false;
      if (project.reopenedById || project.reopenedAt) return false;
      if ((completionPromptSuppressUntil[project.id] || 0) > Date.now()) return false;
      if (autoCompleteDismissedProjectSignatures[project.id] === getProjectCompletionSignature(project)) return false;
      if (!project.completionRequestedAt || !project.completionRequestedById) return false;
      if (!canManageProject(project)) return false;
      if (project.completionRequestedById === user.id) return false;

      const projectTasks = allProjectTasks.filter((task) => task.projectId === project.id);
      if (projectTasks.length === 0) return false;
      if (projectTasks.some((task) => Boolean(task.isTimerRunning))) return false;
      const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
      const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
      return areAllTasksInFinalStage(projectTasks, finalStageId, finalStageName);
    });

    if (pendingApprovalProject) {
      const finalStageName = pendingApprovalProject.stages?.length
        ? pendingApprovalProject.stages[pendingApprovalProject.stages.length - 1].name
        : 'Done';
      setProjectCompletionPrompt({
        projectId: pendingApprovalProject.id,
        projectName: pendingApprovalProject.name,
        finalStageName,
        mode: 'approve',
        requestedByName: pendingApprovalProject.completionRequestedByName || 'Team member',
        requestedComment: pendingApprovalProject.completionRequestedComment
      });
      return;
    }

    const candidate = projects.find((project) => {
      if (project.isArchived || project.isCompleted || project.isDeleted) return false;
      if (project.reopenedById || project.reopenedAt) return false;
      if ((completionPromptSuppressUntil[project.id] || 0) > Date.now()) return false;
      if (autoCompleteDismissedProjectSignatures[project.id] === getProjectCompletionSignature(project)) return false;
      if (project.completionRequestedAt) return false;

      const projectTasks = allProjectTasks.filter((task) => task.projectId === project.id);
      if (projectTasks.length === 0) return false;
      if (projectTasks.some((task) => Boolean(task.isTimerRunning))) return false;

      const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
      const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
      const allDone = areAllTasksInFinalStage(projectTasks, finalStageId, finalStageName);
      if (!allDone) return false;
      const latestFinalMove = findLatestFinalMove(
        project.id,
        finalStageId,
        finalStageName
      );
      const resetCutoff = completionPromptResetCutoffRef.current[project.id] || 0;
      if (latestFinalMove && latestFinalMove.timestamp <= resetCutoff) return false;
      return shouldAutoOpenCompletionPrompt({
        latestFinalMoveActorId: latestFinalMove?.actorId,
        currentUserId: user.id,
        canManageProject: canManageProject(project),
        completionRequestedById: project.completionRequestedById
      });
    });

    if (!candidate) return;

    const finalStageName = candidate.stages?.length
      ? candidate.stages[candidate.stages.length - 1].name
      : 'Done';

    setProjectCompletionPrompt({
      projectId: candidate.id,
      projectName: candidate.name,
      finalStageName,
      mode: canManageProject(candidate) ? 'direct' : 'request'
    });
  }, [
    user,
    projects,
    allProjectTasks,
    canManageProject,
    completionPromptSuppressUntil,
    autoCompleteDismissedProjectSignatures,
    projectCompletionPrompt,
    getProjectCompletionSignature,
    areAllTasksInFinalStage,
    shouldAutoOpenCompletionPrompt
  ]);

  useEffect(() => {
    if (!user) return;
    setAutoCompleteDismissedProjectSignatures((prev) => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([projectId, signature]) => {
        const project = projects.find((item) => item.id === projectId);
        if (!project || project.isArchived || project.isCompleted || project.isDeleted) return;
        next[projectId] = signature;
      });
      return next;
    });
  }, [user, projects]);

  useEffect(() => {
    if (!user) return;
    const stalePendingIds = getStalePendingApprovalProjectIds(projects, allProjectTasks);
    if (stalePendingIds.length === 0) return;

    const staleIds = new Set(stalePendingIds);
    projects.forEach((project) => {
      if (!staleIds.has(project.id)) return;
      projectService.updateProject(
        project.id,
        {
          completionRequestedAt: undefined,
          completionRequestedById: undefined,
          completionRequestedByName: undefined,
          completionRequestedComment: undefined
        },
        { sync: false }
      );
    });

    setProjects((prev) =>
      prev.map((project) =>
        staleIds.has(project.id)
          ? {
              ...project,
              completionRequestedAt: undefined,
              completionRequestedById: undefined,
              completionRequestedByName: undefined,
              completionRequestedComment: undefined
            }
          : project
      )
    );
  }, [user, projects, allProjectTasks]);

  useEffect(() => {
    if (!user) return;
    const releaseIdsList = getReopenReleaseProjectIds(projects, allProjectTasks);
    const projectsToRelease = projects.filter((project) => releaseIdsList.includes(project.id));
    if (projectsToRelease.length === 0) return;

    const nextAttemptMap: Record<string, string> = {};
    projectsToRelease.forEach((project) => {
      const projectTasks = allProjectTasks.filter((task) => task.projectId === project.id);
      const taskSignature = projectTasks
        .map((task) => `${task.id}:${task.status}`)
        .sort()
        .join('|');
      const signature = [
        project.reopenedAt || 0,
        project.reopenedById || '',
        projectTasks.length,
        taskSignature
      ].join('::');
      const previousSignature = reopenReleaseAttemptRef.current[project.id];
      if (previousSignature === signature) {
        nextAttemptMap[project.id] = previousSignature;
        return;
      }
      nextAttemptMap[project.id] = signature;
      projectService.updateProject(
        project.id,
        {
          reopenedAt: undefined,
          reopenedById: undefined
        },
        { sync: canManageProject(project) }
      );
    });

    reopenReleaseAttemptRef.current = nextAttemptMap;

    const releaseIds = new Set(projectsToRelease.map((project) => project.id));
    setProjects((prev) =>
      prev.map((project) =>
        releaseIds.has(project.id)
          ? { ...project, reopenedAt: undefined, reopenedById: undefined }
          : project
      )
    );
  }, [user, projects, allProjectTasks, canManageProject]);

  const handleDeleteOrganization = useCallback(() => {
    setIsSettingsOpen(false);
    setSelectedTask(null);
    setSelectedTaskIds([]);
    setProjects([]);
    setAllUsers([]);
    setGroups([]);
    setTeams([]);
    setActiveProjectId(null);
    setCurrentView('board');
    setUser(null);
    setAuthView(isWorkspaceSubdomainHost() ? 'login' : 'landing');
  }, []);

  const getCompletionBlockReason = useCallback((projectId: string): string | null => {
    if (!user) return 'Session unavailable. Please sign in again.';
    const latestProject =
      projectService.getProjects(user.orgId).find((item) => item.id === projectId) ||
      projects.find((item) => item.id === projectId);
    if (!latestProject) return 'Project could not be found after the completion attempt.';
    if (latestProject.isCompleted) return null;
    if (latestProject.isArchived) return 'Project is archived, so completion cannot be applied.';
    if (latestProject.isDeleted) return 'Project is deleted, so completion cannot be applied.';
    if (!canManageProject(latestProject)) return 'You do not have permission to complete this project.';

    const projectTasks = taskService.getAllTasksForOrg(user.orgId).filter((task) => task.projectId === projectId);
    if (projectTasks.length === 0) return 'Project has no tasks to complete.';

    const runningTimers = projectTasks.filter((task) => Boolean(task.isTimerRunning)).length;
    if (runningTimers > 0) {
      return `${runningTimers} task timer${runningTimers === 1 ? ' is' : 's are'} still running.`;
    }

    const finalStageId = latestProject.stages?.length ? latestProject.stages[latestProject.stages.length - 1].id : 'done';
    const finalStageName = latestProject.stages?.length ? latestProject.stages[latestProject.stages.length - 1].name : 'Done';
    const outsideFinal = projectTasks.filter((task) => !isTaskInFinalStage(task, finalStageId, finalStageName));
    if (outsideFinal.length > 0) {
      const sample = outsideFinal.slice(0, 2).map((task) => `${task.title} (${task.status})`).join(', ');
      return `${outsideFinal.length} task${outsideFinal.length === 1 ? '' : 's'} not in "${finalStageName}"${sample ? `: ${sample}` : ''}.`;
    }

    return 'Completion did not persist yet. Please retry once.';
  }, [user, projects, canManageProject, isTaskInFinalStage]);

  const canMutateTaskDuringApprovalLock = useCallback((taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return false;
    const project = projects.find((item) => item.id === task.projectId);
    if (!project) return true;
    const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
    const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
    const projectTasks = allProjectTasks.filter((item) => item.projectId === project.id);
    const locked = shouldEnforceCompletionApprovalLock({
      completionRequestedAt: project.completionRequestedAt,
      completionRequestedById: project.completionRequestedById,
      isArchived: project.isArchived,
      isCompleted: project.isCompleted,
      isDeleted: project.isDeleted,
      tasks: projectTasks,
      finalStageId,
      finalStageName
    });
    if (!locked) return true;
    toastService.info(
      'Project locked for approval',
      'Task changes are locked while completion approval is pending. Wait for owner/admin approval or rejection.'
    );
    return false;
  }, [tasks, projects, allProjectTasks]);

  const {
    handleBulkPriority,
    handleBulkStatus,
    handleBulkAssignee,
    handleBulkDelete
  } = useBulkTaskActions({
    selectedTaskIds,
    setSelectedTaskIds,
    ensureTaskPermission,
    canMutateTask: canMutateTaskDuringApprovalLock,
    bulkUpdateTasks,
    bulkDeleteTasks
  });

  const { handleAddProjectFromModal } = useProjectModalActions({
    user,
    projects,
    setProjects,
    setActiveProjectId,
    setIsProjectModalOpen,
    setProjectModalTemplateId,
    onCreateTask: handleCreateTaskWithPolicy
  });

  const {
    handlePinInsightToProject,
    handleUnpinInsightFromProject,
    isProjectInsightPinned,
    activeProjectPinnedInsights
  } = useCopilotInsights({ user, activeProjectId });

  const {
    handleUpdateTaskFromModal,
    handleCommentOnTaskFromModal,
    handleGeneratedTasksFromVision,
    handleVoiceCreateTask,
    handleVoiceSetTaskPriority,
    handleVoiceAssignTask,
    handleGenerateProjectTasksWithAI
  } = useTaskModalActions({
    activeProjectId,
    selectedTask,
    setSelectedTask,
    onCreateTask: handleCreateTaskWithPolicy,
    onUpdateTask: handleUpdateTaskWithPolicy,
    onCommentTask: handleCommentOnTaskWithPolicy,
    refreshTasks
  });

  if (publicProject) {
    const projectTasks = tasks.filter((task) => task.projectId === publicProject.id);
    return <PublicBoardView project={publicProject} tasks={projectTasks} />;
  }

  if (!user) {
    return <AuthRouter authView={authView} setAuthView={setAuthView} onAuthSuccess={setUser} />;
  }

  return (
    <WorkspaceLayout user={user} allUsers={allUsers} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} projects={visibleProjects} activeProjectId={activeProjectId} currentView={currentView} themeClass={themeClass} compactMode={settings.compactMode} onLogout={handleLogout} onNewTask={() => setIsModalOpen(true)} onReset={handleReset} onRefreshData={refreshWorkspaceData} onOpenProfile={handleOpenProfile} onOpenSettings={handleOpenSettings} onOpenTaskFromNotification={handleOpenTaskFromNotification} onCloseSidebar={() => setIsSidebarOpen(false)} onProjectSelect={setActiveProjectId} onViewChange={handleWorkspaceViewChange} onOpenCommandCenter={() => aiFeaturesEnabled && setIsCommandCenterOpen(true)} onOpenVisionModal={() => aiFeaturesEnabled && setIsVisionModalOpen(true)} onAddProject={() => { setProjectModalTemplateId(null); setIsProjectModalOpen(true); }} onUpdateProject={handleUpdateProject} onCompleteProject={handleCompleteProject} onArchiveProject={handleArchiveProject} onDeleteProject={handleDeleteProject} onlineCount={onlineCount} isOnline={!isOffline} pendingSyncCount={pendingSyncCount} planFeatures={planFeatures} aiFeaturesEnabled={aiFeaturesEnabled}>
      <Confetti active={confettiActive} onComplete={() => setConfettiActive(false)} />
      <WorkspaceMainView
        currentView={currentView}
        user={user}
        tasks={tasks}
        projects={scopedProjects}
        allUsers={allUsers}
        allProjectTasks={allProjectTasks}
        activeProject={activeProject}
        visibleProjects={visibleProjects}
        categorizedTasks={categorizedTasks}
        selectedTaskIds={selectedTaskIds}
        settingsCompactMode={settings.compactMode}
        settingsShowPersonalCalibration={settings.showPersonalCalibration}
        aiFeaturesEnabled={aiFeaturesEnabled}
        templateQuery={templateQuery}
        templates={templates}
        searchQuery={searchQuery}
        projectFilter={projectFilter}
        dueStatusFilter={dueStatusFilter}
        includeUnscheduled={includeUnscheduled}
        dueFrom={dueFrom}
        dueTo={dueTo}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        tagFilter={tagFilter}
        assigneeFilter={assigneeFilter}
        uniqueTags={uniqueTags}
        setTemplateQuery={setTemplateQuery}
        setProjectModalTemplateId={setProjectModalTemplateId}
        setIsProjectModalOpen={setIsProjectModalOpen}
        setStatusFilter={setStatusFilter}
        setPriorityFilter={setPriorityFilter}
        setTagFilter={setTagFilter}
        setAssigneeFilter={setAssigneeFilter}
        setSearchQuery={setSearchQuery}
        setProjectFilter={setProjectFilter}
        setDueStatusFilter={setDueStatusFilter}
        setIncludeUnscheduled={setIncludeUnscheduled}
        setDueFrom={setDueFrom}
        setDueTo={setDueTo}
        setSelectedTaskIds={setSelectedTaskIds}
        toggleTaskSelection={toggleTaskSelection}
        handleDeleteTaskWithPolicy={handleDeleteTaskWithPolicy}
        handleStatusUpdateWithPolicy={handleStatusUpdateWithPolicy}
        handleMoveTaskWithPolicy={handleMoveTaskWithPolicy}
        assistWithAI={handleAssistWithAIPolicy}
        setSelectedTask={setSelectedTask}
        setIsModalOpen={setIsModalOpen}
        refreshTasks={refreshTasks}
        handleUpdateProject={handleUpdateProject}
        handleRenameProject={handleRenameProject}
        handleCompleteProject={handleCompleteProject}
        handleReopenProject={handleReopenProject}
        handleArchiveProject={handleArchiveProject}
        handleRestoreProject={handleRestoreProject}
        handleDeleteProject={handleDeleteProject}
        handlePurgeProject={handlePurgeProject}
        handleBulkLifecycleAction={handleBulkLifecycleAction}
        handleUpdateTaskWithPolicy={handleUpdateTaskWithPolicy}
        onToggleTimer={handleToggleTimerWithPolicy}
        canDeleteTask={canDeleteTaskById}
        canManageTask={canManageTaskById}
        canToggleTaskTimer={canToggleTaskTimerById}
        isProjectCompletionPostponed={isProjectCompletionPostponed}
        getProjectCompletionActionLabel={getProjectCompletionActionLabel}
        getProjectCompletionPendingLabel={getProjectCompletionPendingLabel}
        onResumeProjectCompletion={handleResumeProjectCompletion}
        planFeatures={planFeatures}
        onGenerateProjectTasksWithAI={aiFeaturesEnabled ? handleGenerateProjectTasksWithAI : undefined}
        pinnedInsights={activeProjectPinnedInsights}
        onUnpinInsight={
          activeProjectId
            ? (insight: string) => handleUnpinInsightFromProject(activeProjectId, insight)
            : undefined
        }
        routeTicketId={routeTicketId}
        onOpenTicketRoute={handleOpenTicketRoute}
      />
      {isOffline && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[200] rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm">
          Offline: local changes queued
        </div>
      )}
      <SelectionActionBar
        selectedCount={selectedTaskIds.length}
        allUsers={allUsers}
        onClear={() => setSelectedTaskIds([])}
        onBulkPriority={handleBulkPriority}
        onBulkStatus={handleBulkStatus}
        onBulkAssignee={handleBulkAssignee}
        onBulkDelete={handleBulkDelete}
      />
      <GlobalModals user={user} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} isProjectModalOpen={isProjectModalOpen} setIsProjectModalOpen={setIsProjectModalOpen} projectModalTemplateId={projectModalTemplateId} setProjectModalTemplateId={setProjectModalTemplateId} isCommandCenterOpen={isCommandCenterOpen} setIsCommandCenterOpen={setIsCommandCenterOpen} isVisionModalOpen={isVisionModalOpen} setIsVisionModalOpen={setIsVisionModalOpen} isCommandPaletteOpen={isCommandPaletteOpen} setIsCommandPaletteOpen={setIsCommandPaletteOpen} isProfileOpen={isProfileOpen} setIsProfileOpen={setIsProfileOpen} isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen} settingsTab={settingsTab} selectedTask={selectedTask} taskDetailInitialTab={taskDetailInitialTab} onTaskDetailTabChange={setTaskDetailInitialTab} onTaskDetailTabConsumed={() => setTaskDetailInitialTab(undefined)} setSelectedTask={setSelectedTask} aiSuggestions={aiSuggestions} setAiSuggestions={setAiSuggestions} aiLoading={aiLoading} activeTaskTitle={activeTaskTitle} tasks={tasks} projectTasks={allProjectTasks} projects={scopedProjects} activeProject={activeProject} activeProjectId={activeProjectId} aiEnabled={aiFeaturesEnabled} canAssignMembers={Boolean(activeProject && canManageProject(activeProject))} canManageTask={canManageTaskById} createTask={handleCreateTaskWithPolicy}
        handleAddProject={handleAddProjectFromModal}
        handleUpdateTask={handleUpdateTaskFromModal}
        handleCommentOnTask={handleCommentOnTaskFromModal}
        deleteTask={handleDeleteTaskWithPolicy}
        canDeleteTask={canDeleteTaskById}
        canToggleTaskTimer={canToggleTaskTimerById}
        onToggleTimer={handleToggleTimerWithPolicy}
        applyAISuggestions={applyAISuggestions}
        handleGeneratedTasks={handleGeneratedTasksFromVision}
        setActiveProjectId={setActiveProjectId}
        refreshTasks={refreshTasks}
        onRenameProject={handleRenameProject}
        onCompleteProject={handleCompleteProject}
        onReopenProject={handleReopenProject}
        onArchiveProject={handleArchiveProject}
        onRestoreProject={handleRestoreProject}
        onDeleteProject={handleDeleteProject}
        onPurgeProject={handlePurgeProject}
        onUpdateProject={handleUpdateProject}
        onChangeProjectOwner={handleChangeProjectOwner}
        onDeleteOrganization={handleDeleteOrganization}
        onUserUpdated={setUser}
        allowAiTools={aiFeaturesEnabled}
        onVoiceSelectProject={setActiveProjectId}
        onVoiceCreateTask={handleVoiceCreateTask}
        onVoiceSetTaskStatus={handleStatusUpdateWithPolicy}
        onVoiceSetTaskPriority={handleVoiceSetTaskPriority}
        onVoiceAssignTask={handleVoiceAssignTask}
        onPinInsightToProject={handlePinInsightToProject}
        onUnpinInsightFromProject={handleUnpinInsightFromProject}
        isProjectInsightPinned={isProjectInsightPinned}
      />
      <MoveBackReasonModal
        isOpen={Boolean(moveBackRequest)}
        reason={moveBackReason}
        reasonError={moveBackReasonError}
        onReasonChange={setMoveBackReason}
        onCancel={closeMoveBackPrompt}
        onSubmit={submitMoveBackReason}
      />
      <MoveTasksBackModal
        isOpen={Boolean(moveTasksBackPrompt)}
        projectName={projects.find((item) => item.id === moveTasksBackPrompt?.projectId)?.name || 'Project'}
        finalStageName={moveTasksBackPrompt?.finalStageName || 'Done'}
        previousStageName={moveTasksBackPrompt?.previousStageName || 'In Progress'}
        tasks={
          moveTasksBackPrompt
            ? (() => {
                const direct = moveTasksBackPrompt.tasks;
                if (direct.length > 0) return direct;
                const normalizedFinal = moveTasksBackPrompt.finalStageId.toLowerCase().trim();
                return allProjectTasks.filter((task) => {
                  if (task.projectId !== moveTasksBackPrompt.projectId) return false;
                  const normalizedStatus = (task.status || '').toLowerCase().trim();
                  return (
                    task.status === moveTasksBackPrompt.finalStageId ||
                    normalizedStatus === normalizedFinal ||
                    normalizedStatus === 'done' ||
                    normalizedStatus === 'completed'
                  );
                });
              })()
            : []
        }
        onClose={() => setMoveTasksBackPrompt(null)}
        onConfirm={(taskIds) => {
          if (!user || !moveTasksBackPrompt) {
            setMoveTasksBackPrompt(null);
            return;
          }
          if (taskIds.length === 0) return;
          const selected = allProjectTasks.filter((task) => taskIds.includes(task.id));
          selected.forEach((task) => {
            taskService.updateTask(user.id, user.orgId, task.id, {
              status: moveTasksBackPrompt.previousStageId,
              movedBackAt: Date.now(),
              movedBackBy: user.displayName,
              movedBackReason: 'Project reopened',
              movedBackFromStatus: task.status
            }, user.displayName);
            taskService.addComment(
              user.id,
              user.orgId,
              task.id,
              `Moved backward from ${moveTasksBackPrompt.finalStageName} to ${moveTasksBackPrompt.previousStageName}: Project reopened.`,
              user.displayName
            );
          });
          setMoveTasksBackPrompt(null);
          refreshTasks();
          toastService.success(
            'Tasks moved back',
            `${selected.length} task${selected.length === 1 ? '' : 's'} moved to ${moveTasksBackPrompt.previousStageName}.`
          );
        }}
      />
      <AdminSetupModal
        isOpen={isAdminSetupOpen}
        user={user}
        allUsers={allUsers}
        teams={teams}
        onTeamsChanged={setTeams}
        onClose={() => setIsAdminSetupOpen(false)}
        onOpenSettingsTab={(tab) => {
          setIsAdminSetupOpen(false);
          handleOpenSettings(tab);
        }}
        onComplete={() => {
          completeSetup();
          refreshWorkspaceData();
        }}
      />
      <ProjectCompletionPromptModal
        isOpen={Boolean(projectCompletionPrompt)}
        projectName={projectCompletionPrompt?.projectName || ''}
        finalStageName={projectCompletionPrompt?.finalStageName || 'Done'}
        mode={projectCompletionPrompt?.mode}
        requestedByName={projectCompletionPrompt?.requestedByName}
        requestedComment={projectCompletionPrompt?.requestedComment}
        isSubmitting={projectCompletionPromptBusy}
        onClose={() => {
          if (projectCompletionPromptBusy) return;
          if (projectCompletionPrompt) {
            const project = projects.find((item) => item.id === projectCompletionPrompt.projectId);
            if (project) {
              const signature = getProjectCompletionSignature(project);
              setAutoCompleteDismissedProjectSignatures((prev) => ({
                ...prev,
                [projectCompletionPrompt.projectId]: signature
              }));
            }
            toastService.info('Completion postponed', `You can complete "${projectCompletionPrompt.projectName}" any time from Projects.`);
          }
          setProjectCompletionPromptBusy(false);
          setProjectCompletionPrompt(null);
        }}
        onComplete={(comment) => {
          if (!projectCompletionPrompt) return;
          if (projectCompletionPromptBusy) return;
          setProjectCompletionPromptBusy(true);
          const projectId = projectCompletionPrompt.projectId;
          setCompletionPromptSuppressUntil((prev) => ({ ...prev, [projectId]: Date.now() + 4000 }));
          const note = comment.trim();
          if (projectCompletionPrompt.mode === 'request') {
            if (!note) {
              toastService.warning('Comment required', 'Add a completion comment before sending for approval.');
              setProjectCompletionPromptBusy(false);
              return;
            }
            const requestTime = Date.now();
            const latestProject =
              projectService.getProjects(user.orgId).find((item) => item.id === projectId) ||
              projects.find((item) => item.id === projectId);
            if (latestProject?.completionRequestedAt && latestProject?.completionRequestedById) {
              toastService.info(
                'Approval already pending',
                `${latestProject.completionRequestedByName || 'A teammate'} already requested completion.`
              );
              setProjectCompletionPromptBusy(false);
              setProjectCompletionPrompt(null);
              return;
            }
            handleUpdateProject(projectId, {
              completionRequestedAt: requestTime,
              completionRequestedById: user.id,
              completionRequestedByName: user.displayName,
              completionRequestedComment: note
            });
            const signatureProject = latestProject
              ? {
                  ...latestProject,
                  completionRequestedAt: requestTime,
                  completionRequestedById: user.id,
                  completionRequestedByName: user.displayName,
                  completionRequestedComment: note
                }
              : undefined;
            if (signatureProject) {
              const signature = getProjectCompletionSignature(signatureProject);
              setAutoCompleteDismissedProjectSignatures((prev) => ({
                ...prev,
                [projectId]: signature
              }));
            }
            const targetProject = projects.find((project) => project.id === projectId);
            const ownerIds = new Set(
              [
                ...(targetProject?.ownerIds || []),
                ...(targetProject?.createdBy ? [targetProject.createdBy] : [])
              ].filter(Boolean)
            );
            const adminIds = allUsers
              .filter((member) => member.orgId === user.orgId && member.role === 'admin')
              .map((member) => member.id);
            const recipientIds = Array.from(new Set([...ownerIds, ...adminIds].filter((id) => id !== user.id)));
            recipientIds.forEach((recipientId) => {
              notificationService.addNotification({
                orgId: user.orgId,
                userId: recipientId,
                title: 'Project completion approval requested',
                message: `${user.displayName} requested completion for "${projectCompletionPrompt.projectName}".`,
                type: 'SYSTEM',
                category: 'system',
                linkId: projectId
              });
            });
            toastService.info(
              'Approval requested',
              `${projectCompletionPrompt.projectName} is ready. A project owner or admin can approve completion.`
            );
            setProjectCompletionPromptBusy(false);
            setProjectCompletionPrompt(null);
            return;
          }
          const requestComment = projectCompletionPrompt.requestedComment?.trim() || '';
          const finalComment =
            projectCompletionPrompt.mode === 'approve'
              ? [requestComment, note ? `Approval note: ${note}` : ''].filter(Boolean).join('\n\n')
              : note;
          handleUpdateProject(projectId, {
            completionComment: finalComment || undefined
          });
          handleCompleteProject(projectId, { skipConfirm: true });
          window.setTimeout(() => {
            const blockReason = getCompletionBlockReason(projectId);
            if (blockReason) {
              toastService.warning('Completion still active', blockReason);
            }
          }, 250);
          setAutoCompleteDismissedProjectSignatures((prev) => {
            const { [projectId]: _removed, ...rest } = prev;
            return rest;
          });
          setProjectCompletionPromptBusy(false);
          setProjectCompletionPrompt(null);
        }}
        onReject={(comment) => {
          if (!projectCompletionPrompt) return;
          if (projectCompletionPrompt.mode !== 'approve') return;
          if (projectCompletionPromptBusy) return;
          setProjectCompletionPromptBusy(true);
          const projectId = projectCompletionPrompt.projectId;
          const project = projects.find((item) => item.id === projectId);
          if (!project) {
            setProjectCompletionPromptBusy(false);
            setProjectCompletionPrompt(null);
            return;
          }
          const finalStageId = project.stages?.length ? project.stages[project.stages.length - 1].id : 'done';
          const finalStageName = project.stages?.length ? project.stages[project.stages.length - 1].name : 'Done';
          const previousStageId =
            project.stages && project.stages.length > 1 ? project.stages[project.stages.length - 2].id : 'in-progress';
          const previousStageName =
            project.stages && project.stages.length > 1 ? project.stages[project.stages.length - 2].name : 'In Progress';
          const projectTasks = allProjectTasks.filter((task) => task.projectId === projectId);
          const requesterId = project.completionRequestedById;
          const taskToMoveBack = pickTaskToMoveBackOnRejection({
            tasks: projectTasks,
            finalStageId,
            finalStageName,
            requesterId
          });
          const rejectionNote = comment.trim();
          if (taskToMoveBack) {
            taskService.updateTask(user.id, user.orgId, taskToMoveBack.id, {
              status: previousStageId,
              movedBackAt: Date.now(),
              movedBackBy: user.displayName,
              movedBackReason: rejectionNote ? `Completion request rejected: ${rejectionNote}` : 'Completion request rejected',
              movedBackFromStatus: taskToMoveBack.status
            }, user.displayName);
            taskService.addComment(
              user.id,
              user.orgId,
              taskToMoveBack.id,
              rejectionNote
                ? `Completion request rejected. Moved from ${finalStageName} to ${previousStageName}. Reason: ${rejectionNote}`
                : `Completion request rejected. Moved from ${finalStageName} to ${previousStageName}.`,
              user.displayName
            );
          }
          handleUpdateProject(projectId, {
            completionRequestedAt: undefined,
            completionRequestedById: undefined,
            completionRequestedByName: undefined,
            completionRequestedComment: undefined
          });
          if (project.completionRequestedById && project.completionRequestedById !== user.id) {
            notificationService.addNotification({
              orgId: user.orgId,
              userId: project.completionRequestedById,
              title: 'Project completion request rejected',
              message: rejectionNote
                ? `${user.displayName} rejected completion for "${project.name}": ${rejectionNote}`
                : `${user.displayName} rejected completion for "${project.name}".`,
              type: 'SYSTEM',
              category: 'system',
              linkId: projectId
            });
          }
          refreshTasks();
          toastService.info(
            'Completion request rejected',
            taskToMoveBack
              ? `Moved "${taskToMoveBack.title}" back to ${previousStageName}.`
              : 'Request cleared. No final-stage task was available to move back.'
          );
          setProjectCompletionPromptBusy(false);
          setProjectCompletionPrompt(null);
        }}
      />
      <DialogHost />
      <ToastHost />
    </WorkspaceLayout>
  );
};

export default App;
