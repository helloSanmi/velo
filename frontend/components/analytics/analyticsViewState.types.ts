import { Project, Task, User } from '../../types';

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  impact: 'high' | 'medium';
  taskIds: string[];
  taskNames: string[];
  applyLabel: string;
  apply: () => void;
}

export interface UseAnalyticsViewStateArgs {
  tasks: Task[];
  projects: Project[];
  allUsers: User[];
  orgId: string;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}
