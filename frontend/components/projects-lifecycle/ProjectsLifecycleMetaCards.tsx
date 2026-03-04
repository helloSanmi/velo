import React from 'react';
import { Pencil } from 'lucide-react';
import { Project } from '../../types';
import { EditSection, LifecycleMetaItem } from './projectsLifecycle.types';

interface ProjectsLifecycleMetaCardsProps {
  focusedProject: Project;
  focusedProjectStats: {
    estimatedSpent?: number;
    trackedHours?: number;
    scopeGap?: number;
  } | null;
  canManageProject: boolean;
  currentUserRole?: 'admin' | 'member' | 'guest';
  ownerNames: string[];
  lifecycleMeta: LifecycleMetaItem[];
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onOpenEditor: (section: EditSection) => void;
}

const ProjectsLifecycleMetaCards: React.FC<ProjectsLifecycleMetaCardsProps> = ({
  focusedProject,
  focusedProjectStats,
  canManageProject,
  currentUserRole,
  ownerNames,
  lifecycleMeta,
  onUpdateProject,
  onOpenEditor
}) => {
  return (
    <>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="rounded-lg border border-slate-200 px-3 py-2 bg-white relative">
          <p className="text-[11px] text-slate-500">Timeline</p>
          <p className="text-sm font-semibold text-slate-900">
            {focusedProject.startDate ? new Date(focusedProject.startDate).toLocaleDateString() : 'No start'} -{' '}
            {focusedProject.endDate ? new Date(focusedProject.endDate).toLocaleDateString() : 'No end'}
          </p>
          {canManageProject ? (
            <button onClick={() => onOpenEditor('timeline')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" title="Edit timeline">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 px-3 py-2 bg-white relative">
          <p className="text-[11px] text-slate-500">Budget / Tracked spend</p>
          <p className="text-sm font-semibold text-slate-900">
            {focusedProject.budgetCost ? `$${focusedProject.budgetCost.toLocaleString()}` : 'No budget'} /{' '}
            {focusedProjectStats?.estimatedSpent ? `$${Math.round(focusedProjectStats.estimatedSpent).toLocaleString()}` : '-'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {focusedProjectStats?.trackedHours ? `${focusedProjectStats.trackedHours.toFixed(1)}h tracked` : '0.0h tracked'}
            {typeof focusedProject.hourlyRate === 'number' ? ` @ $${focusedProject.hourlyRate.toFixed(2)}/h` : ''}
          </p>
          {canManageProject ? (
            <button onClick={() => onOpenEditor('budget')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" title="Edit budget">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 px-3 py-2 bg-white relative">
          <p className="text-[11px] text-slate-500">Scope target</p>
          <p className="text-sm font-semibold text-slate-900">
            {typeof focusedProject.scopeSize === 'number' ? `${focusedProject.scopeSize} tasks` : 'Not set'}
            {typeof focusedProjectStats?.scopeGap === 'number'
              ? ` (${focusedProjectStats.scopeGap >= 0 ? '+' : ''}${focusedProjectStats.scopeGap} gap)`
              : ''}
          </p>
          {canManageProject ? (
            <button onClick={() => onOpenEditor('scope')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" title="Edit scope">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 px-3 py-2 bg-white relative">
          <p className="text-[11px] text-slate-500">Project owners</p>
          <p className="text-sm font-semibold text-slate-900 truncate">{ownerNames.length > 0 ? ownerNames.join(', ') : 'Not set'}</p>
          {currentUserRole === 'admin' ? (
            <button onClick={() => onOpenEditor('owners')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700" title="Edit owners">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 rounded-lg border border-slate-200 px-3 py-2 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-500">Public project</p>
            <p className="text-sm font-semibold text-slate-900">{focusedProject.isPublic ? 'Enabled' : 'Disabled'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Allow read-only public sharing.</p>
          </div>
          {canManageProject ? (
            <button
              type="button"
              onClick={() => onUpdateProject(focusedProject.id, { isPublic: !focusedProject.isPublic })}
              className={`w-11 h-6 rounded-full p-1 transition-colors ${focusedProject.isPublic ? 'bg-slate-900' : 'bg-slate-300'}`}
              title={focusedProject.isPublic ? 'Disable public sharing' : 'Enable public sharing'}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${focusedProject.isPublic ? 'translate-x-5' : ''}`} />
            </button>
          ) : null}
        </div>
      </div>

      {focusedProject.scopeSummary ? (
        <div className="mt-2 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
          <p className="text-[11px] text-slate-500">Scope summary</p>
          <p className="text-sm text-slate-700 mt-1">{focusedProject.scopeSummary}</p>
        </div>
      ) : null}

      {focusedProject.completionComment ? (
        <div className="mt-2 rounded-lg border border-emerald-200 px-3 py-2 bg-emerald-50">
          <p className="text-[11px] text-emerald-700">Completion note</p>
          <p className="text-sm text-emerald-900 mt-1">{focusedProject.completionComment}</p>
        </div>
      ) : null}

      {lifecycleMeta.length > 0 ? (
        <div className="mt-2 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Lifecycle history</p>
          <div className="mt-1.5 space-y-1">
            {lifecycleMeta.map((item) => (
              <p key={item.key} className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{item.label}</span>{' '}
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'time not recorded'} by {item.actor}
                {item.isApproximate ? ' (legacy record)' : ''}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ProjectsLifecycleMetaCards;
