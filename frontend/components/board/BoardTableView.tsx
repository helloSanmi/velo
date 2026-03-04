import React, { useMemo, useState } from 'react';
import { Project, Task, TaskPriority, User } from '../../types';
import { getUserFullName } from '../../utils/userDisplay';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';
import BoardTableControls, { SortDirection, TableSortKey } from './table/BoardTableControls';
import BoardTableRow from './table/BoardTableRow';

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

const PRIORITY_RANK: Record<TaskPriority, number> = {
  [TaskPriority.HIGH]: 0,
  [TaskPriority.MEDIUM]: 1,
  [TaskPriority.LOW]: 2
};

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
          <BoardTableControls
            taskCount={flatTasks.length}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortByChange={setSortBy}
            onToggleSortDirection={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          />

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
                  const project = projectsById.get(task.projectId);
                  return (
                    <BoardTableRow
                      key={task.id}
                      task={task}
                      statusOptions={statusOptions}
                      usersById={usersById}
                      project={project}
                      showProjectColumn={!activeProject}
                      onSelectTask={onSelectTask}
                      onUpdateStatus={onUpdateStatus}
                      onUpdateTask={onUpdateTask}
                      onToggleTimer={onToggleTimer}
                      canToggleTaskTimer={canToggleTaskTimer}
                    />
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
