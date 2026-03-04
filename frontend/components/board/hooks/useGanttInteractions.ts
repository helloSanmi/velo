import { Dispatch, DragEvent, MouseEvent, SetStateAction, useEffect } from 'react';
import { Task } from '../../../types';
import { DAY_MS, DragMode, DragState, LANE_WIDTH, ResizeEdge, Span, WORKDAY_MINUTES, getTaskSpan } from './ganttModel.shared';

interface UseGanttInteractionsArgs {
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  dragState: DragState | null;
  previewSpans: Record<string, Span>;
  setDragState: (value: DragState | null) => void;
  setPreviewSpans: Dispatch<SetStateAction<Record<string, Span>>>;
  setEditingDepsForTaskId: (value: string | null) => void;
  setDraftDependencyIds: (value: string[]) => void;
  editingDepsForTaskId: string | null;
  draftDependencyIds: string[];
  lanePixelWidth: number;
  totalDays: number;
  timelineStart: number;
  draggingTaskId: string | null;
  setDraggingTaskId: (value: string | null) => void;
  movedAtByTaskRef: { current: Record<string, number> };
}

export const useGanttInteractions = ({
  onUpdateTask,
  dragState,
  previewSpans,
  setDragState,
  setPreviewSpans,
  setEditingDepsForTaskId,
  setDraftDependencyIds,
  editingDepsForTaskId,
  draftDependencyIds,
  lanePixelWidth,
  totalDays,
  timelineStart,
  draggingTaskId,
  setDraggingTaskId,
  movedAtByTaskRef
}: UseGanttInteractionsArgs) => {
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaDays = Math.round((event.clientX - dragState.originX) / LANE_WIDTH);
      if (deltaDays !== 0) movedAtByTaskRef.current[dragState.taskId] = Date.now();
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
      setPreviewSpans((prev) => ({ ...prev, [dragState.taskId]: { start: candidateStart, end: candidateEnd } }));
    };

    const handleMouseUp = () => {
      const span = previewSpans[dragState.taskId];
      if (span) {
        const durationDays = Math.max(1, Math.floor((span.end - span.start) / DAY_MS) + 1);
        onUpdateTask(dragState.taskId, { dueDate: span.end, estimateMinutes: durationDays * WORKDAY_MINUTES });
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
  }, [dragState, movedAtByTaskRef, onUpdateTask, previewSpans, setDragState, setPreviewSpans]);

  const onStartDrag = (event: MouseEvent<HTMLElement>, task: Task, mode: DragMode) => {
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

  const onStartResize = (event: MouseEvent<HTMLButtonElement>, task: Task, edge: ResizeEdge) => {
    onStartDrag(event, task, edge);
  };

  const onBeginDependencyEdit = (task: Task) => {
    setEditingDepsForTaskId(task.id);
    setDraftDependencyIds(Array.isArray(task.blockedByIds) ? task.blockedByIds : []);
  };

  const onCloseDependencyEdit = () => {
    setEditingDepsForTaskId(null);
    setDraftDependencyIds([]);
  };

  const onSaveDependencies = () => {
    if (!editingDepsForTaskId) return;
    onUpdateTask(editingDepsForTaskId, { blockedByIds: draftDependencyIds });
    onCloseDependencyEdit();
  };

  const resolveDueDateFromDrop = (event: DragEvent<HTMLDivElement>) => {
    const laneRect = event.currentTarget.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(event.clientX - laneRect.left, lanePixelWidth - 1));
    const dayIndex = Math.max(0, Math.min(totalDays - 1, Math.floor(offsetX / LANE_WIDTH)));
    return { dayIndex, dueDate: timelineStart + dayIndex * DAY_MS };
  };

  const resolveDraggedTaskId = (event: DragEvent<HTMLElement>) =>
    event.dataTransfer.getData('text/task-id') || event.dataTransfer.getData('text/plain') || draggingTaskId || '';

  const onUnscheduledDragStart = (event: DragEvent<HTMLButtonElement>, taskId: string) => {
    event.dataTransfer.setData('text/task-id', taskId);
    event.dataTransfer.setData('text/plain', taskId);
    setDraggingTaskId(taskId);
  };

  return {
    onStartDrag,
    onStartResize,
    onBeginDependencyEdit,
    onCloseDependencyEdit,
    onSaveDependencies,
    resolveDueDateFromDrop,
    resolveDraggedTaskId,
    onUnscheduledDragStart
  };
};
