import React, { useEffect, useMemo, useState } from 'react';
import { TaskPriority } from '../../types';
import DueDateRangeControl from './filter-bar/DueDateRangeControl';
import SearchFilterControl from './filter-bar/SearchFilterControl';
import SelectFilterControl from './filter-bar/SelectFilterControl';
import { FilterBarProps } from './filter-bar/types';

const FilterBar: React.FC<FilterBarProps> = ({
  statusFilter,
  priorityFilter,
  tagFilter,
  assigneeFilter,
  searchQuery,
  projectFilter,
  projectOptions,
  dueFrom,
  dueTo,
  statusOptions,
  uniqueTags,
  allUsers,
  embedded = false,
  compact = false,
  onStatusChange,
  onPriorityChange,
  onTagChange,
  onAssigneeChange,
  onSearchChange,
  onProjectChange,
  onDueFromChange,
  onDueToChange
}) => {
  const MOBILE_FILTER_PREF_KEY = 'velo:board:mobile-filters-open';
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const controlClass = compact
    ? 'h-10 md:h-8 w-full px-3 md:px-2.5 rounded-lg md:rounded-md border border-slate-200 bg-white text-sm md:text-xs text-slate-700 outline-none focus:ring-1 focus:ring-slate-300'
    : 'h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300';
  const containerClass = embedded
    ? 'w-full'
    : 'flex-none px-4 md:px-8 pt-1.5 sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm';
  const frameClass = embedded ? 'w-full' : 'max-w-[1800px] mx-auto bg-white border border-slate-200 rounded-xl p-2';
  const listClass = compact
    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1.6fr)_repeat(5,minmax(120px,1fr))_minmax(240px,1.2fr)] gap-2 items-center'
    : 'grid grid-cols-2 lg:grid-cols-4 gap-1.5';
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (projectFilter !== 'All') count += 1;
    if (statusFilter !== 'All') count += 1;
    if (priorityFilter !== 'All') count += 1;
    if (assigneeFilter !== 'All') count += 1;
    if (tagFilter !== 'All') count += 1;
    if (dueFrom || dueTo) count += 1;
    return count;
  }, [assigneeFilter, dueFrom, dueTo, priorityFilter, projectFilter, statusFilter, tagFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(MOBILE_FILTER_PREF_KEY);
    if (saved === '1') setMobileFiltersOpen(true);
    if (saved === '0') setMobileFiltersOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MOBILE_FILTER_PREF_KEY, mobileFiltersOpen ? '1' : '0');
  }, [mobileFiltersOpen]);

  return (
    <div className={containerClass}>
      <div className={frameClass}>
        {compact ? (
          <>
            <div className="md:hidden flex items-center gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <SearchFilterControl value={searchQuery} onChange={onSearchChange} className={controlClass} />
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shrink-0"
              >
                {mobileFiltersOpen ? 'Hide filters' : `Filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
              </button>
            </div>
            <div className={`${mobileFiltersOpen ? 'grid' : 'hidden'} md:hidden grid-cols-1 sm:grid-cols-2 gap-2`}>
              <SelectFilterControl
                value={projectFilter}
                onChange={onProjectChange}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All projects' },
                  ...projectOptions.map((project) => ({ value: project.id, label: project.name }))
                ]}
              />

              <SelectFilterControl
                value={statusFilter}
                onChange={(value) => onStatusChange(value as string | 'All')}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All statuses' },
                  ...statusOptions.map((status) => ({ value: status.id, label: status.name }))
                ]}
              />

              <SelectFilterControl
                value={priorityFilter}
                onChange={(value) => onPriorityChange(value as TaskPriority | 'All')}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All priorities' },
                  ...Object.values(TaskPriority).map((priority) => ({ value: priority, label: priority }))
                ]}
              />

              <SelectFilterControl
                value={assigneeFilter}
                onChange={onAssigneeChange}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All assignees' },
                  { value: 'Me', label: 'Assigned to me' },
                  ...allUsers.map((user) => ({ value: user.id, label: user.displayName }))
                ]}
              />

              <SelectFilterControl
                value={tagFilter}
                onChange={onTagChange}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All tags' },
                  ...uniqueTags.map((tag) => ({ value: tag, label: tag }))
                ]}
              />

              <DueDateRangeControl
                dueFrom={dueFrom}
                dueTo={dueTo}
                onDueFromChange={onDueFromChange}
                onDueToChange={onDueToChange}
              />
            </div>
            <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-[minmax(260px,1.6fr)_repeat(5,minmax(120px,1fr))_minmax(240px,1.2fr)] gap-2 items-center">
              <SearchFilterControl value={searchQuery} onChange={onSearchChange} className={controlClass} />
              <SelectFilterControl
                value={projectFilter}
                onChange={onProjectChange}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All projects' },
                  ...projectOptions.map((project) => ({ value: project.id, label: project.name }))
                ]}
              />
              <SelectFilterControl
                value={statusFilter}
                onChange={(value) => onStatusChange(value as string | 'All')}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All statuses' },
                  ...statusOptions.map((status) => ({ value: status.id, label: status.name }))
                ]}
              />
              <SelectFilterControl
                value={priorityFilter}
                onChange={(value) => onPriorityChange(value as TaskPriority | 'All')}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All priorities' },
                  ...Object.values(TaskPriority).map((priority) => ({ value: priority, label: priority }))
                ]}
              />
              <SelectFilterControl
                value={assigneeFilter}
                onChange={onAssigneeChange}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All assignees' },
                  { value: 'Me', label: 'Assigned to me' },
                  ...allUsers.map((user) => ({ value: user.id, label: user.displayName }))
                ]}
              />
              <SelectFilterControl
                value={tagFilter}
                onChange={onTagChange}
                className={controlClass}
                options={[
                  { value: 'All', label: 'All tags' },
                  ...uniqueTags.map((tag) => ({ value: tag, label: tag }))
                ]}
              />
              <DueDateRangeControl
                dueFrom={dueFrom}
                dueTo={dueTo}
                onDueFromChange={onDueFromChange}
                onDueToChange={onDueToChange}
              />
            </div>
          </>
        ) : (
          <div className={listClass}>
            <SearchFilterControl value={searchQuery} onChange={onSearchChange} className={controlClass} />

            <SelectFilterControl
              value={projectFilter}
              onChange={onProjectChange}
              className={controlClass}
              options={[
                { value: 'All', label: 'All projects' },
                ...projectOptions.map((project) => ({ value: project.id, label: project.name }))
              ]}
            />

            <SelectFilterControl
              value={statusFilter}
              onChange={(value) => onStatusChange(value as string | 'All')}
              className={controlClass}
              options={[
                { value: 'All', label: 'All statuses' },
                ...statusOptions.map((status) => ({ value: status.id, label: status.name }))
              ]}
            />

            <SelectFilterControl
              value={priorityFilter}
              onChange={(value) => onPriorityChange(value as TaskPriority | 'All')}
              className={controlClass}
              options={[
                { value: 'All', label: 'All priorities' },
                ...Object.values(TaskPriority).map((priority) => ({ value: priority, label: priority }))
              ]}
            />

            <SelectFilterControl
              value={assigneeFilter}
              onChange={onAssigneeChange}
              className={controlClass}
              options={[
                { value: 'All', label: 'All assignees' },
                { value: 'Me', label: 'Assigned to me' },
                ...allUsers.map((user) => ({ value: user.id, label: user.displayName }))
              ]}
            />

            <SelectFilterControl
              value={tagFilter}
              onChange={onTagChange}
              className={controlClass}
              options={[
                { value: 'All', label: 'All tags' },
                ...uniqueTags.map((tag) => ({ value: tag, label: tag }))
              ]}
            />

            <DueDateRangeControl
              dueFrom={dueFrom}
              dueTo={dueTo}
              onDueFromChange={onDueFromChange}
              onDueToChange={onDueToChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
