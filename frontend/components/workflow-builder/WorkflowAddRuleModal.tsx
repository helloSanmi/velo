import React from 'react';
import { Search, X, Zap } from 'lucide-react';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { getUserFullName } from '../../utils/userDisplay';
import { ACTION_LABEL, TRIGGER_LABEL } from './constants';
import { WorkflowAddRuleModalProps } from './types';

const WorkflowAddRuleModal: React.FC<WorkflowAddRuleModalProps> = ({
  isOpen,
  currentUserRole,
  projects,
  manageableProjects,
  newName,
  trigger,
  triggerVal,
  action,
  actionVal,
  newProjectId,
  assigneeSearch,
  assigneePickerOpen,
  filteredAssignableUsers,
  actionValueLabel,
  assigneePickerRef,
  onClose,
  onSave,
  onNameChange,
  onProjectChange,
  onTriggerChange,
  onTriggerValueChange,
  onActionChange,
  onActionValueChange,
  onAssigneeSearchChange,
  onAssigneePickerOpen
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[1px]">
      <aside className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 md:px-5">
          <div>
            <p className="text-base font-semibold text-slate-900">Add workflow rule</p>
            <p className="text-xs text-slate-500">Set trigger, action, and project scope.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="space-y-3.5 p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rule name</span>
              <input value={newName} onChange={(event) => onNameChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none" placeholder="Notify owner on completion" />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Apply to project</span>
              <AppSelect
                value={newProjectId}
                onChange={onProjectChange}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                options={[
                  ...(currentUserRole === 'admin' ? [{ value: 'all', label: 'All projects' }] : []),
                  ...manageableProjects.map((project) => ({ value: project.id, label: project.name }))
                ]}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">When this happens</span>
              <AppSelect
                value={trigger}
                onChange={(value) => onTriggerChange(value as WorkflowTrigger)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                options={[
                  { value: 'TASK_CREATED', label: 'Task is created' },
                  { value: 'STATUS_CHANGED', label: 'Task status changes' },
                  { value: 'PRIORITY_CHANGED', label: 'Task priority changes' }
                ]}
              />
              <input
                value={triggerVal}
                onChange={(event) => onTriggerValueChange(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                placeholder={trigger === 'STATUS_CHANGED' ? 'e.g. done' : trigger === 'PRIORITY_CHANGED' ? 'e.g. High' : 'Optional filter'}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Do this action</span>
              <AppSelect
                value={action}
                onChange={(value) => onActionChange(value as WorkflowAction)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                options={[
                  { value: 'SET_PRIORITY', label: 'Set task priority' },
                  { value: 'ASSIGN_USER', label: 'Assign task to user' },
                  { value: 'ADD_TAG', label: 'Add task tag' },
                  { value: 'NOTIFY_OWNER', label: 'Notify project owner' }
                ]}
              />

              {action === 'ASSIGN_USER' ? (
                <div className="relative" ref={assigneePickerRef}>
                  <label className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none flex items-center gap-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={assigneeSearch}
                      onFocus={() => onAssigneePickerOpen(true)}
                      onChange={(event) => {
                        onAssigneeSearchChange(event.target.value);
                        onAssigneePickerOpen(true);
                        onActionValueChange('');
                      }}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                      placeholder="Search user in organization"
                    />
                    {actionVal ? (
                      <button
                        type="button"
                        onClick={() => {
                          onActionValueChange('');
                          onAssigneeSearchChange('');
                          onAssigneePickerOpen(true);
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-700"
                      >
                        Clear
                      </button>
                    ) : null}
                  </label>

                  {assigneePickerOpen ? (
                    <div className="absolute left-0 right-0 top-11 z-20 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg custom-scrollbar">
                      {filteredAssignableUsers.length === 0 ? (
                        <div className="px-2 py-2 text-xs text-slate-500">No users found</div>
                      ) : (
                        filteredAssignableUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              onActionValueChange(user.id);
                              onAssigneeSearchChange(getUserFullName(user));
                              onAssigneePickerOpen(false);
                            }}
                            className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-100"
                          >
                            <p className="truncate text-sm text-slate-800">{getUserFullName(user)}</p>
                            <p className="truncate text-[11px] text-slate-500">{user.email || user.username}</p>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <input
                  value={actionVal}
                  onChange={(event) => onActionValueChange(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none"
                  placeholder={action === 'SET_PRIORITY' ? 'e.g. High' : action === 'ADD_TAG' ? 'e.g. Escalation' : 'Optional message'}
                />
              )}
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
            <p className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-slate-500" />
              If <span className="font-medium">{TRIGGER_LABEL[trigger]}</span>{triggerVal.trim() ? ` = "${triggerVal.trim()}"` : ''}, then <span className="font-medium">{ACTION_LABEL[action]}</span>{actionValueLabel ? `: "${actionValueLabel}"` : ''}.
            </p>
            <p className="mt-1">
              Scope:{' '}
              <span className="font-medium">
                {newProjectId === 'all' ? 'All projects' : projects.find((project) => project.id === newProjectId)?.name || 'Selected project'}
              </span>
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-3.5 md:px-5">
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={onSave}>Save rule</Button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default WorkflowAddRuleModal;
