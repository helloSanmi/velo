import React from 'react';
import { Task } from '../../types';
import { BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';
import GanttDependencyModal from './gantt/GanttDependencyModal';
import GanttTimelineGrid from './gantt/GanttTimelineGrid';
import GanttTopPanels from './gantt/GanttTopPanels';
import { useGanttBoardModel } from './hooks/useGanttBoardModel';

interface BoardGanttViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: Array<{ id: string; name: string }>;
  includeUnscheduled: boolean;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

const BoardGanttView: React.FC<BoardGanttViewProps> = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  includeUnscheduled,
  onSelectTask,
  onUpdateTask
}) => {
  const gantt = useGanttBoardModel({
    categorizedTasks,
    statusFilter,
    statusOptions,
    includeUnscheduled,
    onUpdateTask
  });

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={`${BOARD_INNER_WRAP_CLASS} h-full`}>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden h-full">
          <GanttTopPanels
            tasksCount={gantt.tasks.length}
            dependencyView={gantt.dependencyView}
            rangeDays={gantt.rangeDays}
            focusedTaskId={gantt.focusedTaskId}
            unscheduledTasks={gantt.unscheduledTasks}
            onDependencyViewChange={gantt.setDependencyView}
            onRangeDaysChange={gantt.setRangeDays}
            onClearFocused={() => gantt.setFocusedTaskId(null)}
            onSelectTask={onSelectTask}
            onUnscheduledDragStart={gantt.onUnscheduledDragStart}
            onUnscheduledDragEnd={() => {
              gantt.setDraggingTaskId(null);
              gantt.setDropPreviewDayIndex(null);
            }}
          />
          <GanttTimelineGrid
            scheduledTasks={gantt.scheduledTasks}
            previewSpans={gantt.previewSpans}
            timelineStart={gantt.timelineStart}
            totalDays={gantt.totalDays}
            lanePixelWidth={gantt.lanePixelWidth}
            days={gantt.days}
            monthSegments={gantt.monthSegments}
            statusOptions={statusOptions}
            editingDepsForTaskId={gantt.editingDepsForTaskId}
            focusedTaskId={gantt.focusedTaskId}
            draggingTaskId={gantt.draggingTaskId}
            dropPreviewDayIndex={gantt.dropPreviewDayIndex}
            dependencyLines={gantt.dependencyLines}
            onSelectTask={onSelectTask}
            onBeginDependencyEdit={gantt.onBeginDependencyEdit}
            onSetFocusedTaskId={gantt.setFocusedTaskId}
            onSetDropPreviewDayIndex={gantt.setDropPreviewDayIndex}
            onSetDraggingTaskId={gantt.setDraggingTaskId}
            onUpdateTask={onUpdateTask}
            onStartDrag={gantt.onStartDrag}
            onStartResize={gantt.onStartResize}
            resolveDueDateFromDrop={gantt.resolveDueDateFromDrop}
            resolveDraggedTaskId={gantt.resolveDraggedTaskId}
            getTaskSpan={gantt.getTaskSpan}
            movedAtByTaskRef={gantt.movedAtByTaskRef}
            dayMs={gantt.constants.dayMs}
            laneWidth={gantt.constants.laneWidth}
            rowHeight={gantt.constants.rowHeight}
          />
        </div>
      </div>
      {gantt.editingTask ? (
        <GanttDependencyModal
          editingTaskTitle={gantt.editingTask.title}
          dependencyCandidates={gantt.dependencyCandidates}
          draftDependencyIds={gantt.draftDependencyIds}
          onDraftDependencyIdsChange={gantt.setDraftDependencyIds}
          onClose={gantt.onCloseDependencyEdit}
          onSave={gantt.onSaveDependencies}
        />
      ) : null}
    </main>
  );
};

export default BoardGanttView;
