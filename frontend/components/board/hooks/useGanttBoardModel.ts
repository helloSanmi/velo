import React, { useState } from 'react';
import { Task } from '../../../types';
import { DAY_MS, LANE_WIDTH, ROW_HEIGHT, DragState, Span, getTaskSpan } from './ganttModel.shared';
import { useGanttDerivedData } from './useGanttDerivedData';
import { useGanttInteractions } from './useGanttInteractions';

interface UseGanttBoardModelArgs {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  includeUnscheduled: boolean;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

export const useGanttBoardModel = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  includeUnscheduled,
  onUpdateTask
}: UseGanttBoardModelArgs) => {
  const [rangeDays, setRangeDays] = useState<15 | 30 | 45 | 60>(15);
  const [dependencyView, setDependencyView] = useState<'focused' | 'all' | 'off'>('off');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [previewSpans, setPreviewSpans] = useState<Record<string, Span>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropPreviewDayIndex, setDropPreviewDayIndex] = useState<number | null>(null);
  const [editingDepsForTaskId, setEditingDepsForTaskId] = useState<string | null>(null);
  const [draftDependencyIds, setDraftDependencyIds] = useState<string[]>([]);
  const movedAtByTaskRef = React.useRef<Record<string, number>>({});

  const derived = useGanttDerivedData({
    categorizedTasks,
    statusFilter,
    statusOptions,
    includeUnscheduled,
    rangeDays,
    dependencyView,
    focusedTaskId,
    editingDepsForTaskId,
    previewSpans
  });

  const interactions = useGanttInteractions({
    onUpdateTask,
    dragState,
    previewSpans,
    setDragState,
    setPreviewSpans,
    setEditingDepsForTaskId,
    setDraftDependencyIds,
    editingDepsForTaskId,
    draftDependencyIds,
    lanePixelWidth: derived.lanePixelWidth,
    totalDays: derived.totalDays,
    timelineStart: derived.timelineStart,
    draggingTaskId,
    setDraggingTaskId,
    movedAtByTaskRef
  });

  return {
    constants: {
      dayMs: DAY_MS,
      laneWidth: LANE_WIDTH,
      rowHeight: ROW_HEIGHT
    },
    tasks: derived.tasks,
    unscheduledTasks: derived.unscheduledTasks,
    scheduledTasks: derived.scheduledTasks,
    timelineStart: derived.timelineStart,
    totalDays: derived.totalDays,
    lanePixelWidth: derived.lanePixelWidth,
    days: derived.days,
    monthSegments: derived.monthSegments,
    dependencyView,
    rangeDays,
    focusedTaskId,
    previewSpans,
    editingDepsForTaskId,
    draggingTaskId,
    dropPreviewDayIndex,
    dependencyLines: derived.dependencyLines,
    editingTask: derived.editingTask,
    dependencyCandidates: derived.dependencyCandidates,
    draftDependencyIds,
    movedAtByTaskRef,
    setDependencyView,
    setRangeDays,
    setFocusedTaskId,
    setDropPreviewDayIndex,
    setDraggingTaskId,
    setDraftDependencyIds,
    onBeginDependencyEdit: interactions.onBeginDependencyEdit,
    onCloseDependencyEdit: interactions.onCloseDependencyEdit,
    onSaveDependencies: interactions.onSaveDependencies,
    onStartDrag: interactions.onStartDrag,
    onStartResize: interactions.onStartResize,
    resolveDueDateFromDrop: interactions.resolveDueDateFromDrop,
    resolveDraggedTaskId: interactions.resolveDraggedTaskId,
    getTaskSpan,
    onUnscheduledDragStart: interactions.onUnscheduledDragStart
  };
};
