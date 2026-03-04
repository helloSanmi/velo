import { Project, Task, User } from '../../types';

export type EditSection = 'timeline' | 'budget' | 'scope' | 'owners' | null;

export interface ProjectsLifecycleDetailsPanelProps {
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

export interface LifecycleMetaItem {
  key: string;
  label: string;
  timestamp: number;
  actor: string;
  isApproximate: boolean;
}
