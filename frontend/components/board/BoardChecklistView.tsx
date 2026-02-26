import React, { useMemo, useState } from 'react';
import { Check, Circle, GripVertical, Plus, PlusCircle } from 'lucide-react';
import { ProjectStage, Task } from '../../types';
import { createId } from '../../utils/id';
import { BOARD_CONTENT_GUTTER_CLASS, BOARD_INNER_WRAP_CLASS, BOARD_OUTER_WRAP_CLASS } from './layout';

interface BoardChecklistViewProps {
  categorizedTasks: Record<string, Task[]>;
  statusFilter: string | 'All';
  statusOptions: ProjectStage[];
  allUsers: Array<{ id: string; displayName: string }>;
  compactMode?: boolean;
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
  compactMode = false,
  onSelectTask,
  onUpdateTask,
  onMoveTask,
  onAddNewTask
}) => {
  const [draftSubtaskByTaskId, setDraftSubtaskByTaskId] = useState<Record<string, string>>({});
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    if (typeof window === 'undefined') return compactMode ? 'compact' : 'comfortable';
    const saved = window.localStorage.getItem('velo_checklist_density');
    if (saved === 'comfortable' || saved === 'compact') return saved;
    return compactMode ? 'compact' : 'comfortable';
  });
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

  return (
    <main className={`flex-1 min-h-0 overflow-y-auto ${BOARD_OUTER_WRAP_CLASS} pb-4 md:pb-8`}>
      <div className={`${BOARD_INNER_WRAP_CLASS} ${BOARD_CONTENT_GUTTER_CLASS} h-full`}>
        <div className="flex items-center justify-end pb-2">
          <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => {
                setDensity('comfortable');
                if (typeof window !== 'undefined') window.localStorage.setItem('velo_checklist_density', 'comfortable');
              }}
              className={`h-7 px-2 rounded text-[11px] font-medium transition-colors ${
                !isCompact ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Comfortable
            </button>
            <button
              type="button"
              onClick={() => {
                setDensity('compact');
                if (typeof window !== 'undefined') window.localStorage.setItem('velo_checklist_density', 'compact');
              }}
              className={`h-7 px-2 rounded text-[11px] font-medium transition-colors ${
                isCompact ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Compact
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 ${isCompact ? 'gap-3' : 'gap-4'} h-full`}>
          {visibleColumns.map((column, index) => (
            <section
              key={column.id}
              className={`h-full min-h-0 bg-slate-100 border rounded-xl flex flex-col transition-colors ${
                dragOverStatus === column.id ? 'border-slate-400 bg-slate-100' : 'border-slate-200'
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverStatus(column.id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragOverStatus((current) => (current === column.id ? null : current));
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOverStatus(null);
                const taskId = event.dataTransfer.getData('taskId');
                if (!taskId) return;
                const element = document.elementFromPoint(event.clientX, event.clientY);
                const taskElement = element?.closest('[data-task-id]');
                const targetTaskId = taskElement?.getAttribute('data-task-id') || undefined;
                onMoveTask(taskId, column.id, targetTaskId);
              }}
            >
              <header className={`${isCompact ? 'px-2.5 py-2' : 'px-3 py-2.5'} border-b border-slate-200 flex items-center justify-between`}>
                <h3 className="text-sm text-slate-800 truncate">
                  <span className="font-semibold">{column.title}:</span>{' '}
                  <span className="font-normal">{column.tasks.length} {column.tasks.length === 1 ? 'task' : 'tasks'}</span>
                </h3>
                {index === 0 ? (
                  <button
                    onClick={onAddNewTask}
                    className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center"
                    title="Add task"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="w-7 h-7" aria-hidden />
                )}
              </header>

              <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${isCompact ? 'p-2 space-y-2' : 'p-2.5 space-y-2.5'}`}>
                {column.tasks.length === 0 ? (
                  <div className="h-full min-h-[160px] border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-500 bg-white">
                    No tasks
                  </div>
                ) : null}

                {column.tasks.map((task) => {
                  const subtasks = task.subtasks || [];
                  const completedSubtasks = subtasks.filter((subtask) => subtask.isCompleted).length;
                  const assigneeIds = task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
                  const dueLabel = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;

                  return (
                    <article
                      key={task.id}
                      data-task-id={task.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('taskId', task.id);
                      }}
                      className={`rounded-xl border border-slate-200 bg-white ${isCompact ? 'p-2.5 space-y-2' : 'p-3 space-y-3'}`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('taskId', task.id);
                          }}
                          className="mt-0.5 w-5 h-5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 inline-flex items-center justify-center cursor-grab active:cursor-grabbing"
                          title="Drag task"
                        >
                          <GripVertical className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectTask(task)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <h4 className={`${isCompact ? 'text-[13px]' : 'text-sm'} font-semibold text-slate-900 truncate`}>{task.title}</h4>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>{completedSubtasks}/{subtasks.length} complete</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {dueLabel ? <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 truncate">Due {dueLabel}</span> : null}
                          {assigneeIds.length ? (
                            <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 truncate max-w-[160px]">
                              {assigneeIds
                                .map((id) => userMap.get(id))
                                .filter((name): name is string => Boolean(name))
                                .join(', ') || 'Assigned'}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className={isCompact ? 'space-y-1' : 'space-y-1.5'}>
                        {subtasks.slice(0, isCompact ? 8 : 5).map((subtask) => (
                          <button
                            key={subtask.id}
                            type="button"
                            onClick={() => toggleSubtask(task, subtask.id)}
                            className={`w-full flex items-start gap-2 text-left rounded-md ${isCompact ? 'px-1 py-0.5' : 'px-1.5 py-1'} hover:bg-slate-50`}
                          >
                            <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${subtask.isCompleted ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'border-slate-300 text-transparent'}`}>
                              {subtask.isCompleted ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                            </span>
                            <span className={`${isCompact ? 'text-[11px]' : 'text-xs'} ${subtask.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {subtask.title}
                            </span>
                          </button>
                        ))}
                        {subtasks.length > (isCompact ? 8 : 5) ? (
                          <p className="px-1.5 text-[11px] text-slate-500">+{subtasks.length - (isCompact ? 8 : 5)} more subtasks</p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          value={draftSubtaskByTaskId[task.id] || ''}
                          onChange={(event) =>
                            setDraftSubtaskByTaskId((prev) => ({
                              ...prev,
                              [task.id]: event.target.value
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addSubtask(task);
                            }
                          }}
                          placeholder="Add subtask"
                          className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => addSubtask(task)}
                          className="h-8 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1 text-xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Add
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
};

export default BoardChecklistView;
