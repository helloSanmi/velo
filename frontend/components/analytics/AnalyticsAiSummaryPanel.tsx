import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';

interface AnalyticsAiSummaryPanelProps {
  insights: { bottlenecks: string[]; suggestions: string[] } | null;
}

const AnalyticsAiSummaryPanel: React.FC<AnalyticsAiSummaryPanelProps> = ({ insights }) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">AI summary</h3>
        <Clock3 className="h-4 w-4 text-slate-400" />
      </div>
      {insights ? (
        <div className="space-y-2">
          {insights.bottlenecks.map((item, idx) => (
            <div key={`b-${idx}`} className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
          {insights.suggestions.map((item, idx) => (
            <div key={`s-${idx}`} className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Run AI analysis to get project-specific bottlenecks and recommendations.
        </p>
      )}
    </section>
  );
};

export default AnalyticsAiSummaryPanel;
