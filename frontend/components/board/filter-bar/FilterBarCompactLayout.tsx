import React from 'react';
import SearchFilterControl from './SearchFilterControl';
import FilterBarControls from './FilterBarControls';
import { FilterBarSelectOptions } from './filterOptions';
import { FilterBarProps } from './types';

interface FilterBarCompactLayoutProps {
  controlClass: string;
  mobileFiltersOpen: boolean;
  activeFilterCount: number;
  options: FilterBarSelectOptions;
  onToggleMobileFilters: () => void;
  props: FilterBarProps;
}

const FilterBarCompactLayout: React.FC<FilterBarCompactLayoutProps> = ({
  controlClass,
  mobileFiltersOpen,
  activeFilterCount,
  options,
  onToggleMobileFilters,
  props
}) => (
  <>
    <div className="md:hidden flex items-center gap-2 mb-2">
      <div className="flex-1 min-w-0">
        <SearchFilterControl value={props.searchQuery} onChange={props.onSearchChange} className={controlClass} />
      </div>
      <button
        type="button"
        onClick={onToggleMobileFilters}
        className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shrink-0"
      >
        {mobileFiltersOpen ? 'Hide filters' : `Filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
      </button>
    </div>

    <div className={`${mobileFiltersOpen ? 'grid' : 'hidden'} md:hidden grid-cols-1 sm:grid-cols-2 gap-2`}>
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

    <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(6,minmax(120px,1fr))_minmax(170px,1fr)_minmax(250px,1.35fr)] gap-2 items-center">
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
  </>
);

export default FilterBarCompactLayout;
