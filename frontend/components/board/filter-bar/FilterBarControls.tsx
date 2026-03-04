import React from 'react';
import { TaskPriority } from '../../../types';
import DueDateRangeControl from './DueDateRangeControl';
import SelectFilterControl from './SelectFilterControl';
import { FilterBarSelectOptions } from './filterOptions';

interface FilterBarControlsProps {
  controlClass: string;
  showProjectFilter?: boolean;
  dueFrom?: number;
  dueTo?: number;
  projectFilter: string | 'All';
  dueStatusFilter: 'All' | 'Scheduled' | 'Unscheduled';
  includeUnscheduled: boolean;
  statusFilter: string | 'All';
  priorityFilter: TaskPriority | 'All';
  assigneeFilter: string | 'All';
  tagFilter: string | 'All';
  options: FilterBarSelectOptions;
  onProjectChange: (value: string) => void;
  onDueStatusChange: (value: 'All' | 'Scheduled' | 'Unscheduled') => void;
  onIncludeUnscheduledChange: (value: boolean) => void;
  onStatusChange: (status: string | 'All') => void;
  onPriorityChange: (priority: TaskPriority | 'All') => void;
  onAssigneeChange: (assigneeId: string) => void;
  onTagChange: (tag: string) => void;
  onDueFromChange: (value?: number) => void;
  onDueToChange: (value?: number) => void;
}

const FilterBarControls: React.FC<FilterBarControlsProps> = ({
  controlClass,
  showProjectFilter = true,
  dueFrom,
  dueTo,
  projectFilter,
  dueStatusFilter,
  includeUnscheduled,
  statusFilter,
  priorityFilter,
  assigneeFilter,
  tagFilter,
  options,
  onProjectChange,
  onDueStatusChange,
  onIncludeUnscheduledChange,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onTagChange,
  onDueFromChange,
  onDueToChange
}) => (
  <>
    {showProjectFilter ? (
      <SelectFilterControl
        value={projectFilter}
        onChange={onProjectChange}
        className={controlClass}
        options={options.projectOptions}
      />
    ) : null}
    <SelectFilterControl
      value={statusFilter}
      onChange={(value) => onStatusChange(value as string | 'All')}
      className={controlClass}
      options={options.statusOptions}
    />
    <SelectFilterControl
      value={priorityFilter}
      onChange={(value) => onPriorityChange(value as TaskPriority | 'All')}
      className={controlClass}
      options={options.priorityOptions}
    />
    <SelectFilterControl
      value={assigneeFilter}
      onChange={onAssigneeChange}
      className={controlClass}
      options={options.assigneeOptions}
    />
    <SelectFilterControl
      value={tagFilter}
      onChange={onTagChange}
      className={controlClass}
      options={options.tagOptions}
    />
    <SelectFilterControl
      value={dueStatusFilter}
      onChange={(value) => onDueStatusChange(value as 'All' | 'Scheduled' | 'Unscheduled')}
      className={controlClass}
      options={options.dueStatusOptions}
    />
    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 px-1 min-w-0">
      <input
        type="checkbox"
        checked={includeUnscheduled}
        onChange={(event) => onIncludeUnscheduledChange(event.target.checked)}
        className="h-3.5 w-3.5 rounded border-slate-300"
      />
      Unscheduled
    </label>
    <div className="min-w-[180px] max-w-full xl:min-w-[190px]">
      <DueDateRangeControl
        dueFrom={dueFrom}
        dueTo={dueTo}
        onDueFromChange={onDueFromChange}
        onDueToChange={onDueToChange}
      />
    </div>
  </>
);

export default FilterBarControls;
