import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Project, Task, User, WorkflowAction, WorkflowRule, WorkflowTrigger } from '../types';
import { workflowService } from '../services/workflowService';
import { dialogService } from '../services/dialogService';
import { getUserFullName } from '../utils/userDisplay';
import WorkflowAddRuleModal from './workflow-builder/WorkflowAddRuleModal';
import WorkflowRulesList from './workflow-builder/WorkflowRulesList';
import { RuleFilter } from './workflow-builder/types';
interface WorkflowBuilderProps {
  orgId: string;
  allUsers: User[];
  projects: Project[];
  projectTasks: Task[];
  currentUser: User;
}
const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ orgId, allUsers, projects, projectTasks, currentUser }) => {
  const manageableProjects = useMemo(() => {
    if (currentUser.role === 'admin') return projects;
    return projects.filter((project) => {
      const owners = Array.isArray(project.ownerIds) ? project.ownerIds : [];
      return owners.includes(currentUser.id) || project.createdBy === currentUser.id;
    });
  }, [currentUser.id, currentUser.role, projects]);
  const manageableProjectIds = useMemo(() => new Set(manageableProjects.map((project) => project.id)), [manageableProjects]);
  const accessibleProjectIds = useMemo(() => new Set(projects.map((project) => project.id)), [projects]);
  const canManageWorkflows = currentUser.role === 'admin' || manageableProjectIds.size > 0;
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('Auto rule');
  const [trigger, setTrigger] = useState<WorkflowTrigger>('STATUS_CHANGED');
  const [triggerVal, setTriggerVal] = useState('in-progress');
  const [action, setAction] = useState<WorkflowAction>('NOTIFY_OWNER');
  const [actionVal, setActionVal] = useState('');
  const [newProjectId, setNewProjectId] = useState<string>('all');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>('All');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const assigneePickerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let active = true;
    workflowService.getRules(orgId).then((nextRules) => {
      if (active) setRules(nextRules);
    }).catch(() => {
      if (active) setRules([]);
    });
    return () => {
      active = false;
    };
  }, [orgId]);
  const visibleRules = useMemo(
    () => rules.filter((rule) => currentUser.role === 'admin' || !rule.projectId || accessibleProjectIds.has(rule.projectId)),
    [rules, currentUser.role, accessibleProjectIds]
  );
  const filteredRules = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return visibleRules.filter((rule) => {
      const haystack = `${rule.name} ${rule.trigger} ${rule.triggerValue || ''} ${rule.action} ${rule.actionValue || ''} ${rule.projectId || 'all'}`.toLowerCase();
      const matchesQuery = !normalized || haystack.includes(normalized);
      const matchesState = ruleFilter === 'All' || (ruleFilter === 'Active' && rule.isActive) || (ruleFilter === 'Paused' && !rule.isActive);
      return matchesQuery && matchesState;
    });
  }, [visibleRules, query, ruleFilter]);
  const activeCount = useMemo(() => visibleRules.filter((rule) => rule.isActive).length, [visibleRules]);
  const filteredAssignableUsers = useMemo(() => {
    const normalized = assigneeSearch.trim().toLowerCase();
    const sortedUsers = [...allUsers].sort((a, b) => getUserFullName(a).localeCompare(getUserFullName(b)));
    if (!normalized) return sortedUsers;
    return sortedUsers.filter((user) => `${getUserFullName(user)} ${user.username || ''} ${user.email || ''}`.toLowerCase().includes(normalized));
  }, [allUsers, assigneeSearch]);
  const selectedAssignee = useMemo(() => allUsers.find((user) => user.id === actionVal), [allUsers, actionVal]);
  const actionValueLabel = useMemo(() => {
    if (!actionVal.trim()) return '';
    if (action === 'ASSIGN_USER') return selectedAssignee ? getUserFullName(selectedAssignee) : actionVal.trim();
    return actionVal.trim();
  }, [action, actionVal, selectedAssignee]);
  useEffect(() => {
    if (action !== 'ASSIGN_USER') {
      setAssigneePickerOpen(false);
      setAssigneeSearch('');
      return;
    }
    if (selectedAssignee) setAssigneeSearch(getUserFullName(selectedAssignee));
  }, [action, selectedAssignee]);
  useEffect(() => {
    if (!assigneePickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(event.target as Node)) setAssigneePickerOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [assigneePickerOpen]);
  const canManageRule = (rule: WorkflowRule) => currentUser.role === 'admin' || (rule.projectId ? manageableProjectIds.has(rule.projectId) : false);
  const handleSave = async () => {
    if (!canManageWorkflows || !newName.trim()) return;
    if (currentUser.role !== 'admin' && newProjectId === 'all') return;
    if (action === 'ASSIGN_USER' && !actionVal.trim()) return;
    const saved = await workflowService.saveRule({
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
  const openAddPanel = () => {
    if (!canManageWorkflows) return;
    if (currentUser.role !== 'admin') {
      const defaultProjectId = manageableProjects[0]?.id;
      if (defaultProjectId) setNewProjectId(defaultProjectId);
    } else if (newProjectId !== 'all' && !projects.some((project) => project.id === newProjectId)) {
      setNewProjectId('all');
    }
    setIsAdding(true);
  };
  const toggleRule = async (id: string) => {
    const target = rules.find((rule) => rule.id === id);
    if (!target || !canManageRule(target)) return;
    const updated = await workflowService.toggleRule(orgId, id);
    if (updated) setRules((prev) => prev.map((rule) => (rule.id === id ? updated : rule)));
  };
  const removeRule = async (id: string) => {
    const target = rules.find((rule) => rule.id === id);
    if (!target || !canManageRule(target)) return;
    const confirmed = await dialogService.confirm(`Delete workflow "${target.name || 'this rule'}"?`, { title: 'Delete workflow', confirmText: 'Delete', danger: true });
    if (!confirmed) return;
    await workflowService.deleteRule(orgId, id);
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  };
  return (
    <div className="relative space-y-3">
      <WorkflowRulesList
        canManageWorkflows={canManageWorkflows}
        activeCount={activeCount}
        visibleCount={visibleRules.length}
        filteredRules={filteredRules}
        projects={projects}
        query={query}
        ruleFilter={ruleFilter}
        mobileFiltersOpen={mobileFiltersOpen}
        onQueryChange={setQuery}
        onRuleFilterChange={setRuleFilter}
        onToggleMobileFilters={() => setMobileFiltersOpen((prev) => !prev)}
        onOpenAddPanel={openAddPanel}
        canManageRule={canManageRule}
        onToggleRule={toggleRule}
        onRemoveRule={removeRule}
      />
      <WorkflowAddRuleModal
        isOpen={isAdding}
        currentUserRole={currentUser.role}
        projects={projects}
        manageableProjects={manageableProjects}
        allUsers={allUsers}
        newName={newName}
        trigger={trigger}
        triggerVal={triggerVal}
        action={action}
        actionVal={actionVal}
        newProjectId={newProjectId}
        assigneeSearch={assigneeSearch}
        assigneePickerOpen={assigneePickerOpen}
        filteredAssignableUsers={filteredAssignableUsers}
        selectedAssignee={selectedAssignee}
        actionValueLabel={actionValueLabel}
        assigneePickerRef={assigneePickerRef}
        onClose={() => setIsAdding(false)}
        onSave={handleSave}
        onNameChange={setNewName}
        onProjectChange={setNewProjectId}
        onTriggerChange={setTrigger}
        onTriggerValueChange={setTriggerVal}
        onActionChange={(nextAction) => {
          setAction(nextAction);
          if (nextAction !== 'ASSIGN_USER') {
            setActionVal('');
            setAssigneeSearch('');
            setAssigneePickerOpen(false);
          } else if (selectedAssignee) {
            setAssigneeSearch(getUserFullName(selectedAssignee));
          }
        }}
        onActionValueChange={setActionVal}
        onAssigneeSearchChange={setAssigneeSearch}
        onAssigneePickerOpen={setAssigneePickerOpen}
      />
    </div>
  );
};
export default WorkflowBuilder;
