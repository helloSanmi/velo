import { Project, Task, TaskPriority, TaskStatus, User } from '../types';

export const getTaskAssigneeIds = (task: Task): string[] => {
  if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds;
  if (task.assigneeId) return [task.assigneeId];
  return [];
};

export const getDoneStageIds = (projects: Project[]) => {
  const stageIds = projects
    .map((project) => project.stages?.[project.stages.length - 1]?.id)
    .filter(Boolean) as string[];
  return Array.from(new Set([TaskStatus.DONE, ...stageIds]));
};

export const collectUniqueTags = (tasks: Task[]) => {
  const tags = new Set<string>();
  tasks.forEach((task) => task.tags?.forEach((tag) => tags.add(tag)));
  return Array.from(tags).sort();
};

export const filterTasks = ({
  tasks,
  priorityFilter,
  tagFilter,
  activeProjectId,
  assigneeFilter,
  projectFilter,
  currentUser,
  searchQuery,
  dueFrom,
  dueTo
}: {
  tasks: Task[];
  priorityFilter: TaskPriority | 'All';
  tagFilter: string | 'All';
  activeProjectId?: string;
  assigneeFilter: string | 'All';
  projectFilter: string | 'All';
  currentUser: User | null;
  searchQuery: string;
  dueFrom?: number;
  dueTo?: number;
}) => {
  return tasks.filter((task) => {
    const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
    const matchesTag = tagFilter === 'All' || task.tags?.includes(tagFilter);
    const matchesProject = activeProjectId
      ? task.projectId === activeProjectId
      : projectFilter === 'All' || task.projectId === projectFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      `${task.title} ${task.description} ${(task.tags || []).join(' ')}`
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
    const assigneeIds = getTaskAssigneeIds(task);
    const matchesAssignee =
      assigneeFilter === 'All' ||
      (assigneeFilter === 'Me' && assigneeIds.includes(currentUser?.id || '')) ||
      assigneeIds.includes(assigneeFilter);
    const due = task.dueDate;
    const matchesFrom = dueFrom ? Boolean(due && due >= dueFrom) : true;
    const matchesTo = dueTo ? Boolean(due && due <= dueTo) : true;
    return matchesPriority && matchesTag && matchesProject && matchesAssignee && matchesSearch && matchesFrom && matchesTo;
  });
};

export const categorizeTasks = (tasks: Task[]) => {
  const sortFn = (a: Task, b: Task) => a.order - b.order;
  const grouped = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = [];
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, Task[]>);
  Object.keys(grouped).forEach((key) => {
    grouped[key] = grouped[key].sort(sortFn);
  });
  return grouped;
};
