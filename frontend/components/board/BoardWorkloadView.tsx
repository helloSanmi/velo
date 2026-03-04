import React, { useMemo } from 'react';
import { Task, User } from '../../types';
import { getUserFullName } from '../../utils/userDisplay';
import { useState } from 'react';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';
import WorkloadAssigneeSection from './workload/WorkloadAssigneeSection';
import WorkloadSuggestions from './workload/WorkloadSuggestions';
import { WorkloadSuggestion } from './workload/types';

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

    const result: WorkloadSuggestion[] = [];
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
        <WorkloadSuggestions
          suggestions={activeSuggestions}
          onApplySuggestion={applySuggestion}
          onIgnoreSuggestion={(id) => setIgnoredSuggestionIds((prev) => new Set(prev).add(id))}
        />
        <div className="divide-y divide-slate-100">
          {data.map((entry) => (
            <WorkloadAssigneeSection
              key={entry.user.id}
              entry={entry}
              allUsers={allUsers}
              weeklyCapacityHours={WEEKLY_CAPACITY_HOURS}
              onSelectTask={onSelectTask}
              onReassign={onReassign}
            />
          ))}
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
