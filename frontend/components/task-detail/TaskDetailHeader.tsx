import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Search, Trash2, X } from 'lucide-react';
import { Task, TaskPriority, User } from '../../types';
import Badge from '../ui/Badge';
import { dialogService } from '../../services/dialogService';
import { getUserFullName } from '../../utils/userDisplay';

interface TaskDetailHeaderProps {
  task: Task;
  onClose: () => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
  allUsers: User[];
  assigneeIds: string[];
  canManageTask?: boolean;
  onAssigneesChange: (ids: string[]) => void;
  onPriorityChange: (priority: TaskPriority) => void;
}

const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  task,
  onClose,
  onDelete,
  canDelete = true,
  allUsers,
  assigneeIds,
  canManageTask = false,
  onAssigneesChange,
  onPriorityChange
}) => {
  const [isAssigneeEditorOpen, setIsAssigneeEditorOpen] = useState(false);
  const [isPriorityEditorOpen, setIsPriorityEditorOpen] = useState(false);
  const [query, setQuery] = useState('');
  const assigneeEditorRef = useRef<HTMLDivElement | null>(null);
  const priorityEditorRef = useRef<HTMLDivElement | null>(null);
  const assignees = assigneeIds
    .map((id) => allUsers.find((user) => user.id === id))
    .filter((user): user is User => Boolean(user));
  const visibleAssignees = assignees.slice(0, 3);
  const overflowAssigneeCount = Math.max(0, assignees.length - visibleAssignees.length);
  const assigneeNames = assignees.map((user) => getUserFullName(user)).join(', ');
  const unassignedUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allUsers
      .filter((user) => !assigneeIds.includes(user.id))
      .filter((user) => {
        if (!normalized) return true;
        return `${user.displayName} ${user.username} ${user.role || 'member'}`.toLowerCase().includes(normalized);
      })
      .slice(0, 8);
  }, [allUsers, assigneeIds, query]);
  const initialsFor = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  useEffect(() => {
    if (!isAssigneeEditorOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (assigneeEditorRef.current && !assigneeEditorRef.current.contains(event.target as Node)) {
        setIsAssigneeEditorOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isAssigneeEditorOpen]);

  useEffect(() => {
    if (!isPriorityEditorOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (priorityEditorRef.current && !priorityEditorRef.current.contains(event.target as Node)) {
        setIsPriorityEditorOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isPriorityEditorOpen]);

  const addAssignee = (userId: string) => {
    if (!canManageTask || assigneeIds.includes(userId)) return;
    onAssigneesChange([...assigneeIds, userId]);
    setQuery('');
  };

  const removeAssignee = (userId: string) => {
    if (!canManageTask) return;
    onAssigneesChange(assigneeIds.filter((id) => id !== userId));
  };

  return (
    <div className="px-3 py-3 md:px-5 md:py-4 flex flex-col gap-3 md:gap-0 md:flex-row md:items-start md:justify-between border-b border-slate-200 flex-shrink-0 bg-white">
      <div className="flex-1 overflow-visible">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="indigo">{task.status.toUpperCase()}</Badge>
          {task.isAtRisk && <Badge variant="rose">AT RISK</Badge>}
          <div className="relative inline-flex items-center gap-1" ref={priorityEditorRef}>
            <Badge variant="amber">{task.priority.toUpperCase()}</Badge>
            {canManageTask ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsPriorityEditorOpen((prev) => !prev)}
                  className="p-1 bg-white border border-slate-200 text-slate-500 rounded-md hover:bg-slate-100 transition-all"
                  title="Edit task severity"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                {isPriorityEditorOpen ? (
                  <div className="absolute top-[calc(100%+6px)] left-0 z-30 w-36 rounded-lg border border-slate-200 bg-white shadow-lg p-1.5">
                    {(Object.values(TaskPriority) as TaskPriority[]).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => {
                          onPriorityChange(priority);
                          setIsPriorityEditorOpen(false);
                        }}
                        className={`w-full h-8 px-2 rounded-md text-left text-xs transition-colors ${
                          task.priority === priority ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight leading-tight truncate">{task.title}</h2>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 md:ml-3 w-full md:w-auto">
        <div className="flex items-center justify-start md:justify-end gap-2 relative w-auto md:w-[124px]" ref={assigneeEditorRef}>
          {assignees.length > 0 ? (
            <div className="flex items-center justify-end gap-1 w-full" title={assigneeNames} aria-label={assigneeNames}>
              {visibleAssignees.map((assignee) => (
                <div key={assignee.id} className="relative group/assignee-chip">
                  <div
                    title={getUserFullName(assignee)}
                    aria-label={getUserFullName(assignee)}
                    className="w-7 h-7 rounded-lg border border-white shadow-sm bg-slate-100 text-[10px] font-semibold text-slate-700 inline-flex items-center justify-center"
                  >
                    {initialsFor(getUserFullName(assignee))}
                  </div>
                  <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 max-w-[220px] truncate rounded-md bg-slate-900 text-white text-[10px] px-1.5 py-0.5 opacity-0 group-hover/assignee-chip:opacity-100 transition-opacity z-[160]">
                    {getUserFullName(assignee)}
                  </span>
                  {canManageTask ? (
                    <button
                      type="button"
                      onClick={() => removeAssignee(assignee.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 text-white inline-flex items-center justify-center opacity-0 group-hover/assignee-chip:opacity-100 transition-opacity"
                      title={`Remove ${getUserFullName(assignee)}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  ) : null}
                </div>
              ))}
              {overflowAssigneeCount > 0 ? (
                <span
                  title={assigneeNames}
                  className="h-7 min-w-7 px-1.5 rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-700 inline-flex items-center justify-center"
                >
                  +{overflowAssigneeCount}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 px-1.5">No assignee</span>
          )}
          <button
            onClick={() => {
              if (!canManageTask) return;
              setIsAssigneeEditorOpen((prev) => !prev);
            }}
            disabled={!canManageTask}
            title={canManageTask ? 'Edit assignees' : 'Only project owner/admin can edit assignees'}
            className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-35 disabled:hover:bg-white"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {isAssigneeEditorOpen && canManageTask ? (
            <div className="absolute top-[calc(100%+8px)] right-0 z-20 w-[min(90vw,280px)] rounded-xl border border-slate-200 bg-white shadow-2xl p-2.5">
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Add assignee</p>
              <p className="text-[10px] text-slate-500 mb-2">
                Project owners and admins can be assigned even if not listed in project members.
              </p>
              <label className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 flex items-center gap-2 mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search members"
                  className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
                />
              </label>
              <div className="max-h-[180px] overflow-y-auto custom-scrollbar pr-1 space-y-1">
                {unassignedUsers.length === 0 ? (
                  <p className="text-[11px] text-slate-500 px-1 py-1.5">No additional members found.</p>
                ) : (
                  unassignedUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => addAssignee(user.id)}
                      className="w-full h-8 px-2.5 rounded-md text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 inline-flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{user.displayName}</span>
                      <span className="text-[10px] text-slate-500">{user.role || 'member'}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
        <button
          onClick={async () => {
            if (!canDelete) return;
            const confirmed = await dialogService.confirm('Delete this task?', { title: 'Delete task', confirmText: 'Delete', danger: true });
            if (confirmed) {
              onDelete(task.id);
              onClose();
            }
          }}
          disabled={!canDelete}
          title={canDelete ? 'Delete task' : 'Only project owner/admin can delete'}
          className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-rose-50 hover:text-rose-700 transition-all disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-slate-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={onClose} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 transition-all active:scale-95">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TaskDetailHeader;
