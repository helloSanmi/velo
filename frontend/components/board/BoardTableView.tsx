import React, { useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Project, Task, TaskPriority, User } from '../../types';
import { getUserFullName } from '../../utils/userDisplay';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';

interface BoardTableViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  projects: Project[];
  allUsers: User[];
  activeProject?: Project;
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onToggleTimer?: (id: string) => void;
  canToggleTaskTimer?: (taskId: string) => boolean;
}

type TableSortKey = 'order' | 'title' | 'priority' | 'dueDate' | 'assignee';
type SortDirection = 'asc' | 'desc';

const PRIORITY_RANK: Record<TaskPriority, number> = {
  [TaskPriority.HIGH]: 0,
  [TaskPriority.MEDIUM]: 1,
  [TaskPriority.LOW]: 2
};

const formatDueDate = (value?: number) => {
  if (!value) return 'Unscheduled';
  return new Date(value).toLocaleDateString('en-GB');
};
const dueDateInputValue = (value?: number) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const compareText = (left: string, right: string) => left.localeCompare(right, undefined, { sensitivity: 'base' });

const BoardTableView: React.FC<BoardTableViewProps> = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  projects,
  allUsers,
  activeProject,
  onSelectTask,
  onUpdateStatus,
  onUpdateTask,
  onToggleTimer,
  canToggleTaskTimer
}) => {
  const [sortBy, setSortBy] = useState<TableSortKey>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const usersById = useMemo(() => new Map(allUsers.map((user) => [user.id, user])), [allUsers]);
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const stageIndexById = useMemo(
    () => new Map(statusOptions.map((stage, index) => [stage.id, index])),
    [statusOptions]
  );

  const flatTasks = useMemo(() => {
    const base =
      statusFilter === 'All'
        ? statusOptions.flatMap((stage) => categorizedTasks[stage.id] || [])
        : categorizedTasks[statusFilter] || [];

    const rows = [...base];
    rows.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'title':
          result = compareText(a.title, b.title);
          break;
        case 'priority':
          result = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          break;
        case 'dueDate':
          result = (a.dueDate || Number.MAX_SAFE_INTEGER) - (b.dueDate || Number.MAX_SAFE_INTEGER);
          break;
        case 'assignee': {
          const aIds = (a.assigneeIds && a.assigneeIds.length > 0 ? a.assigneeIds : a.assigneeId ? [a.assigneeId] : []).filter(Boolean);
          const bIds = (b.assigneeIds && b.assigneeIds.length > 0 ? b.assigneeIds : b.assigneeId ? [b.assigneeId] : []).filter(Boolean);
          const aName = aIds.length > 0 ? getUserFullName(usersById.get(aIds[0] as string) || { displayName: 'Unassigned' }) : 'Unassigned';
          const bName = bIds.length > 0 ? getUserFullName(usersById.get(bIds[0] as string) || { displayName: 'Unassigned' }) : 'Unassigned';
          result = compareText(aName, bName);
          break;
        }
        case 'order':
        default: {
          const aStage = stageIndexById.get(a.status) ?? Number.MAX_SAFE_INTEGER;
          const bStage = stageIndexById.get(b.status) ?? Number.MAX_SAFE_INTEGER;
          result = aStage === bStage ? a.order - b.order : aStage - bStage;
          break;
        }
      }
      return sortDirection === 'asc' ? result : result * -1;
    });

    return rows;
  }, [categorizedTasks, sortBy, sortDirection, stageIndexById, statusFilter, statusOptions, usersById]);

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={`${BOARD_INNER_WRAP_CLASS} h-full`}>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
            <p className="text-xs md:text-sm font-medium text-slate-700">
              {flatTasks.length} task{flatTasks.length === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-2">
              <select
                className="velo-select h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as TableSortKey)}
              >
                <option value="order">Sort: Board order</option>
                <option value="title">Sort: Title</option>
                <option value="priority">Sort: Priority</option>
                <option value="dueDate">Sort: Due date</option>
                <option value="assignee">Sort: Assignee</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                {sortDirection === 'asc' ? 'Asc' : 'Desc'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Task</th>
                  {!activeProject ? (
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project</th>
                  ) : null}
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Priority</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assignees</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Set due</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tags</th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flatTasks.map((task) => {
                  const assigneeIds = Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0
                    ? task.assigneeIds
                    : task.assigneeId
                      ? [task.assigneeId]
                      : [];
                  const assigneeLabel = assigneeIds.length > 0
                    ? assigneeIds
                      .map((id) => usersById.get(id))
                      .filter(Boolean)
                      .map((user) => getUserFullName(user as User))
                      .join(', ')
                    : 'Unassigned';
                  const project = projectsById.get(task.projectId);
                  const canToggle = canToggleTaskTimer ? canToggleTaskTimer(task.id) : true;
                  const timerRunning = Boolean(task.isTimerRunning);
                  return (
                    <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectTask(task)}
                          className="text-left"
                        >
                          <p className="text-sm font-medium text-slate-900">{task.title}</p>
                          {task.description ? (
                            <p className="mt-0.5 text-xs text-slate-500 truncate max-w-[320px]">{task.description}</p>
                          ) : null}
                        </button>
                      </td>
                      {!activeProject ? (
                        <td className="px-3 py-2.5 text-xs text-slate-700">{project?.name || 'General'}</td>
                      ) : null}
                      <td className="px-3 py-2.5">
                        <select
                          value={task.status}
                          onChange={(event) => onUpdateStatus(task.id, event.target.value)}
                          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
                        >
                          {statusOptions.map((stage) => (
                            <option key={stage.id} value={stage.id}>{stage.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700 max-w-[240px] truncate" title={assigneeLabel}>
                        {assigneeLabel}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">{formatDueDate(task.dueDate)}</td>
                      <td className="px-3 py-2.5">
                        <input
                          type="date"
                          value={dueDateInputValue(task.dueDate)}
                          onChange={(event) => {
                            const value = event.target.value;
                            onUpdateTask(task.id, { dueDate: value ? new Date(`${value}T12:00:00`).getTime() : undefined });
                          }}
                          className="h-8 rounded-md border border-slate-300 bg-white px-1.5 text-xs text-slate-700"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">{task.tags?.length ? task.tags.slice(0, 3).join(', ') : '-'}</td>
                      <td className="px-3 py-2.5 text-right">
                        {onToggleTimer ? (
                          <button
                            type="button"
                            onClick={() => onToggleTimer(task.id)}
                            disabled={!canToggle}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            title={timerRunning ? 'Pause timer' : 'Start timer'}
                          >
                            {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {flatTasks.length === 0 ? (
                  <tr>
                    <td colSpan={activeProject ? 8 : 9} className="px-3 py-10 text-center text-sm text-slate-500">
                      No tasks match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};

export default BoardTableView;
