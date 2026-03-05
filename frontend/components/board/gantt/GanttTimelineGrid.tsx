import React from 'react';
import { Task } from '../../../types';
import GanttDependencyLinesSvg from './GanttDependencyLinesSvg';
import GanttScheduledRows from './GanttScheduledRows';

type Span = { start: number; end: number };
type ResizeEdge = 'start' | 'end';
type DragMode = ResizeEdge | 'move';

interface GanttTimelineGridProps {
  scheduledTasks: Task[];
  previewSpans: Record<string, Span>;
  timelineStart: number;
  totalDays: number;
  lanePixelWidth: number;
  days: number[];
  monthSegments: Array<{ key: string; label: string; startIndex: number; dayCount: number }>;
  statusOptions: Array<{ id: string; name: string }>;
  editingDepsForTaskId: string | null;
  focusedTaskId: string | null;
  draggingTaskId: string | null;
  dropPreviewDayIndex: number | null;
  dependencyLines: Array<{
    id: string;
    d: string;
    isFocused: boolean;
    health: 'on-track' | 'blocked-risk';
  }>;
  onSelectTask: (task: Task) => void;
  onBeginDependencyEdit: (task: Task) => void;
  onSetFocusedTaskId: (id: string | null) => void;
  onSetDropPreviewDayIndex: (index: number | null) => void;
  onSetDraggingTaskId: (id: string | null) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onStartDrag: (event: React.MouseEvent<HTMLElement>, task: Task, mode: DragMode) => void;
  onStartResize: (event: React.MouseEvent<HTMLButtonElement>, task: Task, edge: ResizeEdge) => void;
  resolveDueDateFromDrop: (event: React.DragEvent<HTMLDivElement>) => { dayIndex: number; dueDate: number };
  resolveDraggedTaskId: (event: React.DragEvent<HTMLElement>) => string;
  getTaskSpan: (task: Task, override?: Span) => Span | null;
  movedAtByTaskRef: React.MutableRefObject<Record<string, number>>;
  dayMs: number;
  laneWidth: number;
  rowHeight: number;
}

const GanttTimelineGrid: React.FC<GanttTimelineGridProps> = ({
  scheduledTasks,
  previewSpans,
  timelineStart,
  totalDays,
  lanePixelWidth,
  days,
  monthSegments,
  statusOptions,
  editingDepsForTaskId,
  focusedTaskId,
  draggingTaskId,
  dropPreviewDayIndex,
  dependencyLines,
  onSelectTask,
  onBeginDependencyEdit,
  onSetFocusedTaskId,
  onSetDropPreviewDayIndex,
  onSetDraggingTaskId,
  onUpdateTask,
  onStartDrag,
  onStartResize,
  resolveDueDateFromDrop,
  resolveDraggedTaskId,
  getTaskSpan,
  movedAtByTaskRef,
  dayMs,
  laneWidth,
  rowHeight
}) => {
  // Keep a small render gutter so right-edge bars/handles are never clipped.
  const GANTT_EDGE_GUTTER_PX = 20;
  const renderLanePixelWidth = lanePixelWidth + GANTT_EDGE_GUTTER_PX;

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="min-w-[980px] pb-4">
        <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-slate-50">
          <div className="w-[320px] shrink-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Task
          </div>
          <div>
            <div className="flex h-5 border-b border-slate-200 bg-slate-100">
              {monthSegments.map((segment) => (
                <div
                  key={segment.key}
                  style={{ width: `${segment.dayCount * laneWidth}px` }}
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
                    style={{ width: `${laneWidth}px` }}
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
          style={{ width: `${320 + renderLanePixelWidth}px` }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!draggingTaskId) return;
            const { dayIndex } = resolveDueDateFromDrop(event as unknown as React.DragEvent<HTMLDivElement>);
            onSetDropPreviewDayIndex(dayIndex);
          }}
          onDragLeave={() => onSetDropPreviewDayIndex(null)}
          onDrop={(event) => {
            event.preventDefault();
            const taskId = resolveDraggedTaskId(event);
            if (!taskId) return;
            const { dueDate } = resolveDueDateFromDrop(event as unknown as React.DragEvent<HTMLDivElement>);
            onUpdateTask(taskId, { dueDate });
            onSetDraggingTaskId(null);
            onSetDropPreviewDayIndex(null);
          }}
        >
          <GanttScheduledRows
            scheduledTasks={scheduledTasks}
            previewSpans={previewSpans}
            timelineStart={timelineStart}
            totalDays={totalDays}
            lanePixelWidth={renderLanePixelWidth}
            statusOptions={statusOptions}
            editingDepsForTaskId={editingDepsForTaskId}
            focusedTaskId={focusedTaskId}
            draggingTaskId={draggingTaskId}
            dropPreviewDayIndex={dropPreviewDayIndex}
            onSelectTask={onSelectTask}
            onBeginDependencyEdit={onBeginDependencyEdit}
            onSetFocusedTaskId={onSetFocusedTaskId}
            onUpdateTask={onUpdateTask}
            onStartDrag={onStartDrag}
            onStartResize={onStartResize}
            getTaskSpan={getTaskSpan}
            movedAtByTaskRef={movedAtByTaskRef}
            dayMs={dayMs}
            laneWidth={laneWidth}
          />
          <GanttDependencyLinesSvg
            dependencyLines={dependencyLines}
            lanePixelWidth={renderLanePixelWidth}
            rowHeight={rowHeight}
            rowCount={scheduledTasks.length}
          />
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
                onSetDropPreviewDayIndex(dayIndex);
              }}
              onDragLeave={() => onSetDropPreviewDayIndex(null)}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = resolveDraggedTaskId(event);
                if (!taskId) return;
                const { dueDate } = resolveDueDateFromDrop(event as unknown as React.DragEvent<HTMLDivElement>);
                onUpdateTask(taskId, { dueDate });
                onSetDraggingTaskId(null);
                onSetDropPreviewDayIndex(null);
              }}
            >
              <p className="text-sm font-medium text-slate-700">No scheduled tasks yet</p>
              <p className="mt-1 text-xs text-slate-500">Drag an unscheduled task here to place it on the timeline.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GanttTimelineGrid;
