import { MainViewType, Project, ProjectStage, ProjectTemplate, Task, TaskPriority, User } from '../../../types';
import { PlanFeatures } from '../../../services/planFeatureService';

export interface WorkspaceMainViewProps {
  currentView: MainViewType;
  user: User;
  tasks: Task[];
  projects: Project[];
  allUsers: User[];
  allProjectTasks: Task[];
  activeProject?: Project;
  visibleProjects: Project[];
  categorizedTasks: Record<string, Task[]>;
  selectedTaskIds: string[];
  settingsCompactMode: boolean;
  settingsShowPersonalCalibration: boolean;
  aiFeaturesEnabled: boolean;
  templateQuery: string;
  templates: ProjectTemplate[];
  searchQuery: string;
  projectFilter: string | 'All';
  dueStatusFilter: 'All' | 'Scheduled' | 'Unscheduled';
  includeUnscheduled: boolean;
  dueFrom?: number;
  dueTo?: number;
  statusFilter: string | 'All';
  priorityFilter: TaskPriority | 'All';
  tagFilter: string | 'All';
  assigneeFilter: string | 'All';
  uniqueTags: string[];
  setTemplateQuery: (value: string) => void;
  setProjectModalTemplateId: (value: string | null) => void;
  setIsProjectModalOpen: (value: boolean) => void;
  setStatusFilter: (s: string | 'All') => void;
  setPriorityFilter: (p: TaskPriority | 'All') => void;
  setTagFilter: (t: string) => void;
  setAssigneeFilter: (a: string) => void;
  setSearchQuery: (value: string) => void;
  setProjectFilter: (value: string | 'All') => void;
  setDueStatusFilter: (value: 'All' | 'Scheduled' | 'Unscheduled') => void;
  setIncludeUnscheduled: (value: boolean) => void;
  setDueFrom: (value?: number) => void;
  setDueTo: (value?: number) => void;
  setSelectedTaskIds: (ids: string[]) => void;
  toggleTaskSelection: (id: string) => void;
  handleDeleteTaskWithPolicy: (id: string) => void;
  handleStatusUpdateWithPolicy: (id: string, status: string) => void;
  handleMoveTaskWithPolicy: (taskId: string, targetStatus: string, targetTaskId?: string) => void;
  assistWithAI: (task: Task) => void;
  setSelectedTask: (task: Task | null) => void;
  setIsModalOpen: (open: boolean) => void;
  refreshTasks: () => void;
  handleUpdateProject: (id: string, updates: Partial<Project>) => void;
  handleRenameProject: (id: string, name: string) => void;
  handleCompleteProject: (id: string) => void;
  handleReopenProject: (id: string) => void;
  handleArchiveProject: (id: string) => void;
  handleRestoreProject: (id: string) => void;
  handleDeleteProject: (id: string) => void;
  handlePurgeProject: (id: string) => void;
  handleBulkLifecycleAction: (
    action: 'complete' | 'archive' | 'delete' | 'restore' | 'reopen' | 'purge',
    ids: string[]
  ) => void;
  handleUpdateTaskWithPolicy: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onToggleTimer?: (id: string) => void;
  canDeleteTask: (taskId: string) => boolean;
  canManageTask: (taskId: string) => boolean;
  canToggleTaskTimer: (taskId: string) => boolean;
  isProjectCompletionPostponed: (projectId: string) => boolean;
  getProjectCompletionActionLabel: (projectId: string) => string;
  getProjectCompletionPendingLabel: (projectId: string) => string | undefined;
  onResumeProjectCompletion: (projectId: string) => void;
  planFeatures: PlanFeatures;
  onGenerateProjectTasksWithAI?: (
    projectId: string,
    tasks: Array<{ title: string; description: string; priority: TaskPriority; tags: string[] }>
  ) => void;
  aiPlanEnabled?: boolean;
  aiEnabled?: boolean;
  pinnedInsights?: string[];
  onUnpinInsight?: (insight: string) => void;
  routeTicketId?: string | null;
  onOpenTicketRoute?: (ticketId: string | null) => void;
}
