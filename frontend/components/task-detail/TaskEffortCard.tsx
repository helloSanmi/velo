import React from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { Task, User } from '../../types';
import Button from '../ui/Button';

interface TaskEffortCardProps {
  task: Task;
  currentUser?: User;
  canApprove: boolean;
  canManageTask: boolean;
  estimateMinutes: number;
  estimateHours: string | null;
  trackedMinutes: number;
  approvalThresholdRatio: number;
  overrunPercent: number;
  requiresCompletionApproval: boolean;
  overrunApprovalRequired: boolean;
  onUpdate: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onAddComment: (id: string, text: string) => void;
}

const TaskEffortCard: React.FC<TaskEffortCardProps> = ({
  task,
  currentUser,
  canApprove,
  canManageTask,
  estimateMinutes,
  estimateHours,
  trackedMinutes,
  approvalThresholdRatio,
  overrunPercent,
  requiresCompletionApproval,
  overrunApprovalRequired,
  onUpdate,
  onAddComment
}) => {
  return (
    <>
      {task.movedBackAt && task.movedBackReason ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide text-amber-700 shrink-0">
              <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                <RotateCcw className="w-2.5 h-2.5" />
              </span>
              Moved Back
            </span>
            <span className="text-amber-900 truncate">
              {task.movedBackReason} • {task.movedBackBy || 'Unknown'} • {new Date(task.movedBackAt).toLocaleString()}
            </span>
          </div>
        </div>
      ) : null}

      {task.priority === 'high' ? (
        <div
          className={`rounded-xl border px-2.5 py-1.5 ${
            task.approvedAt ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className={`font-semibold uppercase tracking-wide shrink-0 ${task.approvedAt ? 'text-emerald-700' : 'text-slate-600'}`}>
              Approval
            </span>
            <span className={`truncate ${task.approvedAt ? 'text-emerald-900' : 'text-slate-700'}`}>
              {task.approvedAt
                ? `Approved by ${task.approvedBy || 'Admin'} on ${new Date(task.approvedAt).toLocaleString()}`
                : 'Approval required before moving this high-priority task to done.'}
            </span>
            {canApprove && !task.approvedAt ? (
              <Button
                size="sm"
                onClick={() => {
                  onUpdate(task.id, { approvedAt: Date.now(), approvedBy: currentUser?.displayName || 'Admin' });
                  onAddComment(task.id, `Approved for completion by ${currentUser?.displayName || 'Admin'}.`);
                }}
                className="h-7 px-2 text-[11px] shrink-0"
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                Approve
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col min-h-[220px]">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Planned effort (estimate)</h4>
        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="mt-1 text-lg font-bold text-slate-900 leading-none">
              {estimateMinutes > 0 ? `${Math.max(0.25, estimateMinutes / 60).toFixed(2)}h` : 'Not set'}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Used for delivery forecast and estimate-vs-actual tracking.</p>
            {canManageTask ? (
              <input
                type="number"
                min={0}
                step={0.25}
                value={estimateMinutes > 0 ? (estimateMinutes / 60).toString() : ''}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value) || value <= 0) {
                    onUpdate(task.id, { estimateMinutes: undefined, estimateProvidedBy: currentUser?.id, estimateProvidedAt: Date.now() });
                    return;
                  }
                  onUpdate(task.id, {
                    estimateMinutes: Math.round(value * 60),
                    estimateProvidedBy: currentUser?.id,
                    estimateProvidedAt: Date.now()
                  });
                }}
                className="mt-2 h-8 w-full rounded-md border border-slate-300 px-2 text-xs outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Set estimated hours"
              />
            ) : null}
          </div>

          {requiresCompletionApproval ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
              {overrunApprovalRequired
                ? `Completion requires Project Owner/Admin approval. Triggered by tracked overrun rule: ${Math.max(
                    0.25,
                    trackedMinutes / 60
                  ).toFixed(2)}h tracked vs ${Math.max(0.25, estimateMinutes / 60).toFixed(2)}h estimated (${overrunPercent}% over, threshold ${Math.round((approvalThresholdRatio - 1) * 100)}%).`
                : 'Completion requires Project Owner/Admin approval. Triggered by risk-adjusted forecast calibration.'}
            </div>
          ) : null}

          {canManageTask && requiresCompletionApproval && !task.estimateRiskApprovedAt ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs self-start"
              onClick={() =>
                onUpdate(task.id, {
                  estimateRiskApprovedAt: Date.now(),
                  estimateRiskApprovedBy: currentUser?.displayName || 'Admin'
                })
              }
            >
              Approve risk-adjusted completion
            </Button>
          ) : null}

          {estimateHours ? (
            <p className="text-[11px] text-slate-600">Baseline estimate: {estimateHours}h</p>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default TaskEffortCard;
