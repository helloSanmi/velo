import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import { TASK_SECTION_SHELL, TASK_SECTION_TITLE, TASK_SUBCARD } from './taskDetailStyles';
import { ensureAiAccess } from '../../services/aiAccessService';

interface TaskAIAuditCardProps {
  canManageTask: boolean;
  aiPlanEnabled: boolean;
  aiEnabled: boolean;
  isAIThinking: boolean;
  runAIAudit: () => Promise<void>;
  riskAssessment: { isAtRisk: boolean; reason: string } | null;
  estimateHours: string | null;
  trackedHours: string;
  adjustedHours: string | null;
  overrunPercent: number;
  showControls?: boolean;
}

const TaskAIAuditCard: React.FC<TaskAIAuditCardProps> = ({
  canManageTask,
  aiPlanEnabled,
  aiEnabled,
  isAIThinking,
  runAIAudit,
  riskAssessment,
  estimateHours,
  trackedHours,
  adjustedHours,
  overrunPercent,
  showControls = true
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const handleAiAction = () => {
    if (!ensureAiAccess({
      aiPlanEnabled,
      aiEnabled,
      hasPermission: canManageTask,
      featureLabel: 'AI audit',
      permissionMessage: 'Only project owner/admin can run AI audit.'
    })) return;
    void runAIAudit();
  };
  return (
    <div className={TASK_SECTION_SHELL}>
      <h4 className={TASK_SECTION_TITLE}>AI audit</h4>
      <div className="mt-1 flex flex-col gap-1">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className={TASK_SUBCARD}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
            <p className={`mt-1 text-[10px] font-semibold ${riskAssessment ? (riskAssessment.isAtRisk ? 'text-rose-700' : 'text-emerald-700') : 'text-slate-700'}`}>
              {riskAssessment ? (riskAssessment.isAtRisk ? 'At risk' : 'Healthy') : 'Not checked yet'}
            </p>
          </div>

          {showControls ? (
            <Button size="sm" onClick={handleAiAction} disabled={isAIThinking || (aiPlanEnabled && aiEnabled && !canManageTask)} className="h-7 px-2 rounded-md text-[10px] sm:self-start">
              {isAIThinking ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {!aiPlanEnabled ? 'Upgrade to Pro' : !aiEnabled ? 'Enable AI' : riskAssessment ? 'Run again' : 'Run check'}
            </Button>
          ) : null}
        </div>

        {showControls && !aiPlanEnabled ? <p className="text-[9px] text-slate-500">AI audit is available on Pro.</p> : null}
        {showControls && aiPlanEnabled && !aiEnabled ? <p className="text-[9px] text-slate-500">Enable AI in Settings to run AI audit.</p> : null}
        {showControls && aiPlanEnabled && aiEnabled && !canManageTask ? <p className="text-[9px] text-slate-500">Only project owner/admin can run AI audit.</p> : null}

        {estimateHours || adjustedHours || overrunPercent > 0 ? (
          <div className="rounded-md border border-slate-100 bg-slate-50/40 px-2 py-1 text-[9px] text-slate-700">
            <p className="font-semibold text-slate-800">Forecast signal</p>
            <p className="mt-0.5">
              {estimateHours ? `Estimate ${estimateHours}h` : 'Estimate not set'} • Tracked {trackedHours}h
              {adjustedHours ? ` • Suggested ${adjustedHours}h` : ''}
            </p>
            <p className="mt-0.5 text-slate-600">{overrunPercent > 0 ? `${overrunPercent}% above estimate` : 'Within estimate range'}</p>
          </div>
        ) : null}
        {showControls && riskAssessment?.reason ? (
          <button
            type="button"
            className="self-start text-[10px] text-slate-600 hover:text-slate-800 underline underline-offset-2"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        ) : null}
        {showDetails || !showControls ? (
          <div className="max-h-14 overflow-y-auto custom-scrollbar pr-1">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {riskAssessment?.reason || 'Run a health check to detect possible delivery risks.'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TaskAIAuditCard;
