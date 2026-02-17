import React, { useState } from 'react';
import { Clock, Loader2, Pause, Play, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { Task, TaskPriority, User } from '../../types';
import Button from '../ui/Button';
import { estimationService } from '../../services/estimationService';
import { settingsService } from '../../services/settingsService';

interface TaskDetailGeneralTabProps {
  task: Task;
  aiEnabled: boolean;
  allUsers: User[];
  onUpdate: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onAddComment: (id: string, text: string) => void;
  currentUser?: User;
  canApprove: boolean;
  totalTrackedMs: number;
  formatTrackedTime: (ms: number) => string;
  manualHours: string;
  setManualHours: (value: string) => void;
  manualMinutes: string;
  setManualMinutes: (value: string) => void;
  manualTimeError: string;
  setManualTimeError: (value: string) => void;
  addManualTime: (minutesToAdd?: number) => void;
  onToggleTimer?: (id: string) => void;
  riskAssessment: { isAtRisk: boolean; reason: string } | null;
  isAIThinking: boolean;
  runAIAudit: () => Promise<void>;
  description: string;
  setDescription: (value: string) => void;
  canManageTask: boolean;
  canTrackTime: boolean;
}

const TaskDetailGeneralTab: React.FC<TaskDetailGeneralTabProps> = ({
  task,
  aiEnabled,
  allUsers,
  onUpdate,
  onAddComment,
  currentUser,
  canApprove,
  totalTrackedMs,
  formatTrackedTime,
  manualHours,
  setManualHours,
  manualMinutes,
  setManualMinutes,
  manualTimeError,
  setManualTimeError,
  addManualTime,
  onToggleTimer,
  riskAssessment,
  isAIThinking,
  runAIAudit,
  description,
  setDescription,
  canManageTask,
  canTrackTime
}) => {
  const [newTag, setNewTag] = useState('');
  const approvalThresholdRatio = settingsService.getSettings().estimationApprovalThreshold;
  const estimateMinutes = task.estimateMinutes || 0;
  const estimationPreview =
    estimateMinutes > 0
      ? estimationService.getAdjustmentPreview(task.orgId, task.estimateProvidedBy || task.userId, estimateMinutes, {
        projectId: task.projectId,
        status: task.status,
        tags: task.tags
      })
      : null;
  const trackedMinutes = estimationService.getTrackedMinutes(task);
  const overrunRatio = estimateMinutes > 0 ? estimationService.getEstimateOverrunRatio(task) : 0;
  const overrunPercent = overrunRatio > 1 ? Math.round((overrunRatio - 1) * 100) : 0;
  const overrunApprovalRequired = estimationService.shouldRequireOverrunApprovalForDone(task);
  const requiresCompletionApproval = Boolean(estimationPreview?.requiresApproval) || overrunApprovalRequired;
  const adjustedHours = estimationPreview ? Math.max(0.25, estimationPreview.adjustedMinutes / 60).toFixed(2) : null;
  const estimateHours = estimateMinutes > 0 ? Math.max(0.25, estimateMinutes / 60).toFixed(2) : null;
  const trackedHours = Math.max(0.25, trackedMinutes / 60).toFixed(2);

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
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
      {task.priority === TaskPriority.HIGH ? (
        <div className={`rounded-xl border px-2.5 py-1.5 ${task.approvedAt ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className={`font-semibold uppercase tracking-wide shrink-0 ${task.approvedAt ? 'text-emerald-700' : 'text-slate-600'}`}>Approval</span>
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
      <div className={`grid grid-cols-1 ${aiEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col min-h-[220px]">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Planned effort (estimate)</h4>
          <div className="flex-1 min-h-0 flex flex-col gap-2.5">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="mt-1 text-lg font-bold text-slate-900 leading-none">
                {estimateMinutes > 0 ? `${Math.max(0.25, estimateMinutes / 60).toFixed(2)}h` : 'Not set'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Used for delivery forecast and estimate-vs-actual tracking.
              </p>
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
                  ).toFixed(2)}h tracked vs ${Math.max(0.25, estimateMinutes / 60).toFixed(
                    2
                  )}h estimated (${overrunPercent}% over, threshold ${Math.round((approvalThresholdRatio - 1) * 100)}%).`
                  : 'Completion requires Project Owner/Admin approval. Triggered by risk-adjusted forecast calibration.'}
              </div>
            ) : null}
            {canManageTask && requiresCompletionApproval && !task.estimateRiskApprovedAt ? (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs self-start"
                onClick={() =>
                  onUpdate(task.id, { estimateRiskApprovedAt: Date.now(), estimateRiskApprovedBy: currentUser?.displayName || 'Admin' })
                }
              >
                Approve risk-adjusted completion
              </Button>
            ) : null}
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col min-h-[220px]">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Time Tracked</h4>
          <div className="flex-1 min-h-0 flex flex-col gap-2.5">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-lg font-bold text-slate-900 leading-none whitespace-nowrap">{formatTrackedTime(totalTrackedMs)}</p>
                <span
                  className={`inline-flex items-center justify-center rounded-full p-1.5 ${
                  task.isTimerRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                  title={task.isTimerRunning ? 'Timer running' : 'Timer stopped'}
                  aria-label={task.isTimerRunning ? 'Timer running' : 'Timer stopped'}
                >
                  <Clock className="w-3 h-3" />
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              className={`h-8 px-3 text-xs justify-center ${
                task.isTimerRunning ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : ''
              }`}
              onClick={() => onToggleTimer?.(task.id)}
              disabled={!canTrackTime}
              title={task.isTimerRunning ? 'Stop timer' : 'Start timer'}
            >
              {task.isTimerRunning ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
              {task.isTimerRunning ? 'Stop' : 'Start'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                step={1}
                value={manualHours}
                onChange={(e) => {
                  setManualHours(e.target.value);
                  if (manualTimeError) setManualTimeError('');
                }}
                disabled={!canTrackTime}
                placeholder="Hours"
                className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:ring-2 focus:ring-slate-300"
              />
              <input
                type="number"
                min={0}
                step={1}
                value={manualMinutes}
                onChange={(e) => {
                  setManualMinutes(e.target.value);
                  if (manualTimeError) setManualTimeError('');
                }}
                disabled={!canTrackTime}
                placeholder="Minutes"
                className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:ring-2 focus:ring-slate-300"
              />
              <Button type="button" variant="secondary" className="col-span-2 h-8 px-3 text-xs" onClick={() => addManualTime()} disabled={!canTrackTime}>
                Add manual time
              </Button>
            </div>
            {!canTrackTime ? <p className="text-[11px] text-slate-500">Only assigned members, project owners, or admins can track time.</p> : null}
            {manualTimeError ? <p className="text-[11px] text-rose-600">{manualTimeError}</p> : null}
          </div>
        </div>

        {aiEnabled ? (
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
        ) : null}
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
        <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tags</h4>
            <span className="text-[11px] text-slate-500">{task.tags?.length || 0} {(task.tags?.length || 0) === 1 ? 'tag' : 'tags'}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(task.tags || []).length === 0 ? (
              <p className="text-[12px] text-slate-500">No tags yet.</p>
            ) : (
              (task.tags || []).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
                  {tag}
                  {canManageTask ? (
                    <button
                      type="button"
                      onClick={() => onUpdate(task.id, { tags: (task.tags || []).filter((item) => item !== tag) })}
                      className="text-slate-500 hover:text-slate-700"
                      title="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : null}
                </span>
              ))
            )}
          </div>
          {canManageTask ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  const next = newTag.trim();
                  if (!next || (task.tags || []).includes(next)) return;
                  onUpdate(task.id, { tags: [...(task.tags || []), next] });
                  setNewTag('');
                }}
                className="h-8 flex-1 rounded-md border border-slate-300 px-2 text-xs outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Add tag"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-3 text-xs"
                onClick={() => {
                  const next = newTag.trim();
                  if (!next || (task.tags || []).includes(next)) return;
                  onUpdate(task.id, { tags: [...(task.tags || []), next] });
                  setNewTag('');
                }}
              >
                Add
              </Button>
            </div>
          ) : null}
        </div>

        <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Documentation</h4>
        {canManageTask ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== task.description) {
                onUpdate(task.id, { description });
              }
            }}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm h-28 outline-none focus:ring-2 focus:ring-slate-300 transition-all resize-none font-medium"
          />
        ) : (
          <div className="max-h-28 overflow-y-auto custom-scrollbar pr-1">
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">{task.description || 'No documentation provided.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailGeneralTab;
