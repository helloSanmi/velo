import React from 'react';
import { Task, TaskStatus } from '../../types';
import Button from '../ui/Button';
import { toastService } from '../../services/toastService';
import { Recommendation } from './useAnalyticsViewState';

interface AnalyticsRecommendationsPanelProps {
  recommendations: Recommendation[];
  onDismiss: (id: string) => void;
  setLocalTaskPatches: React.Dispatch<React.SetStateAction<Record<string, Partial<Task>>>>;
}

const AnalyticsRecommendationsPanel: React.FC<AnalyticsRecommendationsPanelProps> = ({
  recommendations,
  onDismiss,
  setLocalTaskPatches
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Actionable recommendations</h3>
        <span className="text-xs text-slate-500">{recommendations.length} actions</span>
      </div>
      <div className="space-y-2.5">
        {recommendations.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            No immediate actions. This project is currently stable.
          </p>
        ) : (
          recommendations.map((recommendation) => (
            <div key={recommendation.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{recommendation.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{recommendation.detail}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    recommendation.impact === 'high' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {recommendation.impact} impact
                </span>
              </div>
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Affects:{' '}
                  {recommendation.taskNames.length > 0
                    ? recommendation.taskNames.slice(0, 2).join(', ')
                    : `${recommendation.taskIds.length} task${recommendation.taskIds.length === 1 ? '' : 's'}`}
                  {recommendation.taskNames.length > 2 ? ` +${recommendation.taskNames.length - 2} more` : ''}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => {
                    onDismiss(recommendation.id);
                    setLocalTaskPatches((prev) => {
                      const next = { ...prev };
                      recommendation.taskIds.forEach((taskId) => {
                        const current = next[taskId] || {};
                        if (recommendation.id === 'mark-overdue-risk' || recommendation.id === 'budget-risk') {
                          next[taskId] = { ...current, isAtRisk: true };
                        } else if (recommendation.id === 'start-high-priority') {
                          next[taskId] = { ...current, status: TaskStatus.IN_PROGRESS };
                        }
                      });
                      return next;
                    });
                    recommendation.apply();
                    toastService.success('Recommendation applied', recommendation.title);
                  }}
                >
                  {recommendation.applyLabel}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default AnalyticsRecommendationsPanel;
