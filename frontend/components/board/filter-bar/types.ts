import { TaskPriority, User } from '../../../types';

export interface FilterBarProps {
  searchQuery: string;
  projectFilter: string | 'All';
  dueStatusFilter: 'All' | 'Scheduled' | 'Unscheduled';
  includeUnscheduled: boolean;
  projectOptions: Array<{ id: string; name: string }>;
  dueFrom?: number;
  dueTo?: number;
  statusFilter: string | 'All';
  priorityFilter: TaskPriority | 'All';
  tagFilter: string | 'All';
  assigneeFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  uniqueTags: string[];
  allUsers: User[];
  embedded?: boolean;
  compact?: boolean;
  onStatusChange: (status: string | 'All') => void;
  onPriorityChange: (priority: TaskPriority | 'All') => void;
  onTagChange: (tag: string) => void;
  onAssigneeChange: (assigneeId: string) => void;
  onSearchChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onDueStatusChange: (value: 'All' | 'Scheduled' | 'Unscheduled') => void;
  onIncludeUnscheduledChange: (value: boolean) => void;
  onDueFromChange: (value?: number) => void;
  onDueToChange: (value?: number) => void;
}
