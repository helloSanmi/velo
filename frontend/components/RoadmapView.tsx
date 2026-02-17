import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Clock3, Search, CircleDot } from 'lucide-react';
import { Project, Task, TaskStatus } from '../types';

interface RoadmapViewProps {
  tasks: Task[];
  projects: Project[];
}

type StatusFilter = 'All' | 'On Track' | 'At Risk' | 'Completed';
type HorizonFilter = 'All' | '30' | '90' | '180';

interface MilestoneItem extends Task {
  dueDate: number;
  dueInDays: number;
  completed: boolean;
  atRisk: boolean;
  lane: 'now' | 'next' | 'later' | 'completed';
  startInDays: number;
}

const DAY_MS = 86400000;

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const daysUntil = (targetTs: number) => Math.ceil((targetTs - startOfToday()) / DAY_MS);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const RoadmapView: React.FC<RoadmapViewProps> = ({ tasks, projects }) => {
  const [query, setQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>('All');

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const getDoneStageId = (projectId: string) => {
    const project = projectMap.get(projectId);
    return project?.stages?.[project.stages.length - 1]?.id || TaskStatus.DONE;
  };

  const milestones = useMemo<MilestoneItem[]>(() => {
    const nowStart = startOfToday();
    return tasks
      .filter((task) => typeof task.dueDate === 'number')
      .map((task) => {
        const dueDate = task.dueDate as number;
        const completed = task.status === getDoneStageId(task.projectId) || task.status === TaskStatus.DONE;
        const dueInDays = daysUntil(dueDate);
        const atRisk = !completed && (dueInDays < 0 || dueInDays <= 7 || Boolean(task.isAtRisk));
        const lane: MilestoneItem['lane'] = completed
          ? 'completed'
          : dueInDays <= 30
            ? 'now'
            : dueInDays <= 90
              ? 'next'
              : 'later';
        const startInDays = Math.floor(((task.createdAt || nowStart) - nowStart) / DAY_MS);
        return {
          ...task,
          dueDate,
          dueInDays,
          completed,
          atRisk,
          lane,
          startInDays
        };
      })
      .sort((a, b) => a.dueDate - b.dueDate);
  }, [tasks, projectMap]);

  const filteredMilestones = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return milestones
      .filter((task) => (projectFilter === 'All' ? true : task.projectId === projectFilter))
      .filter((task) => {
        if (statusFilter === 'All') return true;
        if (statusFilter === 'Completed') return task.completed;
        if (statusFilter === 'At Risk') return task.atRisk && !task.completed;
        return !task.completed && !task.atRisk;
      })
      .filter((task) => {
        if (horizonFilter === 'All') return true;
        const maxDays = Number(horizonFilter);
        return task.completed || task.dueInDays <= maxDays;
      })
      .filter((task) => {
        if (!normalized) return true;
        const projectName = projectMap.get(task.projectId)?.name || '';
        return `${task.title} ${projectName}`.toLowerCase().includes(normalized);
      });
  }, [horizonFilter, milestones, projectFilter, projectMap, query, statusFilter]);

  const nowMilestones = useMemo(
    () => filteredMilestones.filter((task) => !task.completed && task.dueInDays <= 30).sort((a, b) => b.dueDate - a.dueDate),
    [filteredMilestones]
  );

  const timelineMilestones = useMemo(
    () => filteredMilestones.filter((task) => !task.completed).slice(0, 14),
    [filteredMilestones]
  );

  const summary = useMemo(() => {
    const total = filteredMilestones.length;
    const completed = filteredMilestones.filter((item) => item.completed).length;
    const atRisk = filteredMilestones.filter((item) => item.atRisk && !item.completed).length;
    const dueSoon = filteredMilestones.filter((item) => !item.completed && item.dueInDays >= 0 && item.dueInDays <= 14).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, atRisk, dueSoon, completionRate };
  }, [filteredMilestones]);

  const timelineRangeDays = horizonFilter === 'All' ? 180 : Number(horizonFilter);

  const tickLabels = useMemo(() => {
    const day = new Date();
    const labels: string[] = [];
    for (let index = 0; index < 7; index += 1) {
      labels.push(
        new Date(day.getFullYear(), day.getMonth(), day.getDate() + index).toLocaleDateString('en-US', { weekday: 'short' })
      );
    }
    return labels;
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f3f6] p-3 md:p-5 custom-scrollbar">
      <div className="mx-auto max-w-[1400px] space-y-4">
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
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                <option value="All">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                <option value="All">All status</option>
                <option value="On Track">On track</option>
                <option value="At Risk">At risk</option>
                <option value="Completed">Completed</option>
              </select>
              <select
                value={horizonFilter}
                onChange={(event) => setHorizonFilter(event.target.value as HorizonFilter)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                <option value="All">All horizon</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
              </select>
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
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                <option value="All">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                <option value="All">All status</option>
                <option value="On Track">On track</option>
                <option value="At Risk">At risk</option>
                <option value="Completed">Completed</option>
              </select>
              <select
                value={horizonFilter}
                onChange={(event) => setHorizonFilter(event.target.value as HorizonFilter)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                <option value="All">All horizon</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
              </select>
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

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-slate-200 bg-white p-3 h-auto md:h-[580px] flex flex-col">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3 className="text-lg md:text-xl leading-none font-semibold tracking-tight text-slate-900">Now</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-1">0-30 days</p>
              </div>
              <span className="text-xs text-slate-500">{nowMilestones.length}</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
              {nowMilestones.length === 0 ? (
                <div className="h-32 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 flex items-center justify-center text-center px-3">
                  No milestones in this window.
                </div>
              ) : (
                nowMilestones.map((item) => {
                  const project = projectMap.get(item.projectId);
                  const dueText = item.dueInDays < 0 ? `${Math.abs(item.dueInDays)} day(s) overdue` : `Due in ${item.dueInDays} day${item.dueInDays === 1 ? '' : 's'}`;
                  return (
                    <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{item.title}</p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className={`h-2.5 w-2.5 rounded-full ${project?.color || 'bg-slate-400'}`} />
                        <span className="truncate">{project?.name || 'General'}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(item.dueDate).toLocaleDateString('en-GB')}
                        </span>
                        {item.atRisk ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                            <AlertTriangle className="h-3 w-3" />
                            Risk
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-amber-700">
                        <Clock3 className="h-3.5 w-3.5" />
                        {dueText}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </aside>

          <div className="rounded-xl border border-slate-200 bg-white p-3 h-auto md:h-[580px] flex flex-col">
            <div className="mb-2 flex items-start justify-between">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Current Timeline</h3>
              <span className="text-xs text-slate-500">{timelineMilestones.length}</span>
            </div>

            <div className="md:hidden rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              {timelineMilestones.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-sm text-slate-500">No timeline milestones for current filters.</div>
              ) : (
                timelineMilestones.slice(0, 8).map((item) => (
                  <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Due {new Date(item.dueDate).toLocaleDateString('en-GB')} • {projectMap.get(item.projectId)?.name || 'General'}
                    </p>
                  </article>
                ))
              )}
            </div>

            <div className="hidden md:block rounded-lg border border-slate-200 bg-slate-50 p-3 flex-1 min-h-0 overflow-auto custom-scrollbar">
              <div className="min-w-[780px]">
                <div className="grid grid-cols-7 gap-2 mb-3 text-[11px] font-medium text-slate-500">
                  {tickLabels.map((label, index) => (
                    <div key={`${label}-${index}`} className="text-center">{label}</div>
                  ))}
                </div>

                <div className="relative rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-rose-300" />

                  <div className="space-y-3">
                    {timelineMilestones.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-sm text-slate-500">No timeline milestones for current filters.</div>
                    ) : (
                      timelineMilestones.map((item, index) => {
                        const start = clamp(item.startInDays, 0, timelineRangeDays - 1);
                        const end = clamp(item.dueInDays, 0, timelineRangeDays);
                        const leftPercent = (start / timelineRangeDays) * 100;
                        const widthPercent = Math.max(1.5, ((Math.max(end, start + 1) - start) / timelineRangeDays) * 100);
                        const barColor = item.atRisk ? 'bg-rose-500' : index % 3 === 0 ? 'bg-blue-500' : index % 3 === 1 ? 'bg-amber-500' : 'bg-emerald-500';
                        return (
                          <div key={item.id} className="relative h-8 rounded-md border border-slate-100 bg-slate-50/70">
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 h-3 rounded-full ${barColor}`}
                              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                              title={`${item.title} • due ${new Date(item.dueDate).toLocaleDateString()}`}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RoadmapView;
