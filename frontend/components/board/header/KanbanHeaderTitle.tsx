import React from 'react';
import { Pin, X } from 'lucide-react';
import { User } from '../../../types';

interface KanbanHeaderTitleProps {
  projectName: string;
  forecastSummary?: { estimatedMinutes: number; adjustedMinutes: number; riskLabel: 'On-track' | 'Tight' | 'At risk' };
  projectMetaSummary?: {
    timeline: string;
    timelineStatus?: 'healthy' | 'near' | 'over' | 'neutral';
    scope: string;
    scopeStatus?: 'healthy' | 'near' | 'over' | 'neutral';
    budget: string;
    tracked: string;
    trackedCost?: string;
    hourlyRate?: string;
    overBudget?: boolean;
    budgetStatus?: 'healthy' | 'near' | 'over';
  };
  ownerId?: string;
  currentUserId: string;
  allUsers: User[];
  showOwner: boolean;
  isCompletionPostponed?: boolean;
  completionActionLabel?: string;
  completionPendingLabel?: string;
  onResumeProjectCompletion?: () => void;
  pinnedInsights?: string[];
  onUnpinInsight?: (insight: string) => void;
}

const KanbanHeaderTitle: React.FC<KanbanHeaderTitleProps> = ({
  projectName,
  forecastSummary,
  projectMetaSummary,
  ownerId,
  currentUserId,
  allUsers,
  showOwner,
  isCompletionPostponed,
  completionActionLabel = 'Finish project',
  completionPendingLabel,
  onResumeProjectCompletion,
  pinnedInsights = [],
  onUnpinInsight
}) => {
  const owner = ownerId ? allUsers.find((user) => user.id === ownerId) : undefined;
  const ownerLabel = owner ? (owner.id === currentUserId ? `${owner.displayName} (you)` : owner.displayName) : 'Unknown owner';

  return (
    <div className="min-w-0">
      <h2 className="pt-0.5 text-xl md:text-[26px] leading-tight font-semibold tracking-tight text-slate-900 truncate">{projectName}</h2>
      {showOwner && isCompletionPostponed ? (
        <div className="mt-1 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
          <span className="text-[11px] font-medium text-amber-800">Completion postponed</span>
          {onResumeProjectCompletion ? (
            <button
              onClick={onResumeProjectCompletion}
              className="h-6 px-2 rounded-md border border-amber-300 bg-white text-[11px] font-medium text-amber-800 hover:bg-amber-100"
            >
              {completionActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      {showOwner && completionPendingLabel ? (
        <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-1">
          <span className="text-[11px] font-medium text-sky-800">{completionPendingLabel}</span>
        </div>
      ) : null}
      {showOwner ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          <span>Owner: {ownerLabel}</span>
          {forecastSummary && forecastSummary.estimatedMinutes > 0 ? (
            <span>
              • Forecast: {Math.round(forecastSummary.estimatedMinutes / 60)}h planned • {Math.round(forecastSummary.adjustedMinutes / 60)}h risk-adjusted • {forecastSummary.riskLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      {showOwner && projectMetaSummary ? (
        <p className="mt-0.5 text-[11px] text-slate-600 truncate">
          Scope: {projectMetaSummary.scope} • Timeline: {projectMetaSummary.timeline} • Budget: {projectMetaSummary.budget} • Tracked: {projectMetaSummary.tracked}
          {projectMetaSummary.trackedCost ? ` (${projectMetaSummary.trackedCost})` : ''}
          {projectMetaSummary.hourlyRate ? ` @ ${projectMetaSummary.hourlyRate}` : ''}
        </p>
      ) : null}
      {showOwner && pinnedInsights.length > 0 ? (
        <div className="mt-1.5 rounded-md border border-slate-200 bg-slate-50 p-1.5">
          <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <Pin className="w-3 h-3" />
            Pinned insights
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
            {pinnedInsights.map((insight, index) => (
              <div key={`${insight}-${index}`} className="flex items-start gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <p className="flex-1 min-w-0 text-[11px] text-slate-700 line-clamp-2">{insight}</p>
                {onUnpinInsight ? (
                  <button
                    type="button"
                    onClick={() => onUnpinInsight(insight)}
                    className="h-6 px-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[10px] text-slate-600 inline-flex items-center gap-1"
                    title="Unpin insight"
                  >
                    <X className="w-3 h-3" />
                    Unpin
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default KanbanHeaderTitle;
