import React from 'react';
import { Search } from 'lucide-react';
import { LoadFilter } from './types';

interface WorkloadFiltersProps {
  query: string;
  setQuery: (value: string) => void;
  loadFilter: LoadFilter;
  setLoadFilter: (value: LoadFilter) => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (value: boolean) => void;
}

const WorkloadFilters: React.FC<WorkloadFiltersProps> = ({
  query,
  setQuery,
  loadFilter,
  setLoadFilter,
  mobileFiltersOpen,
  setMobileFiltersOpen
}) => {
  return (
    <div>
      <div className="md:hidden flex items-center gap-2">
        <label className="h-10 bg-white border border-slate-300 rounded-lg px-3 flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter people"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 whitespace-nowrap"
        >
          {mobileFiltersOpen ? 'Hide filters' : 'Filters'}
        </button>
      </div>
      <div className={mobileFiltersOpen ? 'block md:hidden mt-2' : 'hidden'}>
        <select
          value={loadFilter}
          onChange={(event) => setLoadFilter(event.target.value as LoadFilter)}
          className="h-10 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="All">All loads</option>
          <option value="High">High load</option>
          <option value="Medium">Medium load</option>
          <option value="Low">Low load</option>
        </select>
      </div>
      <div className="hidden md:grid grid-cols-2 gap-2.5">
        <label className="h-10 bg-white border border-slate-300 rounded-lg px-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter people"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </label>
        <select
          value={loadFilter}
          onChange={(event) => setLoadFilter(event.target.value as LoadFilter)}
          className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="All">All loads</option>
          <option value="High">High load</option>
          <option value="Medium">Medium load</option>
          <option value="Low">Low load</option>
        </select>
      </div>
    </div>
  );
};

export default WorkloadFilters;
