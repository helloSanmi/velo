import React from 'react';
import { Loader2 } from 'lucide-react';
import Button from '../ui/Button';

interface TaskAIAuditCardProps {
  canManageTask: boolean;
  isAIThinking: boolean;
  runAIAudit: () => Promise<void>;
  riskAssessment: { isAtRisk: boolean; reason: string } | null;
  estimateHours: string | null;
  trackedHours: string;
  adjustedHours: string | null;
  overrunPercent: number;
}

const TaskAIAuditCard: React.FC<TaskAIAuditCardProps> = ({
  canManageTask,
  isAIThinking,
  runAIAudit,
  riskAssessment,
  estimateHours,
  trackedHours,
  adjustedHours,
  overrunPercent
}) => {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col min-h-[220px]">
      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">AI Audit</h4>
      <div className="flex-1 min-h-0 flex flex-col gap-2.5">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
          <p className={`mt-1 text-sm font-semibold ${riskAssessment ? (riskAssessment.isAtRisk ? 'text-rose-700' : 'text-emerald-700') : 'text-slate-700'}`}>
            {riskAssessment ? (riskAssessment.isAtRisk ? 'At risk' : 'Healthy') : 'Not checked yet'}
          </p>
        </div>

        <Button size="sm" onClick={runAIAudit} disabled={isAIThinking || !canManageTask} className="h-8 px-2 rounded-lg text-xs self-start">
          {isAIThinking ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
          {riskAssessment ? 'Run again' : 'Run check'}
        </Button>
        {!canManageTask ? <p className="text-[11px] text-slate-500">Only project owner/admin can run AI audit.</p> : null}

        {estimateHours ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-700">
            <p className="font-semibold text-slate-800">Forecast signal</p>
            <p className="mt-0.5">
              Estimated {estimateHours}h • Tracked {trackedHours}h
              {adjustedHours ? ` • Suggested ${adjustedHours}h` : ''}
            </p>
            <p className="mt-0.5 text-slate-600">
              {overrunPercent > 0
                ? `Tracked effort is ${overrunPercent}% above estimate.`
                : 'Tracked effort is within estimate range.'}
            </p>
          </div>
        ) : null}

        <div className="min-h-0 overflow-y-auto custom-scrollbar pr-1">
          <p className="text-xs text-slate-600 leading-relaxed">
            {riskAssessment?.reason || 'Run a health check to detect possible delivery risks.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaskAIAuditCard;
