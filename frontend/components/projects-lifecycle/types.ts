import { Project } from '../../types';

export type StatusFilter = 'All' | 'Active' | 'Archived' | 'Completed' | 'Deleted';

export const statusOrder: Record<Exclude<StatusFilter, 'All'>, number> = {
  Active: 0,
  Completed: 1,
  Archived: 2,
  Deleted: 3
};

export const getProjectStatus = (project: Project): Exclude<StatusFilter, 'All'> => {
  if (project.isDeleted) return 'Deleted';
  if (project.isArchived) return 'Archived';
  if (project.isCompleted) return 'Completed';
  return 'Active';
};

export const getStatusStyles = (status: Exclude<StatusFilter, 'All'>) => {
  if (status === 'Active') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'Completed') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (status === 'Archived') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
};
