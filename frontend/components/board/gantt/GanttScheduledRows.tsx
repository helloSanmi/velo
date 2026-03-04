import React from 'react';
import { Task } from '../../../types';

type Span = { start: number; end: number };
type ResizeEdge = 'start' | 'end';
type DragMode = ResizeEdge | 'move';

interface GanttScheduledRowsProps {
  scheduledTasks: Task[];
  previewSpans: Record<string, Span>;
  timelineStart: number;
  totalDays: number;
  lanePixelWidth: number;
  statusOptions: Array<{ id: string; name: string }>;
  editingDepsForTaskId: string | null;
  focusedTaskId: string | null;
  draggingTaskId: string | null;
  dropPreviewDayIndex: number | null;
  onSelectTask: (task: Task) => void;
  onBeginDependencyEdit: (task: Task) => void;
  onSetFocusedTaskId: (id: string | null) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onStartDrag: (event: React.MouseEvent<HTMLElement>, task: Task, mode: DragMode) => void;
  onStartResize: (event: React.MouseEvent<HTMLButtonElement>, task: Task, edge: ResizeEdge) => void;
  getTaskSpan: (task: Task, override?: Span) => Span | null;
  movedAtByTaskRef: React.MutableRefObject<Record<string, number>>;
  dayMs: number;
  laneWidth: number;
}

const GanttScheduledRows: React.FC<GanttScheduledRowsProps> = ({
  scheduledTasks,
  previewSpans,
  timelineStart,
  totalDays,
  lanePixelWidth,
  statusOptions,
  editingDepsForTaskId,
  focusedTaskId,
  draggingTaskId,
  dropPreviewDayIndex,
  onSelectTask,
  onBeginDependencyEdit,
  onSetFocusedTaskId,
  onUpdateTask,
  onStartDrag,
  onStartResize,
  getTaskSpan,
  movedAtByTaskRef,
  dayMs,
  laneWidth
}) => {
  return (
    <>
      {scheduledTasks.map((task) => {
        const span = getTaskSpan(task, previewSpans[task.id]);
        if (!span) return null;
        const durationDays = Math.max(1, Math.floor((span.end - span.start) / dayMs) + 1);
        const unclampedStart = Math.floor((span.start - timelineStart) / dayMs);
        const unclampedEnd = Math.floor((span.end - timelineStart) / dayMs);
        const startIndex = Math.max(0, Math.min(totalDays - 1, unclampedStart));
        const endIndex = Math.max(startIndex, Math.max(0, Math.min(totalDays - 1, unclampedEnd)));
        const visibleDurationDays = Math.max(1, endIndex - startIndex + 1);
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
                    onSetFocusedTaskId(task.id);
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
                    onClick={() => onBeginDependencyEdit(task)}
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
                  style={{ left: `${dropPreviewDayIndex * laneWidth}px` }}
                >
                  <div className="absolute -top-5 left-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 whitespace-nowrap">
                    {new Date(timelineStart + dropPreviewDayIndex * dayMs).toLocaleDateString('en-GB', {
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
                  left: `${startIndex * laneWidth + 2}px`,
                  width: `${Math.max(14, visibleDurationDays * laneWidth - 4)}px`
                }}
                onMouseDown={(event) => {
                  onSetFocusedTaskId(task.id);
                  onStartDrag(event, task, 'move');
                }}
                onClick={() => {
                  const lastMovedAt = movedAtByTaskRef.current[task.id] || 0;
                  if (Date.now() - lastMovedAt < 250) return;
                  onSetFocusedTaskId(task.id);
                }}
                title="Click to focus dependency paths"
                role="button"
                tabIndex={0}
              >
                <button
                  type="button"
                  className="h-5 w-3 rounded-sm bg-indigo-300/70 hover:bg-indigo-400 cursor-ew-resize shrink-0"
                  onMouseDown={(event) => onStartResize(event, task, 'start')}
                  title="Drag to adjust start"
                />
                <span className="mx-1 truncate text-[10px] font-medium text-indigo-800">{durationDays}d</span>
                <button
                  type="button"
                  className="h-5 w-3 rounded-sm bg-indigo-300/70 hover:bg-indigo-400 cursor-ew-resize shrink-0"
                  onMouseDown={(event) => onStartResize(event, task, 'end')}
                  title="Drag to adjust end"
                />
              </div>
              <button
                type="button"
                className="absolute h-5 rounded border border-slate-300 bg-white px-1 text-[10px] text-slate-600 hover:bg-slate-50"
                style={{ right: '6px' }}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => onUpdateTask(task.id, { dueDate: span.end + dayMs })}
                title="Push due date by 1 day"
              >
                +1d
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default GanttScheduledRows;
