import React from 'react';
import { Search } from 'lucide-react';
import { Project } from '../../types';
import AppSelect from '../ui/AppSelect';
import { StatusFilter } from './types';

interface IntegrationFiltersProps {
  compact: boolean;
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: 'All', label: 'All statuses' },
  { value: 'Connected', label: 'Connected' },
  { value: 'Not Connected', label: 'Not connected' }
];

const IntegrationFilters: React.FC<IntegrationFiltersProps> = ({
  compact,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  mobileFiltersOpen,
  setMobileFiltersOpen
}) => {
  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Manage project integration connections.</p>
        <div className={compact ? 'w-full sm:w-[220px]' : 'w-full sm:w-[260px]'}>
          <AppSelect
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            className={`bg-white border border-slate-300 ${compact ? 'h-8 rounded-lg px-2.5 text-xs' : 'h-10 rounded-xl px-3 text-sm'}`}
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
          />
        </div>
      </div>

      <div className="md:hidden flex items-center gap-2">
        <label className="h-10 bg-white border border-slate-300 rounded-lg px-3 flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter integrations"
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
        <AppSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          className="h-10 w-full bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700"
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="hidden md:grid grid-cols-2 gap-2.5">
        <label className="h-10 bg-white border border-slate-300 rounded-lg px-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter integrations"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </label>
        <AppSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          className="h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700"
          options={STATUS_OPTIONS}
        />
      </div>
    </>
  );
};

export default IntegrationFilters;
