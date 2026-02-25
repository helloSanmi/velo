import React, { useEffect, useMemo, useState } from 'react';
import { FilterBarProps } from './filter-bar/types';
import { buildFilterBarSelectOptions } from './filter-bar/filterOptions';
import FilterBarCompactLayout from './filter-bar/FilterBarCompactLayout';
import FilterBarStandardLayout from './filter-bar/FilterBarStandardLayout';

const MOBILE_FILTER_PREF_KEY = 'velo:board:mobile-filters-open';

const FilterBar: React.FC<FilterBarProps> = (props) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const controlClass = props.compact
    ? 'h-10 md:h-8 w-full px-3 md:px-2.5 rounded-lg md:rounded-md border border-slate-200 bg-white text-sm md:text-xs text-slate-700 outline-none focus:ring-1 focus:ring-slate-300'
    : 'h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300';
  const containerClass = props.embedded
    ? 'w-full'
    : 'flex-none px-4 md:px-8 pt-1.5 sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm';
  const frameClass = props.embedded ? 'w-full' : 'max-w-[1800px] mx-auto bg-white border border-slate-200 rounded-xl p-2';
  const listClass = props.compact
    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1.6fr)_repeat(7,minmax(120px,1fr))_minmax(240px,1.2fr)] gap-2 items-center'
    : 'grid grid-cols-2 lg:grid-cols-4 gap-1.5';

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (props.projectFilter !== 'All') count += 1;
    if (props.statusFilter !== 'All') count += 1;
    if (props.priorityFilter !== 'All') count += 1;
    if (props.assigneeFilter !== 'All') count += 1;
    if (props.tagFilter !== 'All') count += 1;
    if (props.dueStatusFilter !== 'All') count += 1;
    if (!props.includeUnscheduled) count += 1;
    if (props.dueFrom || props.dueTo) count += 1;
    return count;
  }, [props.assigneeFilter, props.dueFrom, props.dueStatusFilter, props.dueTo, props.includeUnscheduled, props.priorityFilter, props.projectFilter, props.statusFilter, props.tagFilter]);

  const selectOptions = useMemo(
    () => buildFilterBarSelectOptions(props),
    [props.projectOptions, props.statusOptions, props.allUsers, props.uniqueTags]
  );

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
        {props.compact ? (
          <FilterBarCompactLayout
            controlClass={controlClass}
            mobileFiltersOpen={mobileFiltersOpen}
            activeFilterCount={activeFilterCount}
            options={selectOptions}
            onToggleMobileFilters={() => setMobileFiltersOpen((prev) => !prev)}
            props={props}
          />
        ) : (
          <FilterBarStandardLayout controlClass={controlClass} listClass={listClass} options={selectOptions} props={props} />
        )}
      </div>
    </div>
  );
};

export default FilterBar;
