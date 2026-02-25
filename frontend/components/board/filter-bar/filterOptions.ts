import { TaskPriority } from '../../../types';
import { FilterBarProps } from './types';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterBarSelectOptions {
  projectOptions: FilterOption[];
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  assigneeOptions: FilterOption[];
  tagOptions: FilterOption[];
  dueStatusOptions: FilterOption[];
}

export const buildFilterBarSelectOptions = ({
  projectOptions,
  statusOptions,
  allUsers,
  uniqueTags
}: Pick<FilterBarProps, 'projectOptions' | 'statusOptions' | 'allUsers' | 'uniqueTags'>): FilterBarSelectOptions => ({
  projectOptions: [
    { value: 'All', label: 'All projects' },
    ...projectOptions.map((project) => ({ value: project.id, label: project.name }))
  ],
  statusOptions: [
    { value: 'All', label: 'All statuses' },
    ...statusOptions.map((status) => ({ value: status.id, label: status.name }))
  ],
  priorityOptions: [
    { value: 'All', label: 'All priorities' },
    ...Object.values(TaskPriority).map((priority) => ({ value: priority, label: priority }))
  ],
  assigneeOptions: [
    { value: 'All', label: 'All assignees' },
    { value: 'Me', label: 'Assigned to me' },
    ...allUsers.map((user) => ({ value: user.id, label: user.displayName }))
  ],
  tagOptions: [
    { value: 'All', label: 'All tags' },
    ...uniqueTags.map((tag) => ({ value: tag, label: tag }))
  ],
  dueStatusOptions: [
    { value: 'All', label: 'All due states' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Unscheduled', label: 'Unscheduled' }
  ]
});
