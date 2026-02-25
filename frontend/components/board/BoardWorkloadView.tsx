import React, { useMemo } from 'react';
import { Task, User } from '../../types';
import { getUserFullName } from '../../utils/userDisplay';
import { useState } from 'react';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';

interface BoardWorkloadViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  allUsers: User[];
  onSelectTask: (task: Task) => void;
  onReassign: (taskId: string, userId: string) => void;
}

const WEEKLY_CAPACITY_HOURS = 40;
const OVER_CAPACITY_THRESHOLD = 100;
const UNDER_CAPACITY_THRESHOLD = 70;

const BoardWorkloadView: React.FC<BoardWorkloadViewProps> = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  allUsers,
  onSelectTask,
  onReassign
}) => {
  const [ignoredSuggestionIds, setIgnoredSuggestionIds] = useState<Set<string>>(new Set());
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(new Set());

  const tasks = useMemo(
    () =>
      statusFilter === 'All'
        ? statusOptions.flatMap((stage) => categorizedTasks[stage.id] || [])
        : categorizedTasks[statusFilter] || [],
    [categorizedTasks, statusFilter, statusOptions]
  );

  const data = useMemo(() => {
    const map = new Map<string, { user: User; tasks: Task[]; hours: number }>();
    allUsers.forEach((user) => map.set(user.id, { user, tasks: [], hours: 0 }));

    tasks.forEach((task) => {
      const assigneeIds = Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0
        ? task.assigneeIds
        : task.assigneeId
          ? [task.assigneeId]
          : [];
      if (assigneeIds.length === 0) return;
      const estimateHours = Math.max(0.5, (task.estimateMinutes || 240) / 60);
      const perAssignee = estimateHours / assigneeIds.length;
      assigneeIds.forEach((assigneeId) => {
        const entry = map.get(assigneeId);
        if (!entry) return;
        entry.tasks.push(task);
        entry.hours += perAssignee;
      });
    });

    return Array.from(map.values())
      .filter((entry) => entry.tasks.length > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [allUsers, tasks]);

  const suggestions = useMemo(() => {
    const overloaded = data.filter((entry) => (entry.hours / WEEKLY_CAPACITY_HOURS) * 100 > OVER_CAPACITY_THRESHOLD);
    const underloaded = data
      .filter((entry) => (entry.hours / WEEKLY_CAPACITY_HOURS) * 100 < UNDER_CAPACITY_THRESHOLD)
      .slice()
      .sort((a, b) => a.hours - b.hours);

    const result: Array<{ id: string; task: Task; fromUserId: string; toUserId: string; fromName: string; toName: string }> = [];
    overloaded.forEach((source) => {
      const candidateTasks = source.tasks
        .slice()
        .sort((a, b) => (b.estimateMinutes || 0) - (a.estimateMinutes || 0));
      candidateTasks.forEach((task) => {
        const target = underloaded[0];
        if (!target) return;
        if (target.user.id === source.user.id) return;
        const suggestionId = `${task.id}:${source.user.id}->${target.user.id}`;
        if (result.some((item) => item.id === suggestionId)) return;
        result.push({
          id: suggestionId,
          task,
          fromUserId: source.user.id,
          toUserId: target.user.id,
          fromName: getUserFullName(source.user),
          toName: getUserFullName(target.user)
        });
        const load = Math.max(0.5, (task.estimateMinutes || 240) / 60);
        target.hours += load;
        if (result.length >= 8) return;
      });
    });
    return result;
  }, [data]);

  const activeSuggestions = suggestions.filter((suggestion) => !ignoredSuggestionIds.has(suggestion.id) && !appliedSuggestionIds.has(suggestion.id));

  const applySuggestion = (suggestionId: string) => {
    const suggestion = suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) return;
    onReassign(suggestion.task.id, suggestion.toUserId);
    setAppliedSuggestionIds((prev) => new Set(prev).add(suggestionId));
  };

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={BOARD_INNER_WRAP_CLASS}>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-3 py-2">
          <p className="text-sm font-medium text-slate-700">Workload by assignee</p>
          <p className="text-xs text-slate-500 mt-0.5">Capacity baseline: {WEEKLY_CAPACITY_HOURS}h per week</p>
        </div>
        {activeSuggestions.length > 0 ? (
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-700">Auto-balance suggestions</p>
              <button
                type="button"
                className="h-7 rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-700 hover:bg-slate-100"
                onClick={() => activeSuggestions.forEach((suggestion) => applySuggestion(suggestion.id))}
              >
                Apply all
              </button>
            </div>
            <div className="mt-2 space-y-1.5">
              {activeSuggestions.slice(0, 4).map((suggestion) => (
                <div key={suggestion.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1.5">
                  <p className="text-[11px] text-slate-700">
                    Move <span className="font-medium">{suggestion.task.title}</span> from {suggestion.fromName} to {suggestion.toName}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="h-6 rounded border border-slate-300 bg-white px-1.5 text-[10px] text-slate-700 hover:bg-slate-50"
                      onClick={() => applySuggestion(suggestion.id)}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      className="h-6 rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-600 hover:bg-slate-50"
                      onClick={() => setIgnoredSuggestionIds((prev) => new Set(prev).add(suggestion.id))}
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="divide-y divide-slate-100">
          {data.map((entry) => {
            const utilization = Math.round((entry.hours / WEEKLY_CAPACITY_HOURS) * 100);
            const tone =
              utilization > 110 ? 'bg-rose-100 text-rose-700' : utilization > 85 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
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
                  <div className={`h-full ${utilization > 110 ? 'bg-rose-500' : utilization > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, utilization)}%` }} />
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
                          <option key={user.id} value={user.id}>{getUserFullName(user)}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {entry.tasks.length > 6 ? <span className="text-[11px] text-slate-500">+{entry.tasks.length - 6} more</span> : null}
                </div>
              </section>
            );
          })}
          {data.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-sm text-slate-500">
              No assigned tasks match current filters.
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </main>
  );
};

export default BoardWorkloadView;
