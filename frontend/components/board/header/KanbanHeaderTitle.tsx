import React from 'react';
import { MessageSquare, Pin, X } from 'lucide-react';
import { User } from '../../../types';

interface KanbanHeaderTitleProps {
  projectName: string;
  totals: { total: number; todo: number; inProgress: number; done: number };
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
  onOpenOwnerChat: () => void;
  ownerChatUnreadCount: number;
  isCompletionPostponed?: boolean;
  completionActionLabel?: string;
  completionPendingLabel?: string;
  onResumeProjectCompletion?: () => void;
  pinnedInsights?: string[];
  onUnpinInsight?: (insight: string) => void;
}

const KanbanHeaderTitle: React.FC<KanbanHeaderTitleProps> = ({
  projectName,
  totals,
  forecastSummary,
  projectMetaSummary,
  ownerId,
  currentUserId,
  allUsers,
  showOwner,
  onOpenOwnerChat,
  ownerChatUnreadCount,
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
    <div className="lg:min-w-[280px] min-w-0">
      <h2 className="text-lg md:text-[28px] leading-none font-semibold tracking-tight text-slate-900 truncate">{projectName}</h2>
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
      <p className="text-[11px] text-slate-500 mt-0.5">
        {totals.total} tasks • {totals.todo} to do • {totals.inProgress} in progress • {totals.done} done
        {showOwner ? ` • Owner: ${ownerLabel}` : ''}
      </p>
      {forecastSummary && forecastSummary.estimatedMinutes > 0 ? (
        <p className="text-[11px] text-slate-500 mt-0.5">
          Forecast: {Math.round(forecastSummary.estimatedMinutes / 60)}h planned • {Math.round(forecastSummary.adjustedMinutes / 60)}h risk-adjusted • {forecastSummary.riskLabel}
        </p>
      ) : null}
      {showOwner && projectMetaSummary ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] ${
              projectMetaSummary.scopeStatus === 'over'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : projectMetaSummary.scopeStatus === 'near'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : projectMetaSummary.scopeStatus === 'healthy'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            Scope: {projectMetaSummary.scope}
            {projectMetaSummary.scopeStatus && projectMetaSummary.scopeStatus !== 'neutral' ? (
              <span className="ml-1.5 rounded-full border border-current/30 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide">
                {projectMetaSummary.scopeStatus === 'over'
                  ? 'Over scope'
                  : projectMetaSummary.scopeStatus === 'near'
                    ? 'Near scope'
                    : 'On scope'}
              </span>
            ) : null}
          </span>
          <span
            className={`inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[11px] ${
              projectMetaSummary.timelineStatus === 'over'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : projectMetaSummary.timelineStatus === 'near'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : projectMetaSummary.timelineStatus === 'healthy'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <span className="truncate">Timeline: {projectMetaSummary.timeline}</span>
          </span>
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
            Budget: {projectMetaSummary.budget}
          </span>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] ${
              projectMetaSummary.budgetStatus === 'over'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : projectMetaSummary.budgetStatus === 'near'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            Tracked: {projectMetaSummary.tracked}
            {projectMetaSummary.trackedCost ? ` (${projectMetaSummary.trackedCost})` : ''}
            {projectMetaSummary.hourlyRate ? ` @ ${projectMetaSummary.hourlyRate}` : ''}
          </span>
        </div>
      ) : null}
      {showOwner ? (
        <button
          onClick={onOpenOwnerChat}
          className="mt-1.5 h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 inline-flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat owner
          {ownerChatUnreadCount > 0 ? (
            <span className="h-4 min-w-4 px-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-semibold inline-flex items-center justify-center">
              {ownerChatUnreadCount}
            </span>
          ) : null}
        </button>
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
