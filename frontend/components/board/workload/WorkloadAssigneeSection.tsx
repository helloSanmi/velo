import React from 'react';
import { Task, User } from '../../../types';
import { getUserFullName } from '../../../utils/userDisplay';

interface WorkloadEntry {
  user: User;
  tasks: Task[];
  hours: number;
}

interface WorkloadAssigneeSectionProps {
  entry: WorkloadEntry;
  allUsers: User[];
  weeklyCapacityHours: number;
  onSelectTask: (task: Task) => void;
  onReassign: (taskId: string, userId: string) => void;
}

const WorkloadAssigneeSection: React.FC<WorkloadAssigneeSectionProps> = ({
  entry,
  allUsers,
  weeklyCapacityHours,
  onSelectTask,
  onReassign
}) => {
  const utilization = Math.round((entry.hours / weeklyCapacityHours) * 100);
  const tone =
    utilization > 110
      ? 'bg-rose-100 text-rose-700'
      : utilization > 85
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700';

  return (
    <section key={entry.user.id} className="p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{getUserFullName(entry.user)}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">{entry.hours.toFixed(1)}h</span>
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>{utilization}%</span>
        </div>
      </div>
      <div className="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${
            utilization > 110 ? 'bg-rose-500' : utilization > 85 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(100, utilization)}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {entry.tasks.slice(0, 6).map((task) => (
          <div key={task.id} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-1">
            <button
              type="button"
              onClick={() => onSelectTask(task)}
              className="text-[11px] text-slate-700 hover:text-slate-900 truncate max-w-[160px]"
              title={task.title}
            >
              {task.title}
            </button>
            <select
              value={entry.user.id}
              onChange={(event) => onReassign(task.id, event.target.value)}
              className="h-6 rounded border border-slate-300 bg-white px-1 text-[10px] text-slate-700"
              title="Reassign task"
            >
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {getUserFullName(user)}
                </option>
              ))}
            </select>
          </div>
        ))}
        {entry.tasks.length > 6 ? <span className="text-[11px] text-slate-500">+{entry.tasks.length - 6} more</span> : null}
      </div>
    </section>
  );
};

export default WorkloadAssigneeSection;
