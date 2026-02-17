import React, { useMemo, useState } from 'react';
import { Project, WorkflowAction, WorkflowRule, WorkflowTrigger, User } from '../types';
import { Plus, Search, Trash2, X, Zap } from 'lucide-react';
import Button from './ui/Button';
import { workflowService } from '../services/workflowService';
import { dialogService } from '../services/dialogService';

interface WorkflowBuilderProps {
  orgId: string;
  allUsers: User[];
  projects: Project[];
  currentUser: User;
}

type RuleFilter = 'All' | 'Active' | 'Paused';

const TRIGGER_LABEL: Record<WorkflowTrigger, string> = {
  TASK_CREATED: 'Task is created',
  STATUS_CHANGED: 'Task status changes',
  PRIORITY_CHANGED: 'Task priority changes'
};

const ACTION_LABEL: Record<WorkflowAction, string> = {
  SET_PRIORITY: 'Set task priority',
  ASSIGN_USER: 'Assign task to user',
  ADD_TAG: 'Add task tag',
  NOTIFY_OWNER: 'Notify project owner'
};

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ orgId, projects, currentUser }) => {
  const manageableProjects = useMemo(() => {
    if (currentUser.role === 'admin') return projects;
    return projects.filter((project) => {
      const owners = Array.isArray(project.ownerIds) ? project.ownerIds : [];
      return owners.includes(currentUser.id) || project.createdBy === currentUser.id;
    });
  }, [currentUser.id, currentUser.role, projects]);
  const canManageWorkflows = currentUser.role === 'admin' || manageableProjects.length > 0;
  const [rules, setRules] = useState<WorkflowRule[]>(workflowService.getRules(orgId));
  const [isAdding, setIsAdding] = useState(false);

  const [newName, setNewName] = useState('Auto rule');
  const [trigger, setTrigger] = useState<WorkflowTrigger>('STATUS_CHANGED');
  const [triggerVal, setTriggerVal] = useState('in-progress');
  const [action, setAction] = useState<WorkflowAction>('NOTIFY_OWNER');
  const [actionVal, setActionVal] = useState('');
  const [newProjectId, setNewProjectId] = useState<string>('all');

  const [query, setQuery] = useState('');
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>('All');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filteredRules = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rules.filter((rule) => {
      const isRuleManageable =
        currentUser.role === 'admin' ||
        (rule.projectId ? manageableProjects.some((project) => project.id === rule.projectId) : false);
      if (!isRuleManageable) return false;
      const matchesQuery =
        !normalized
        || `${rule.name} ${rule.trigger} ${rule.triggerValue || ''} ${rule.action} ${rule.actionValue || ''} ${
          rule.projectId || 'all'
        }`
          .toLowerCase()
          .includes(normalized);
      const matchesState =
        ruleFilter === 'All' ||
        (ruleFilter === 'Active' && rule.isActive) ||
        (ruleFilter === 'Paused' && !rule.isActive);
      return matchesQuery && matchesState;
    });
  }, [rules, query, ruleFilter, currentUser.role, manageableProjects]);

  const activeCount = useMemo(() => rules.filter((rule) => rule.isActive).length, [rules]);

  const handleSave = () => {
    if (!canManageWorkflows || !newName.trim()) return;
    if (currentUser.role !== 'admin' && newProjectId === 'all') return;
    const saved = workflowService.saveRule({
      orgId,
      projectId: newProjectId === 'all' ? undefined : newProjectId,
      name: newName.trim(),
      trigger,
      triggerValue: triggerVal.trim() || undefined,
      action,
      actionValue: actionVal.trim() || undefined,
      isActive: true
    });
    setRules((prev) => [...prev, saved]);
    setIsAdding(false);
  };

  const closeAddPanel = () => {
    setIsAdding(false);
  };

  const toggleRule = (id: string) => {
    if (!canManageWorkflows) return;
    workflowService.toggleRule(orgId, id);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  };

  const removeRule = async (id: string) => {
    if (!canManageWorkflows) return;
    const target = rules.find((rule) => rule.id === id);
    const confirmed = await dialogService.confirm(`Delete workflow "${target?.name || 'this rule'}"?`, {
      title: 'Delete workflow',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    workflowService.deleteRule(orgId, id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="relative space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">Create simple IF → THEN rules that run automatically on task updates.</p>
          <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
            {activeCount} active / {rules.length} total
          </div>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          Example: If status changes to <span className="font-medium text-slate-700">done</span>, then notify project owner for the selected project.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Rules</p>
        <Button size="sm" onClick={() => setIsAdding(true)} disabled={!canManageWorkflows}>
          <Plus className="w-4 h-4 mr-1.5" /> Add rule
        </Button>
      </div>
      {!canManageWorkflows ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Only admins and project owners can manage workflow automation.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
        <div className="md:hidden flex items-center gap-2">
          <label className="h-9 border border-slate-300 rounded-lg px-3 flex items-center gap-2 bg-white flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rules"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 whitespace-nowrap"
          >
            {mobileFiltersOpen ? 'Hide' : 'Filter'}
          </button>
        </div>
        <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} md:hidden`}>
          <select
            value={ruleFilter}
            onChange={(event) => setRuleFilter(event.target.value as RuleFilter)}
            className="h-9 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none"
          >
            <option value="All">All states</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
          </select>
        </div>
        <div className="hidden md:grid grid-cols-2 gap-2.5">
          <label className="h-9 border border-slate-300 rounded-lg px-3 flex items-center gap-2 bg-white">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rules"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
            />
          </label>
          <select
            value={ruleFilter}
            onChange={(event) => setRuleFilter(event.target.value as RuleFilter)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none"
          >
            <option value="All">All states</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
          </select>
        </div>

        <div className="space-y-2 md:max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
          {filteredRules.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-500 text-center">
              No rules yet. Add your first automation rule.
            </div>
          ) : filteredRules.map((rule) => (
            <div key={rule.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{rule.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  If {TRIGGER_LABEL[rule.trigger]}{rule.triggerValue ? ` = "${rule.triggerValue}"` : ''}, then {ACTION_LABEL[rule.action]}{rule.actionValue ? `: "${rule.actionValue}"` : ''}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Scope: {rule.projectId ? (projects.find((project) => project.id === rule.projectId)?.name || 'Project') : 'All projects'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs ${rule.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {rule.isActive ? 'Active' : 'Paused'}
                </button>
                <button onClick={() => removeRule(rule.id)} className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAdding ? (
        <div className="absolute inset-0 z-10 rounded-xl bg-slate-900/10 backdrop-blur-[1px]">
            <aside className="ml-auto flex h-full w-full max-w-md flex-col rounded-none md:rounded-l-xl border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Add workflow rule</p>
                <p className="text-xs text-slate-500">Set trigger, action, and project scope.</p>
              </div>
              <button
                type="button"
                onClick={closeAddPanel}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rule name</span>
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none"
                  placeholder="Notify owner on completion"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Apply to project</span>
                <select
                  value={newProjectId}
                  onChange={(event) => setNewProjectId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none"
                >
                  {currentUser.role === 'admin' ? <option value="all">All projects</option> : null}
                  {manageableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">When this happens</span>
                  <select
                    value={trigger}
                    onChange={(event) => setTrigger(event.target.value as WorkflowTrigger)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none"
                  >
                    <option value="TASK_CREATED">Task is created</option>
                    <option value="STATUS_CHANGED">Task status changes</option>
                    <option value="PRIORITY_CHANGED">Task priority changes</option>
                  </select>
                  <input
                    value={triggerVal}
                    onChange={(event) => setTriggerVal(event.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none"
                    placeholder={
                      trigger === 'STATUS_CHANGED'
                        ? 'e.g. done'
                        : trigger === 'PRIORITY_CHANGED'
                          ? 'e.g. High'
                          : 'Optional filter'
                    }
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Do this action</span>
                  <select
                    value={action}
                    onChange={(event) => setAction(event.target.value as WorkflowAction)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none"
                  >
                    <option value="SET_PRIORITY">Set task priority</option>
                    <option value="ASSIGN_USER">Assign task to user</option>
                    <option value="ADD_TAG">Add task tag</option>
                    <option value="NOTIFY_OWNER">Notify project owner</option>
                  </select>
                  <input
                    value={actionVal}
                    onChange={(event) => setActionVal(event.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none"
                    placeholder={
                      action === 'SET_PRIORITY'
                        ? 'e.g. High'
                        : action === 'ADD_TAG'
                          ? 'e.g. Escalation'
                          : action === 'ASSIGN_USER'
                            ? 'User ID'
                            : 'Optional message'
                    }
                  />
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <p className="inline-flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-slate-500" />
                  If <span className="font-medium">{TRIGGER_LABEL[trigger]}</span>{triggerVal.trim() ? ` = "${triggerVal.trim()}"` : ''},
                  then <span className="font-medium">{ACTION_LABEL[action]}</span>{actionVal.trim() ? `: "${actionVal.trim()}"` : ''}.
                </p>
                <p className="mt-1">
                  Scope:{' '}
                  <span className="font-medium">
                    {newProjectId === 'all' ? 'All projects' : (projects.find((project) => project.id === newProjectId)?.name || 'Selected project')}
                  </span>
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" onClick={closeAddPanel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save rule
                </Button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default WorkflowBuilder;
