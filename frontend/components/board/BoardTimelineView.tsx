import React, { useMemo, useState } from 'react';
import { Task } from '../../types';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';
import TimelineDependencyLines from './timeline/TimelineDependencyLines';
import TimelineGridHeader from './timeline/TimelineGridHeader';
import TimelineHeader from './timeline/TimelineHeader';
import TimelineTaskRow from './timeline/TimelineTaskRow';
import TimelineUnscheduled from './timeline/TimelineUnscheduled';
import { CELL_WIDTH, DAY_MS, dayStart, TimelineBar, TimelineDependencyLine } from './timeline/shared';

interface BoardTimelineViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  includeUnscheduled: boolean;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

const BoardTimelineView: React.FC<BoardTimelineViewProps> = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  includeUnscheduled,
  onSelectTask,
  onUpdateTask
}) => {
  const [rangeDays, setRangeDays] = useState<21 | 30 | 60>(30);
  const [editingDepsForTaskId, setEditingDepsForTaskId] = useState<string | null>(null);
  const [draftDependencyIds, setDraftDependencyIds] = useState<string[]>([]);

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
  const scheduledTasks = useMemo(() => tasks.filter((task) => Boolean(task.dueDate)), [tasks]);

  const nowDay = dayStart(Date.now());
  const dueDates = tasks.map((task) => task.dueDate).filter((value): value is number => typeof value === 'number');
  const minDue = dueDates.length > 0 ? Math.min(...dueDates) : nowDay;
  const maxDue = dueDates.length > 0 ? Math.max(...dueDates) : nowDay + DAY_MS * 7;
  const timelineStart = dayStart(Math.min(nowDay - DAY_MS * 3, minDue - DAY_MS * 3));
  const timelineEnd = dayStart(Math.max(timelineStart + DAY_MS * (rangeDays - 1), maxDue + DAY_MS * 3));
  const totalDays = Math.floor((timelineEnd - timelineStart) / DAY_MS) + 1;
  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, index) => timelineStart + index * DAY_MS),
    [timelineStart, totalDays]
  );

  const onDropDueDate = (event: React.DragEvent<HTMLDivElement>, dueTs: number) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/task-id');
    if (!taskId) return;
    onUpdateTask(taskId, { dueDate: dueTs });
  };

  const bars = useMemo<TimelineBar[]>(
    () =>
      scheduledTasks
        .map((task, rowIndex) => {
          const due = task.dueDate ? dayStart(task.dueDate) : undefined;
          if (!due) return null;
          const durationDays = Math.max(1, Math.min(10, Math.ceil((task.estimateMinutes || 480) / 480)));
          const endIndex = Math.floor((due - timelineStart) / DAY_MS);
          if (endIndex < 0 || endIndex >= days.length) return null;
          const startIndex = Math.max(0, endIndex - durationDays + 1);
          return {
            taskId: task.id,
            rowIndex,
            x1: startIndex * CELL_WIDTH + 2,
            x2: endIndex * CELL_WIDTH + Math.max(12, CELL_WIDTH - 2),
            y: rowIndex * 45 + 19
          };
        })
        .filter(Boolean) as TimelineBar[],
    [days.length, scheduledTasks, timelineStart]
  );
  const barsByTaskId = useMemo(() => new Map(bars.map((bar) => [bar.taskId, bar])), [bars]);
  const dependencyLines = useMemo<TimelineDependencyLine[]>(() => {
    const lines: TimelineDependencyLine[] = [];
    scheduledTasks.forEach((task) => {
      const toBar = barsByTaskId.get(task.id);
      if (!toBar) return;
      (task.blockedByIds || []).forEach((depId) => {
        const fromBar = barsByTaskId.get(depId);
        if (!fromBar) return;
        const midX = (fromBar.x2 + toBar.x1) / 2;
        const d = `M ${fromBar.x2} ${fromBar.y} C ${midX} ${fromBar.y}, ${midX} ${toBar.y}, ${toBar.x1} ${toBar.y}`;
        lines.push({ fromId: depId, toId: task.id, d });
      });
    });
    return lines;
  }, [barsByTaskId, scheduledTasks]);

  const beginEditDependencies = (task: Task) => {
    setEditingDepsForTaskId(task.id);
    setDraftDependencyIds(Array.isArray(task.blockedByIds) ? task.blockedByIds : []);
  };

  const saveDependencies = () => {
    if (!editingDepsForTaskId) return;
    onUpdateTask(editingDepsForTaskId, { blockedByIds: draftDependencyIds });
    setEditingDepsForTaskId(null);
    setDraftDependencyIds([]);
  };

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={`${BOARD_INNER_WRAP_CLASS} h-full`}>
        <div className="h-full rounded-xl border border-slate-200 bg-white overflow-hidden">
          <TimelineHeader taskCount={tasks.length} rangeDays={rangeDays} onRangeChange={setRangeDays} />

          <div className="overflow-auto">
            <div className="min-w-[980px] relative">
              <TimelineUnscheduled tasks={unscheduledTasks} onSelectTask={onSelectTask} />
              <TimelineGridHeader days={days} />

              {scheduledTasks.map((task) => (
                <TimelineTaskRow
                  key={task.id}
                  task={task}
                  tasks={tasks}
                  days={days}
                  timelineStart={timelineStart}
                  nowDay={nowDay}
                  statusOptions={statusOptions}
                  taskById={taskById}
                  editingDepsForTaskId={editingDepsForTaskId}
                  draftDependencyIds={draftDependencyIds}
                  setDraftDependencyIds={setDraftDependencyIds}
                  onSelectTask={onSelectTask}
                  onUpdateTask={onUpdateTask}
                  onBeginEditDependencies={beginEditDependencies}
                  onSaveDependencies={saveDependencies}
                  onCancelDependencyEdit={() => {
                    setEditingDepsForTaskId(null);
                    setDraftDependencyIds([]);
                  }}
                  onDropDueDate={onDropDueDate}
                />
              ))}
              <TimelineDependencyLines lines={dependencyLines} totalDays={days.length} rowCount={scheduledTasks.length} />

              {scheduledTasks.length === 0 && unscheduledTasks.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-sm text-slate-500">
                  No tasks match the current filters.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default BoardTimelineView;
