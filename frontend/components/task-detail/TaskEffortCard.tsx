import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Task, User } from '../../types';
import Button from '../ui/Button';
import { TASK_SECTION_SHELL, TASK_SECTION_TITLE, TASK_SUBCARD } from './taskDetailStyles';

interface TaskEffortCardProps {
  task: Task;
  currentUser?: User;
  canManageTask: boolean;
  estimateMinutes: number;
  estimateHours: string | null;
  trackedMinutes: number;
  approvalThresholdRatio: number;
  overrunPercent: number;
  requiresCompletionApproval: boolean;
  overrunApprovalRequired: boolean;
  showControls?: boolean;
  onUpdate: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
}

const TaskEffortCard: React.FC<TaskEffortCardProps> = ({
  task,
  currentUser,
  canManageTask,
  estimateMinutes,
  estimateHours,
  trackedMinutes,
  approvalThresholdRatio,
  overrunPercent,
  requiresCompletionApproval,
  overrunApprovalRequired,
  showControls = true,
  onUpdate
}) => {
  return (
    <>
      {task.movedBackAt && task.movedBackReason ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide text-amber-700 shrink-0">
              <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                <RotateCcw className="w-2.5 h-2.5" />
              </span>
              Moved Back
            </span>
            <span
              className="text-amber-900 truncate"
              title={`${task.movedBackReason} • ${task.movedBackBy || 'Unknown'} • ${new Date(task.movedBackAt).toLocaleString()}`}
            >
              {task.movedBackReason} • {task.movedBackBy || 'Unknown'} • {new Date(task.movedBackAt).toLocaleString()}
            </span>
          </div>
        </div>
      ) : null}

      <div className={TASK_SECTION_SHELL}>
        <h4 className={TASK_SECTION_TITLE}>Planned effort (estimate)</h4>
        <div className="mt-1 flex flex-col gap-1">
          <div className={TASK_SUBCARD}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-bold text-slate-900 leading-none">
                {estimateMinutes > 0 ? `${Math.max(0.25, estimateMinutes / 60).toFixed(2)}h` : 'Not set'}
              </p>
            </div>
            {canManageTask && showControls ? (
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
                className="mt-1 h-7 w-full rounded-md border border-slate-300 px-2 text-[11px] outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Set estimated hours"
              />
            ) : null}
          </div>

          {requiresCompletionApproval ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] text-amber-800">
              {overrunApprovalRequired
                ? `Owner/Admin approval required: tracked ${Math.max(0.25, trackedMinutes / 60).toFixed(2)}h vs estimate ${Math.max(0.25, estimateMinutes / 60).toFixed(2)}h (${overrunPercent}% over; threshold ${Math.round((approvalThresholdRatio - 1) * 100)}%).`
                : 'Owner/Admin approval required by forecast calibration.'}
            </div>
          ) : null}

          {canManageTask && showControls && requiresCompletionApproval && !task.estimateRiskApprovedAt ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-[10px] self-start"
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

        </div>
      </div>
    </>
  );
};

export default TaskEffortCard;
