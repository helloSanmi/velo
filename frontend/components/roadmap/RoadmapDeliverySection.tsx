import React from 'react';
import { AlertTriangle, CalendarDays, CircleDot, Clock3 } from 'lucide-react';
import { Project } from '../../types';
import { MilestoneItem } from './types';
import { clamp } from './useRoadmapViewState';

interface RoadmapDeliverySectionProps {
  nowMilestones: MilestoneItem[];
  timelineMilestones: MilestoneItem[];
  projectMap: Map<string, Project>;
  timelineRangeDays: number;
  tickLabels: string[];
}

export const RoadmapDeliverySection: React.FC<RoadmapDeliverySectionProps> = ({
  nowMilestones,
  timelineMilestones,
  projectMap,
  timelineRangeDays,
  tickLabels
}) => (
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
                      <CircleDot className="absolute top-1/2 -translate-y-1/2 left-0 h-3.5 w-3.5 text-slate-300" />
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
);
