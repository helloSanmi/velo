import React from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { ACTION_LABEL, TRIGGER_LABEL } from './constants';
import { WorkflowRulesListProps } from './types';

const WorkflowRulesList: React.FC<WorkflowRulesListProps> = ({
  canManageWorkflows,
  activeCount,
  visibleCount,
  filteredRules,
  projects,
  query,
  ruleFilter,
  mobileFiltersOpen,
  onQueryChange,
  onRuleFilterChange,
  onToggleMobileFilters,
  onOpenAddPanel,
  canManageRule,
  onToggleRule,
  onRemoveRule
}) => (
  <>
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600">
          {canManageWorkflows
            ? 'Create simple IF → THEN rules that run automatically on task updates.'
            : 'View workflow rules that apply to projects you are involved in.'}
        </p>
        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
          {activeCount} active / {visibleCount} visible
        </div>
      </div>
      <div className="mt-2 text-[11px] text-slate-500">
        {canManageWorkflows
          ? 'Example: If status changes to done, then notify project owner for the selected project.'
          : 'You can review automation behavior here, but only project owners/admins can create or change rules.'}
      </div>
    </div>

    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-slate-900">Rules</p>
      {canManageWorkflows ? (
        <Button size="sm" onClick={onOpenAddPanel}>
          <Plus className="w-4 h-4 mr-1.5" /> Add rule
        </Button>
      ) : null}
    </div>

    {!canManageWorkflows ? (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Project members can view workflows for their projects. Only project owners and admins can create or manage rules.
      </div>
    ) : null}

    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
      <div className="md:hidden flex items-center gap-2">
        <label className="h-9 border border-slate-300 rounded-lg px-3 flex items-center gap-2 bg-white flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search rules"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onToggleMobileFilters}
          className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 whitespace-nowrap"
        >
          {mobileFiltersOpen ? 'Hide' : 'Filter'}
        </button>
      </div>

      <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} md:hidden`}>
        <AppSelect
          value={ruleFilter}
          onChange={(value) => onRuleFilterChange(value as RuleFilter)}
          className="h-9 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
          options={[
            { value: 'All', label: 'All states' },
            { value: 'Active', label: 'Active' },
            { value: 'Paused', label: 'Paused' }
          ]}
        />
      </div>

      <div className="hidden md:grid grid-cols-2 gap-2.5">
        <label className="h-9 border border-slate-300 rounded-lg px-3 flex items-center gap-2 bg-white">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search rules"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </label>
        <AppSelect
          value={ruleFilter}
          onChange={(value) => onRuleFilterChange(value as RuleFilter)}
          className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
          options={[
            { value: 'All', label: 'All states' },
            { value: 'Active', label: 'Active' },
            { value: 'Paused', label: 'Paused' }
          ]}
        />
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
                disabled={!canManageRule(rule)}
                onClick={() => onToggleRule(rule.id)}
                className={`px-2.5 py-1 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed ${rule.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
              >
                {rule.isActive ? 'Active' : 'Paused'}
              </button>
              <button
                onClick={() => onRemoveRule(rule.id)}
                disabled={!canManageRule(rule)}
                className="p-2 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </>
);

export default WorkflowRulesList;
