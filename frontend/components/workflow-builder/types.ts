import { RefObject } from 'react';
import { Project, User, WorkflowAction, WorkflowRule, WorkflowTrigger } from '../../types';

export type RuleFilter = 'All' | 'Active' | 'Paused';

export interface WorkflowRulesListProps {
  canManageWorkflows: boolean;
  activeCount: number;
  visibleCount: number;
  filteredRules: WorkflowRule[];
  projects: Project[];
  query: string;
  ruleFilter: RuleFilter;
  mobileFiltersOpen: boolean;
  onQueryChange: (value: string) => void;
  onRuleFilterChange: (value: RuleFilter) => void;
  onToggleMobileFilters: () => void;
  onOpenAddPanel: () => void;
  canManageRule: (rule: WorkflowRule) => boolean;
  onToggleRule: (id: string) => void;
  onRemoveRule: (id: string) => void;
}

export interface WorkflowAddRuleModalProps {
  isOpen: boolean;
  currentUserRole: 'admin' | 'member';
  projects: Project[];
  manageableProjects: Project[];
  allUsers: User[];
  newName: string;
  trigger: WorkflowTrigger;
  triggerVal: string;
  action: WorkflowAction;
  actionVal: string;
  newProjectId: string;
  assigneeSearch: string;
  assigneePickerOpen: boolean;
  filteredAssignableUsers: User[];
  selectedAssignee: User | undefined;
  actionValueLabel: string;
  assigneePickerRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSave: () => void;
  onNameChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onTriggerChange: (value: WorkflowTrigger) => void;
  onTriggerValueChange: (value: string) => void;
  onActionChange: (value: WorkflowAction) => void;
  onActionValueChange: (value: string) => void;
  onAssigneeSearchChange: (value: string) => void;
  onAssigneePickerOpen: (value: boolean) => void;
}
