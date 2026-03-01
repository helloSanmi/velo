import React, { useEffect, useMemo, useState } from 'react';
import { Task } from '../../types';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';

interface BoardGanttViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  includeUnscheduled: boolean;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

type ResizeEdge = 'start' | 'end';
type DragMode = ResizeEdge | 'move';
type Span = { start: number; end: number };
type DragState = {
  taskId: string;
  mode: DragMode;
  originX: number;
  originalStart: number;
  originalEnd: number;
};

const DAY_MS = 86400000;
const LANE_WIDTH = 34;
const ROW_HEIGHT = 48;
const LANE_MIN_WIDTH = 980;
const WORKDAY_MINUTES = 480;

const toDayStart = (value: number) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const getTaskSpan = (task: Task, override?: Span): Span | null => {
  if (override) return override;
  if (!task.dueDate) return null;
  const end = toDayStart(task.dueDate);
  const durationDays = Math.max(1, Math.min(20, Math.ceil((task.estimateMinutes || WORKDAY_MINUTES) / WORKDAY_MINUTES)));
  const start = end - (durationDays - 1) * DAY_MS;
  return { start, end };
};

const BoardGanttView: React.FC<BoardGanttViewProps> = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  includeUnscheduled,
  onSelectTask,
  onUpdateTask
}) => {
  const [rangeDays, setRangeDays] = useState<15 | 30 | 45 | 60>(15);
  const [dependencyView, setDependencyView] = useState<'focused' | 'all' | 'off'>('off');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [previewSpans, setPreviewSpans] = useState<Record<string, Span>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropPreviewDayIndex, setDropPreviewDayIndex] = useState<number | null>(null);
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
    return scheduledTasks
      .map((task, rowIndex) => {
        const span = getTaskSpan(task, previewSpans[task.id]);
        if (!span) return null;
        const startIndex = Math.max(0, Math.floor((span.start - timelineStart) / DAY_MS));
        const endIndex = Math.max(startIndex, Math.floor((span.end - timelineStart) / DAY_MS));
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
  }, [previewSpans, scheduledTasks, timelineStart]);

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

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaDays = Math.round((event.clientX - dragState.originX) / LANE_WIDTH);
      if (deltaDays !== 0) {
        movedAtByTaskRef.current[dragState.taskId] = Date.now();
      }
      const candidateStart =
        dragState.mode === 'move'
          ? dragState.originalStart + deltaDays * DAY_MS
          : dragState.mode === 'start'
          ? Math.min(dragState.originalEnd, dragState.originalStart + deltaDays * DAY_MS)
          : dragState.originalStart;
      const candidateEnd =
        dragState.mode === 'move'
          ? dragState.originalEnd + deltaDays * DAY_MS
          : dragState.mode === 'end'
          ? Math.max(dragState.originalStart, dragState.originalEnd + deltaDays * DAY_MS)
          : dragState.originalEnd;

      setPreviewSpans((prev) => ({
        ...prev,
        [dragState.taskId]: { start: candidateStart, end: candidateEnd }
      }));
    };

    const handleMouseUp = () => {
      const span = previewSpans[dragState.taskId];
      if (span) {
        const durationDays = Math.max(1, Math.floor((span.end - span.start) / DAY_MS) + 1);
        onUpdateTask(dragState.taskId, {
          dueDate: span.end,
          estimateMinutes: durationDays * WORKDAY_MINUTES
        });
      }
      setDragState(null);
      setPreviewSpans((prev) => {
        const next = { ...prev };
        delete next[dragState.taskId];
        return next;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, onUpdateTask, previewSpans]);

  const movedAtByTaskRef = React.useRef<Record<string, number>>({});

  const startDrag = (event: React.MouseEvent<HTMLElement>, task: Task, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    const span = getTaskSpan(task);
    if (!span) return;
    setDragState({
      taskId: task.id,
      mode,
      originX: event.clientX,
      originalStart: span.start,
      originalEnd: span.end
    });
  };

  const startResize = (event: React.MouseEvent<HTMLButtonElement>, task: Task, edge: ResizeEdge) => {
    startDrag(event, task, edge);
  };

  const beginDependencyEdit = (task: Task) => {
    setEditingDepsForTaskId(task.id);
    setDraftDependencyIds(Array.isArray(task.blockedByIds) ? task.blockedByIds : []);
  };

  const saveDependencies = () => {
    if (!editingDepsForTaskId) return;
    onUpdateTask(editingDepsForTaskId, { blockedByIds: draftDependencyIds });
    setEditingDepsForTaskId(null);
    setDraftDependencyIds([]);
  };

  const resolveDueDateFromDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const laneRect = event.currentTarget.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(event.clientX - laneRect.left, lanePixelWidth - 1));
    const dayIndex = Math.max(0, Math.min(totalDays - 1, Math.floor(offsetX / LANE_WIDTH)));
    return { dayIndex, dueDate: timelineStart + dayIndex * DAY_MS };
  };

  const resolveDraggedTaskId = (event: React.DragEvent<HTMLElement>) => {
    return (
      event.dataTransfer.getData('text/task-id') ||
      event.dataTransfer.getData('text/plain') ||
      draggingTaskId ||
      ''
    );
  };

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={`${BOARD_INNER_WRAP_CLASS} h-full`}>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden h-full">
          <div className="border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-700">Gantt chart</p>
              <p className="text-xs text-slate-500">{tasks.length} tasks</p>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="text-xs text-slate-500">Dependencies</span>
              <select
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
                value={dependencyView}
                onChange={(event) => setDependencyView(event.target.value as 'focused' | 'all' | 'off')}
              >
                <option value="focused">Focused</option>
                <option value="all">All</option>
                <option value="off">Off</option>
              </select>
              <span className="text-xs text-slate-500">Range</span>
              <select
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
                value={rangeDays}
                onChange={(event) => setRangeDays(Number(event.target.value) as 15 | 30 | 45 | 60)}
              >
                <option value={15}>15 days</option>
                <option value={30}>30 days</option>
                <option value={45}>45 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>
          </div>
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">
                <span className="inline-block h-2 w-2 rounded bg-indigo-300" />
                Bar = scheduled duration
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">Drag bar = move</span>
              <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">Drag handles = resize</span>
              <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">Deps button = edit dependencies</span>
              <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />
                Dependency on-track
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-rose-500" />
                Dependency blocked risk
              </span>
              {focusedTaskId ? (
                <button
                  type="button"
                  className="inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-indigo-700 hover:bg-indigo-100"
                  onClick={() => setFocusedTaskId(null)}
                >
                  Focused task selected · Clear
                </button>
              ) : null}
            </div>
          </div>

          {unscheduledTasks.length > 0 ? (
            <div className="border-b border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[11px] font-medium text-amber-800 mb-1">Unscheduled tasks</p>
              <p className="text-[11px] text-amber-700 mb-2">Drag a task chip onto the timeline to schedule it on that date.</p>
              <div className="flex flex-wrap gap-1.5">
                {unscheduledTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/task-id', task.id);
                      event.dataTransfer.setData('text/plain', task.id);
                      setDraggingTaskId(task.id);
                    }}
                    onDragEnd={() => {
                      setDraggingTaskId(null);
                      setDropPreviewDayIndex(null);
                    }}
                    className="rounded border border-amber-200 bg-white px-2 py-1 text-[11px] text-amber-800 hover:bg-amber-100"
                    onClick={() => onSelectTask(task)}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-auto h-[calc(100%-53px)]">
            <div className="min-w-[980px]">
              <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-slate-50">
                <div className="w-[320px] shrink-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Task
                </div>
                <div>
                  <div className="flex h-5 border-b border-slate-200 bg-slate-100">
                    {monthSegments.map((segment) => (
                      <div
                        key={segment.key}
                        style={{ width: `${segment.dayCount * LANE_WIDTH}px` }}
                        className="border-l border-slate-200 px-1 text-[10px] font-medium text-slate-600 truncate"
                        title={segment.label}
                      >
                        {segment.label}
                      </div>
                    ))}
                  </div>
                  <div className="flex">
                    {days.map((day) => {
                      const date = new Date(day);
                      return (
                        <div
                          key={day}
                          style={{ width: `${LANE_WIDTH}px` }}
                          className="h-5 border-l border-slate-200 px-1 text-[10px] text-slate-500"
                          title={date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        >
                          <div className="text-center">{date.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className="relative"
                style={{ width: `${320 + lanePixelWidth}px` }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!draggingTaskId) return;
                  const { dayIndex } = resolveDueDateFromDrop(event as unknown as React.DragEvent<HTMLDivElement>);
                  setDropPreviewDayIndex(dayIndex);
                }}
                onDragLeave={() => {
                  setDropPreviewDayIndex(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = resolveDraggedTaskId(event);
                  if (!taskId) return;
                  const { dueDate } = resolveDueDateFromDrop(event as unknown as React.DragEvent<HTMLDivElement>);
                  onUpdateTask(taskId, { dueDate });
                  setDraggingTaskId(null);
                  setDropPreviewDayIndex(null);
                }}
              >
                {scheduledTasks.map((task) => {
                  const span = getTaskSpan(task, previewSpans[task.id]);
                  if (!span) return null;
                  const durationDays = Math.max(1, Math.floor((span.end - span.start) / DAY_MS) + 1);
                  const startIndex = Math.max(0, Math.floor((span.start - timelineStart) / DAY_MS));
                  const statusName = statusOptions.find((stage) => stage.id === task.status)?.name || task.status;
                  const dependencyCount = (task.blockedByIds || []).length;
                  const startLabel = new Date(span.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  const endLabel = new Date(span.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

                  return (
                    <div key={task.id} className="flex border-b border-slate-100 min-h-[48px] hover:bg-slate-50/70">
                      <div className="w-[320px] shrink-0 px-3 py-2">
                        <div className="w-full">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              setFocusedTaskId(task.id);
                              onSelectTask(task);
                            }}
                          >
                            <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{statusName} • {task.priority}</p>
                          </button>
                          <div className="mt-1 flex items-center gap-1.5">
                            <button
                              type="button"
                              className="h-6 rounded border border-slate-300 bg-white px-1.5 text-[10px] text-slate-700 hover:bg-slate-100"
                              onClick={() => beginDependencyEdit(task)}
                              title="Edit dependencies"
                            >
                              Deps ({dependencyCount})
                            </button>
                            <span className="text-[10px] text-slate-500">
                              {startLabel} → {endLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative flex items-center" style={{ width: `${lanePixelWidth}px` }}>
                        {draggingTaskId && dropPreviewDayIndex !== null ? (
                          <div
                            className="absolute top-0 bottom-0 w-[2px] bg-emerald-500/90 pointer-events-none"
                            style={{ left: `${dropPreviewDayIndex * LANE_WIDTH}px` }}
                          >
                            <div className="absolute -top-5 left-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 whitespace-nowrap">
                              {new Date(timelineStart + dropPreviewDayIndex * DAY_MS).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </div>
                          </div>
                        ) : null}
                        <div
                          className={`absolute h-6 rounded-md border px-1 inline-flex items-center cursor-grab active:cursor-grabbing ${
                            editingDepsForTaskId === task.id
                              ? 'border-indigo-500 bg-indigo-200/95'
                              : focusedTaskId === task.id
                                ? 'border-indigo-400 bg-indigo-100'
                              : 'border-indigo-200 bg-indigo-100/90'
                          }`}
                          style={{
                            left: `${startIndex * LANE_WIDTH + 2}px`,
                            width: `${Math.max(14, durationDays * LANE_WIDTH - 4)}px`
                          }}
                          onMouseDown={(event) => {
                            setFocusedTaskId(task.id);
                            startDrag(event, task, 'move');
                          }}
                          onClick={() => {
                            const lastMovedAt = movedAtByTaskRef.current[task.id] || 0;
                            if (Date.now() - lastMovedAt < 250) return;
                            setFocusedTaskId(task.id);
                          }}
                          title="Click to focus dependency paths"
                          role="button"
                          tabIndex={0}
                        >
                          <button
                            type="button"
                            className="h-5 w-3 rounded-sm bg-indigo-300/70 hover:bg-indigo-400 cursor-ew-resize shrink-0"
                            onMouseDown={(event) => startResize(event, task, 'start')}
                            title="Drag to adjust start"
                          />
                          <span className="mx-1 truncate text-[10px] font-medium text-indigo-800">{durationDays}d</span>
                          <button
                            type="button"
                            className="h-5 w-3 rounded-sm bg-indigo-300/70 hover:bg-indigo-400 cursor-ew-resize shrink-0"
                            onMouseDown={(event) => startResize(event, task, 'end')}
                            title="Drag to adjust end"
                          />
                        </div>
                        <button
                          type="button"
                          className="absolute h-5 rounded border border-slate-300 bg-white px-1 text-[10px] text-slate-600 hover:bg-slate-50"
                          style={{ right: '6px' }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={() => onUpdateTask(task.id, { dueDate: span.end + DAY_MS })}
                          title="Push due date by 1 day"
                        >
                          +1d
                        </button>
                      </div>
                    </div>
                  );
                })}

                {dependencyLines.length > 0 ? (
                  <svg
                    className="pointer-events-none absolute left-[320px] top-0"
                    width={lanePixelWidth}
                    height={Math.max(ROW_HEIGHT * scheduledTasks.length, ROW_HEIGHT)}
                  >
                    <defs>
                      <marker id="gantt-arrow-on-track-focused" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#047857" />
                      </marker>
                      <marker id="gantt-arrow-on-track-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                      </marker>
                      <marker id="gantt-arrow-risk-focused" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#b91c1c" />
                      </marker>
                      <marker id="gantt-arrow-risk-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                      </marker>
                    </defs>
                    {dependencyLines.map((line) => (
                      (() => {
                        const isRisk = line.health === 'blocked-risk';
                        const stroke = isRisk
                          ? line.isFocused ? '#b91c1c' : '#ef4444'
                          : line.isFocused ? '#047857' : '#10b981';
                        const marker = isRisk
                          ? line.isFocused ? 'url(#gantt-arrow-risk-focused)' : 'url(#gantt-arrow-risk-muted)'
                          : line.isFocused ? 'url(#gantt-arrow-on-track-focused)' : 'url(#gantt-arrow-on-track-muted)';
                        return (
                      <path
                        key={line.id}
                        d={line.d}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={line.isFocused ? '2' : '1.5'}
                        strokeDasharray="4 3"
                        markerEnd={marker}
                      />
                        );
                      })()
                    ))}
                  </svg>
                ) : null}
              </div>

              {scheduledTasks.length === 0 ? (
                <div className="px-3 py-3">
                  <div
                    className={`rounded-lg border-2 border-dashed p-6 text-center transition ${
                      draggingTaskId ? 'border-emerald-400 bg-emerald-50/60' : 'border-slate-300 bg-slate-50'
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      const { dayIndex } = resolveDueDateFromDrop(event as unknown as React.DragEvent<HTMLDivElement>);
                      setDropPreviewDayIndex(dayIndex);
                    }}
                    onDragLeave={() => setDropPreviewDayIndex(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      const taskId = resolveDraggedTaskId(event);
                      if (!taskId) return;
                      const { dueDate } = resolveDueDateFromDrop(event as unknown as React.DragEvent<HTMLDivElement>);
                      onUpdateTask(taskId, { dueDate });
                      setDraggingTaskId(null);
                      setDropPreviewDayIndex(null);
                    }}
                  >
                    <p className="text-sm font-medium text-slate-700">No scheduled tasks yet</p>
                    <p className="mt-1 text-xs text-slate-500">Drag an unscheduled task here to place it on the timeline.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {editingTask ? (
        <div
          className="fixed inset-0 z-[220] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            setEditingDepsForTaskId(null);
            setDraftDependencyIds([]);
          }}
        >
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900 truncate">
                Dependencies for {editingTask.title}
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingDepsForTaskId(null);
                  setDraftDependencyIds([]);
                }}
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 mb-2">Select tasks that must finish before this task can start.</p>
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {dependencyCandidates.map((candidate) => {
                  const checked = draftDependencyIds.includes(candidate.id);
                  return (
                    <label key={candidate.id} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...draftDependencyIds, candidate.id]
                            : draftDependencyIds.filter((id) => id !== candidate.id);
                          setDraftDependencyIds(next);
                        }}
                      />
                      <span className="truncate">{candidate.title}</span>
                      <span className="text-slate-500 ml-auto">{candidate.status}</span>
                    </label>
                  );
                })}
                {dependencyCandidates.length === 0 ? (
                  <p className="text-xs text-slate-500">No scheduled tasks available as dependencies.</p>
                ) : null}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingDepsForTaskId(null);
                  setDraftDependencyIds([]);
                }}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDependencies}
                className="h-9 rounded-md border border-slate-900 bg-slate-900 px-3 text-sm text-white hover:bg-slate-800"
              >
                Save dependencies
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default BoardGanttView;
