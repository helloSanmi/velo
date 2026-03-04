import React from 'react';
import { Search } from 'lucide-react';
import { Project } from '../../types';
import AppSelect from '../ui/AppSelect';
import { HorizonFilter, StatusFilter } from './types';

interface RoadmapFiltersSummaryCardProps {
  query: string;
  setQuery: (value: string) => void;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  projectFilter: string;
  setProjectFilter: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  horizonFilter: HorizonFilter;
  setHorizonFilter: (value: HorizonFilter) => void;
  projects: Project[];
  summary: { total: number; completed: number; atRisk: number; dueSoon: number; completionRate: number };
}

export const RoadmapFiltersSummaryCard: React.FC<RoadmapFiltersSummaryCardProps> = ({
  query,
  setQuery,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  projectFilter,
  setProjectFilter,
  statusFilter,
  setStatusFilter,
  horizonFilter,
  setHorizonFilter,
  projects,
  summary
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-3 md:p-3.5">
    <div className="flex items-start justify-between gap-2.5">
      <div>
        <h2 className="text-xl md:text-3xl leading-none font-semibold tracking-tight text-slate-900">Roadmap</h2>
        <p className="mt-1 text-xs md:text-sm text-slate-600">Strategic milestone planning across near-term and long-term delivery windows.</p>
      </div>
      <span className="inline-flex h-7 md:h-8 items-center rounded-lg md:rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 md:px-3 text-[11px] md:text-xs font-semibold tracking-wide text-indigo-700 shrink-0">
        {summary.completionRate}% COMPLETE
      </span>
    </div>

    <div className="mt-2.5">
      <div className="md:hidden flex items-center gap-2">
        <label className="h-10 rounded-lg border border-slate-300 bg-white px-3 flex items-center gap-2 flex-1 min-w-0">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search milestones"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 whitespace-nowrap"
        >
          {mobileFiltersOpen ? 'Hide filters' : 'Filters'}
        </button>
      </div>

      <div className={`${mobileFiltersOpen ? 'grid' : 'hidden'} md:hidden grid-cols-1 gap-2 mt-2`}>
        <AppSelect
          value={projectFilter}
          onChange={setProjectFilter}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
          options={[{ value: 'All', label: 'All projects' }, ...projects.map((project) => ({ value: project.id, label: project.name }))]}
        />
        <AppSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
          options={[
            { value: 'All', label: 'All status' },
            { value: 'On Track', label: 'On track' },
            { value: 'At Risk', label: 'At risk' },
            { value: 'Completed', label: 'Completed' }
          ]}
        />
        <AppSelect
          value={horizonFilter}
          onChange={(value) => setHorizonFilter(value as HorizonFilter)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
          options={[
            { value: 'All', label: 'All horizon' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: '180', label: '180 days' }
          ]}
        />
      </div>

      <div className="hidden md:grid grid-cols-[1.5fr_0.8fr_0.5fr_0.5fr] gap-2">
        <label className="h-10 rounded-lg border border-slate-300 bg-white px-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search roadmap milestones"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </label>
        <AppSelect
          value={projectFilter}
          onChange={setProjectFilter}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
          options={[{ value: 'All', label: 'All projects' }, ...projects.map((project) => ({ value: project.id, label: project.name }))]}
        />
        <AppSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
          options={[
            { value: 'All', label: 'All status' },
            { value: 'On Track', label: 'On track' },
            { value: 'At Risk', label: 'At risk' },
            { value: 'Completed', label: 'Completed' }
          ]}
        />
        <AppSelect
          value={horizonFilter}
          onChange={(value) => setHorizonFilter(value as HorizonFilter)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
          options={[
            { value: 'All', label: 'All horizon' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: '180', label: '180 days' }
          ]}
        />
      </div>
    </div>

    <div className="mt-2.5 grid grid-cols-2 gap-2 lg:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] text-slate-500">Milestones</p>
        <p className="text-lg md:text-2xl leading-none font-semibold text-slate-900 mt-1">{summary.total}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] text-slate-500">Completed</p>
        <p className="text-lg md:text-2xl leading-none font-semibold text-emerald-700 mt-1">{summary.completed}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] text-slate-500">At risk</p>
        <p className="text-lg md:text-2xl leading-none font-semibold text-rose-700 mt-1">{summary.atRisk}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] text-slate-500">Due in 14 days</p>
        <p className="text-lg md:text-2xl leading-none font-semibold text-amber-700 mt-1">{summary.dueSoon}</p>
      </div>
    </div>
  </section>
);
