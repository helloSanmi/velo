import React from 'react';
import SearchFilterControl from './SearchFilterControl';
import FilterBarControls from './FilterBarControls';
import { FilterBarSelectOptions } from './filterOptions';
import { FilterBarProps } from './types';

interface FilterBarStandardLayoutProps {
  controlClass: string;
  listClass: string;
  options: FilterBarSelectOptions;
  props: FilterBarProps;
}

const FilterBarStandardLayout: React.FC<FilterBarStandardLayoutProps> = ({
  controlClass,
  listClass,
  options,
  props
}) => (
  <div className={listClass}>
    <SearchFilterControl value={props.searchQuery} onChange={props.onSearchChange} className={controlClass} />
    <FilterBarControls
      controlClass={controlClass}
      dueFrom={props.dueFrom}
      dueTo={props.dueTo}
      projectFilter={props.projectFilter}
      dueStatusFilter={props.dueStatusFilter}
      includeUnscheduled={props.includeUnscheduled}
      statusFilter={props.statusFilter}
      priorityFilter={props.priorityFilter}
      assigneeFilter={props.assigneeFilter}
      tagFilter={props.tagFilter}
      options={options}
      onProjectChange={props.onProjectChange}
      onDueStatusChange={props.onDueStatusChange}
      onIncludeUnscheduledChange={props.onIncludeUnscheduledChange}
      onStatusChange={props.onStatusChange}
      onPriorityChange={props.onPriorityChange}
      onAssigneeChange={props.onAssigneeChange}
      onTagChange={props.onTagChange}
      onDueFromChange={props.onDueFromChange}
      onDueToChange={props.onDueToChange}
    />
  </div>
);

export default FilterBarStandardLayout;
