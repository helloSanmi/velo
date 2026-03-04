import { Task, User, Project, TaskPriority } from '../../types';
import { SettingsTabType } from '../SettingsModal';
import { TaskDetailTabType } from '../task-detail/types';

export interface GlobalModalsProps {
  user: User;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isProjectModalOpen: boolean;
  setIsProjectModalOpen: (open: boolean) => void;
  projectModalTemplateId?: string | null;
  setProjectModalTemplateId?: (templateId: string | null) => void;
  isCommandCenterOpen: boolean;
  setIsCommandCenterOpen: (open: boolean) => void;
  isVisionModalOpen: boolean;
  setIsVisionModalOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  settingsTab: SettingsTabType;
  selectedTask: Task | null;
  taskDetailInitialTab?: TaskDetailTabType;
  onTaskDetailTabChange: (tab: TaskDetailTabType) => void;
  onTaskDetailTabConsumed: () => void;
  setSelectedTask: (task: Task | null) => void;
  aiSuggestions: string[] | null;
  setAiSuggestions: (s: string[] | null) => void;
  aiLoading: boolean;
  activeTaskTitle: string;
  tasks: Task[];
  projectTasks: Task[];
  projects: Project[];
  activeProject?: Project;
  activeProjectId: string | null;
  aiEnabled: boolean;
  canAssignMembers: boolean;
  canManageTask: (taskId: string) => boolean;
  createTask: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags: string[],
    dueDate?: number,
    projectId?: string,
    assigneeIds?: string[],
    securityGroupIds?: string[],
    estimateMinutes?: number,
    estimateProvidedBy?: string,
    creationAuditAction?: string
  ) => void;
  handleAddProject: (
    name: string,
    description: string,
    color: string,
    members: string[],
    templateId?: string,
    aiGeneratedTasks?: any[],
    meta?: { startDate?: number; endDate?: number; budgetCost?: number; hourlyRate?: number; scopeSummary?: string; scopeSize?: number }
  ) => void;
  handleUpdateTask: (id: string, updates: any) => void;
  handleCommentOnTask: (id: string, text: string) => void;
  deleteTask: (id: string) => void;
  canDeleteTask: (taskId: string) => boolean;
  canToggleTaskTimer: (taskId: string) => boolean;
  onToggleTimer: (id: string) => void;
  applyAISuggestions: (finalSteps: string[]) => void;
  handleGeneratedTasks: (generated: any[]) => void;
  setActiveProjectId: (id: string) => void;
  refreshTasks: () => void;
  onRenameProject: (id: string, name: string) => void;
  onCompleteProject: (id: string) => void;
  onReopenProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onPurgeProject: (id: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onChangeProjectOwner: (id: string, ownerId: string) => void;
  onDeleteOrganization: () => void;
  onUserUpdated: (user: User) => void;
  allowAiTools: boolean;
  onVoiceSelectProject: (projectId: string) => void;
  onVoiceCreateTask: (
    title: string,
    description: string,
    priority: TaskPriority,
    tags?: string[],
    dueDate?: number,
    projectId?: string
  ) => void;
  onVoiceSetTaskStatus: (taskId: string, status: string) => void;
  onVoiceSetTaskPriority: (taskId: string, priority: TaskPriority) => void;
  onVoiceAssignTask: (taskId: string, assigneeId: string) => void;
  onPinInsightToProject: (projectId: string, insight: string) => void;
  onUnpinInsightFromProject: (projectId: string, insight: string) => void;
  isProjectInsightPinned: (projectId: string, insight: string) => boolean;
}
