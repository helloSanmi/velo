import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Search, X } from 'lucide-react';
import { User } from '../../types';
import { getUserFullName } from '../../utils/userDisplay';

interface TaskAssigneeEditorProps {
  allUsers: User[];
  assigneeIds: string[];
  canManageTask: boolean;
  onAssigneesChange: (ids: string[]) => void;
}

const initialsFor = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const TaskAssigneeEditor: React.FC<TaskAssigneeEditorProps> = ({ allUsers, assigneeIds, canManageTask, onAssigneesChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);
  const assignees = assigneeIds.map((id) => allUsers.find((user) => user.id === id)).filter((user): user is User => Boolean(user));
  const visibleAssignees = assignees.slice(0, 3);
  const overflowAssigneeCount = Math.max(0, assignees.length - visibleAssignees.length);
  const assigneeNames = assignees.map((user) => getUserFullName(user)).join(', ');
  const unassignedUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allUsers
      .filter((user) => !assigneeIds.includes(user.id))
      .filter((user) => (!normalized ? true : `${user.displayName} ${user.username} ${user.role || 'member'}`.toLowerCase().includes(normalized)))
      .slice(0, 8);
  }, [allUsers, assigneeIds, query]);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

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
    <div className="flex items-center justify-start md:justify-end gap-2 relative w-auto md:w-[124px]" ref={ref}>
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
            <span title={assigneeNames} className="h-7 min-w-7 px-1.5 rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-semibold text-slate-700 inline-flex items-center justify-center">
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
          setIsOpen((prev) => !prev);
        }}
        disabled={!canManageTask}
        title={canManageTask ? 'Edit assignees' : 'Only project owner/admin can edit assignees'}
        className="p-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-35 disabled:hover:bg-white"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {isOpen && canManageTask ? (
        <div className="absolute top-[calc(100%+8px)] right-0 z-20 w-[min(90vw,280px)] rounded-xl border border-slate-200 bg-white shadow-2xl p-2.5">
          <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Add assignee</p>
          <p className="text-[10px] text-slate-500 mb-2">Project owners and admins can be assigned even if not listed in project members.</p>
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
  );
};

export default TaskAssigneeEditor;
