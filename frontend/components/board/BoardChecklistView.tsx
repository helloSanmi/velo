import React, { useMemo, useState } from 'react';
import { ProjectStage, Task } from '../../types';
import { createId } from '../../utils/id';
import ChecklistColumn from './ChecklistColumn';
import {
  BOARD_INNER_WRAP_CLASS,
  BOARD_OUTER_WRAP_CLASS
} from './layout';

interface BoardChecklistViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: ProjectStage[];
  allUsers: Array<{ id: string; displayName: string }>;
  density: 'comfortable' | 'compact';
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onMoveTask: (taskId: string, targetStatus: string, targetTaskId?: string) => void;
  onAddNewTask: () => void;
}

const BoardChecklistView: React.FC<BoardChecklistViewProps> = ({
  categorizedTasks,
  statusFilter,
  statusOptions,
  allUsers,
  density,
  onSelectTask,
  onUpdateTask,
  onMoveTask,
  onAddNewTask
}) => {
  const [draftSubtaskByTaskId, setDraftSubtaskByTaskId] = useState<Record<string, string>>({});
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const isCompact = density === 'compact';

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach((user) => map.set(user.id, user.displayName));
    return map;
  }, [allUsers]);

  const visibleColumns = statusOptions
    .map((status) => ({
      id: status.id,
      title: status.name,
      tasks: categorizedTasks[status.id] || []
    }))
    .filter((column) => statusFilter === 'All' || column.id === statusFilter);

  const singleColumn = visibleColumns.length === 1;
  const shouldStretchColumns = !singleColumn && visibleColumns.length <= 3;
  const stretchGridClass =
    visibleColumns.length === 2
      ? 'md:grid-cols-2'
      : visibleColumns.length === 3
        ? 'md:grid-cols-3'
        : 'md:grid-cols-1';

  const toggleSubtask = (task: Task, subtaskId: string) => {
    const nextSubtasks = (task.subtasks || []).map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, isCompleted: !subtask.isCompleted } : subtask
    );
    onUpdateTask(task.id, { subtasks: nextSubtasks });
  };

  const addSubtask = (task: Task) => {
    const title = (draftSubtaskByTaskId[task.id] || '').trim();
    if (!title) return;
    const nextSubtasks = [...(task.subtasks || []), { id: createId(), title, isCompleted: false }];
    onUpdateTask(task.id, { subtasks: nextSubtasks });
    setDraftSubtaskByTaskId((prev) => ({ ...prev, [task.id]: '' }));
  };

  const updateDraftSubtask = (taskId: string, value: string) => {
    setDraftSubtaskByTaskId((prev) => ({ ...prev, [taskId]: value }));
  };

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={`${singleColumn ? 'max-w-[840px] mx-auto' : BOARD_INNER_WRAP_CLASS} h-full`}>
        <div className={`px-1 h-full ${singleColumn ? '' : 'overflow-x-auto custom-scrollbar pb-2'}`}>
          <div
            className={`${
              singleColumn
                ? 'grid grid-cols-1 h-full'
                : shouldStretchColumns
                  ? `flex gap-3 h-full min-w-max pr-2 snap-x snap-mandatory md:grid md:min-w-0 ${stretchGridClass} md:gap-4`
                  : `flex gap-3 h-full min-w-max pr-2 snap-x snap-mandatory md:gap-4`
            }`}
          >
            {visibleColumns.map((column, index) => (
              <ChecklistColumn
                key={column.id}
                id={column.id}
                title={column.title}
                index={index}
                tasks={column.tasks}
                isCompact={isCompact}
                singleColumn={singleColumn}
                shouldStretchColumns={shouldStretchColumns}
                dragOverStatus={dragOverStatus}
                userMap={userMap}
                draftSubtaskByTaskId={draftSubtaskByTaskId}
                onSetDragOverStatus={setDragOverStatus}
                onSelectTask={onSelectTask}
                onMoveTask={onMoveTask}
                onAddNewTask={onAddNewTask}
                onToggleSubtask={toggleSubtask}
                onDraftSubtaskChange={updateDraftSubtask}
                onAddSubtask={addSubtask}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default BoardChecklistView;
