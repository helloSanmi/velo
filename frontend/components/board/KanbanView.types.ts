import { Project, ProjectStage, Task, TaskPriority, User } from '../../types';

export interface KanbanViewProps {
  searchQuery: string;
  projectFilter: string | 'All';
  dueStatusFilter: 'All' | 'Scheduled' | 'Unscheduled';
  includeUnscheduled: boolean;
  projects: Project[];
  dueFrom?: number;
  dueTo?: number;
  statusFilter: string | 'All';
  priorityFilter: TaskPriority | 'All';
  tagFilter: string | 'All';
  assigneeFilter: string | 'All';
  uniqueTags: string[];
  allUsers: User[];
  currentUser: User;
  activeProject: Project | undefined;
  activeProjectTasks: Task[];
  categorizedTasks: Record<string, Task[]>;
  selectedTaskIds: string[];
  compactMode: boolean;
  showPersonalCalibration: boolean;
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
  deleteTask: (id: string) => void;
  handleStatusUpdate: (id: string, status: string) => void;
  moveTask: (taskId: string, targetStatus: string, targetTaskId?: string) => void;
  assistWithAI: (task: Task) => void;
  setSelectedTask: (task: Task) => void;
  setIsModalOpen: (open: boolean) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onToggleTimer?: (id: string) => void;
  canDeleteTask?: (taskId: string) => boolean;
  canUseTaskAI?: (taskId: string) => boolean;
  canToggleTaskTimer?: (taskId: string) => boolean;
  isProjectCompletionPostponed?: (projectId: string) => boolean;
  completionActionLabel?: string;
  completionPendingLabel?: string;
  onResumeProjectCompletion?: (projectId: string) => void;
  refreshTasks?: () => void;
  onUpdateProjectStages: (projectId: string, stages: ProjectStage[]) => void;
  allowSavedViews?: boolean;
  onGenerateProjectTasksWithAI?: (
    projectId: string,
    tasks: Array<{ title: string; description: string; priority: TaskPriority; tags: string[]; assigneeIds?: string[] }>
  ) => void;
  pinnedInsights?: string[];
  onUnpinInsight?: (insight: string) => void;
}
