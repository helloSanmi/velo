import { useMemo } from 'react';
import { Task } from '../../../types';
import { DAY_MS, LANE_MIN_WIDTH, LANE_WIDTH, ROW_HEIGHT, Span, getTaskSpan, toDayStart } from './ganttModel.shared';

interface UseGanttDerivedDataArgs {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  includeUnscheduled: boolean;
  rangeDays: 15 | 30 | 45 | 60;
  dependencyView: 'focused' | 'all' | 'off';
  focusedTaskId: string | null;
  editingDepsForTaskId: string | null;
  previewSpans: Record<string, Span>;
}

export const useGanttDerivedData = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  includeUnscheduled,
  rangeDays,
  dependencyView,
  focusedTaskId,
  editingDepsForTaskId,
  previewSpans
}: UseGanttDerivedDataArgs) => {
  const tasks = useMemo(
    () =>
      (statusFilter === 'All'
        ? statusOptions.flatMap((stage) => categorizedTasks[stage.id] || [])
        : categorizedTasks[statusFilter] || []
      ).slice().sort((a, b) => a.order - b.order),
    [categorizedTasks, statusFilter, statusOptions]
  );

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const unscheduledTasks = useMemo(() => (includeUnscheduled ? tasks.filter((task) => !task.dueDate) : []), [includeUnscheduled, tasks]);
  const scheduledTasks = useMemo(
    () =>
      tasks
        .filter((task) => Boolean(task.dueDate))
        .slice()
        .sort((a, b) => {
          const aSpan = getTaskSpan(a);
          const bSpan = getTaskSpan(b);
          const aStart = aSpan?.start ?? Number.MAX_SAFE_INTEGER;
          const bStart = bSpan?.start ?? Number.MAX_SAFE_INTEGER;
          if (aStart !== bStart) return aStart - bStart;
          const aDue = aSpan?.end ?? a.dueDate ?? Number.MAX_SAFE_INTEGER;
          const bDue = bSpan?.end ?? b.dueDate ?? Number.MAX_SAFE_INTEGER;
          if (aDue !== bDue) return aDue - bDue;
          return a.order - b.order;
        }),
    [tasks]
  );

  const now = toDayStart(Date.now());
  const dueDates = scheduledTasks.map((task) => toDayStart(task.dueDate as number));
  const minDue = dueDates.length > 0 ? Math.min(...dueDates) : now;
  const maxDue = dueDates.length > 0 ? Math.max(...dueDates) : now;
  const timelineStart = toDayStart(Math.min(now - DAY_MS * 7, minDue - DAY_MS * 7));
  const timelineEnd = toDayStart(Math.max(timelineStart + DAY_MS * (rangeDays - 1), maxDue + DAY_MS * 7));
  const totalDays = Math.floor((timelineEnd - timelineStart) / DAY_MS) + 1;
  const lanePixelWidth = Math.max(LANE_MIN_WIDTH, totalDays * LANE_WIDTH);

  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, index) => timelineStart + index * DAY_MS),
    [timelineStart, totalDays]
  );

  const monthSegments = useMemo(() => {
    const segments: Array<{ key: string; label: string; startIndex: number; dayCount: number }> = [];
    days.forEach((day, dayIndex) => {
      const date = new Date(day);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const last = segments[segments.length - 1];
      if (last && last.key === key) {
        last.dayCount += 1;
      } else {
        segments.push({ key, label, startIndex: dayIndex, dayCount: 1 });
      }
    });
    return segments;
  }, [days]);

  const bars = useMemo(() => {
    const clampDayIndex = (index: number) => Math.max(0, Math.min(totalDays - 1, index));
    return scheduledTasks
      .map((task, rowIndex) => {
        const span = getTaskSpan(task, previewSpans[task.id]);
        if (!span) return null;
        const unclampedStart = Math.floor((span.start - timelineStart) / DAY_MS);
        const unclampedEnd = Math.floor((span.end - timelineStart) / DAY_MS);
        const startIndex = clampDayIndex(unclampedStart);
        const endIndex = Math.max(startIndex, clampDayIndex(unclampedEnd));
        return {
          taskId: task.id,
          rowIndex,
          startIndex,
          endIndex,
          x1: startIndex * LANE_WIDTH + 2,
          x2: endIndex * LANE_WIDTH + Math.max(12, LANE_WIDTH - 2),
          y: rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
        };
      })
      .filter(Boolean) as Array<{ taskId: string; rowIndex: number; startIndex: number; endIndex: number; x1: number; x2: number; y: number }>;
  }, [previewSpans, scheduledTasks, timelineStart, totalDays]);

  const barsByTaskId = useMemo(() => new Map(bars.map((bar) => [bar.taskId, bar])), [bars]);
  const dependencyLines = useMemo(() => {
    const lines: Array<{
      id: string;
      d: string;
      fromTaskId: string;
      toTaskId: string;
      isFocused: boolean;
      health: 'on-track' | 'blocked-risk';
    }> = [];
    if (dependencyView === 'off') return lines;
    const focusId = editingDepsForTaskId || focusedTaskId;
    scheduledTasks.forEach((task) => {
      const toBar = barsByTaskId.get(task.id);
      if (!toBar) return;
      const toSpan = getTaskSpan(task, previewSpans[task.id]);
      if (!toSpan) return;
      (task.blockedByIds || []).forEach((depId) => {
        const fromBar = barsByTaskId.get(depId);
        if (!fromBar) return;
        const depTask = taskById.get(depId);
        if (!depTask) return;
        const fromSpan = getTaskSpan(depTask, previewSpans[depId]);
        if (!fromSpan) return;
        const isFocused = focusId ? task.id === focusId || depId === focusId : false;
        if (dependencyView === 'focused' && !isFocused) return;
        const midX = (fromBar.x2 + toBar.x1) / 2;
        const d = `M ${fromBar.x2} ${fromBar.y} C ${midX} ${fromBar.y}, ${midX} ${toBar.y}, ${toBar.x1} ${toBar.y}`;
        const health: 'on-track' | 'blocked-risk' = fromSpan.end > toSpan.start ? 'blocked-risk' : 'on-track';
        lines.push({ id: `${depId}->${task.id}`, d, fromTaskId: depId, toTaskId: task.id, isFocused, health });
      });
    });
    return lines;
  }, [barsByTaskId, dependencyView, editingDepsForTaskId, focusedTaskId, previewSpans, scheduledTasks, taskById]);

  const editingTask = useMemo(
    () => (editingDepsForTaskId ? taskById.get(editingDepsForTaskId) : undefined),
    [editingDepsForTaskId, taskById]
  );

  const dependencyCandidates = useMemo(
    () =>
      scheduledTasks.filter((task) => task.id !== editingDepsForTaskId).map((task) => ({
        id: task.id,
        title: task.title,
        status: statusOptions.find((stage) => stage.id === task.status)?.name || task.status
      })),
    [editingDepsForTaskId, scheduledTasks, statusOptions]
  );

  return {
    tasks,
    unscheduledTasks,
    scheduledTasks,
    timelineStart,
    totalDays,
    lanePixelWidth,
    days,
    monthSegments,
    dependencyLines,
    editingTask,
    dependencyCandidates
  };
};
