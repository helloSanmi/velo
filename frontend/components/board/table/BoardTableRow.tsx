import React from 'react';
import { Pause, Play } from 'lucide-react';
import { Project, Task, User } from '../../../types';
import { getUserFullName } from '../../../utils/userDisplay';

interface BoardTableRowProps {
  task: Task;
  statusOptions: Array<{ id: string; name: string }>;
  usersById: Map<string, User>;
  project?: Project;
  showProjectColumn: boolean;
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onToggleTimer?: (id: string) => void;
  canToggleTaskTimer?: (taskId: string) => boolean;
}

const formatDueDate = (value?: number) => (value ? new Date(value).toLocaleDateString('en-GB') : 'Unscheduled');
const dueDateInputValue = (value?: number) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const BoardTableRow: React.FC<BoardTableRowProps> = ({
  task,
  statusOptions,
  usersById,
  project,
  showProjectColumn,
  onSelectTask,
  onUpdateStatus,
  onUpdateTask,
  onToggleTimer,
  canToggleTaskTimer
}) => {
  const assigneeIds =
    Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0 ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
  const assigneeLabel =
    assigneeIds.length > 0
      ? assigneeIds
          .map((id) => usersById.get(id))
          .filter(Boolean)
          .map((user) => getUserFullName(user as User))
          .join(', ')
      : 'Unassigned';
  const canToggle = canToggleTaskTimer ? canToggleTaskTimer(task.id) : true;
  const timerRunning = Boolean(task.isTimerRunning);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/70">
      <td className="px-3 py-2.5">
        <button type="button" onClick={() => onSelectTask(task)} className="text-left">
          <p className="text-sm font-medium text-slate-900">{task.title}</p>
          {task.description ? <p className="mt-0.5 text-xs text-slate-500 truncate max-w-[320px]">{task.description}</p> : null}
        </button>
      </td>
      {showProjectColumn ? <td className="px-3 py-2.5 text-xs text-slate-700">{project?.name || 'General'}</td> : null}
      <td className="px-3 py-2.5">
        <select
          value={task.status}
          onChange={(event) => onUpdateStatus(task.id, event.target.value)}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
        >
          {statusOptions.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
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
};

export default BoardTableRow;
