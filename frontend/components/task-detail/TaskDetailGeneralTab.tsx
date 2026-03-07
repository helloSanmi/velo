import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { Task, User } from '../../types';
import { estimationService } from '../../services/estimationService';
import { settingsService } from '../../services/settingsService';
import Button from '../ui/Button';
import TaskEffortCard from './TaskEffortCard';
import TaskTimeTrackedCard from './TaskTimeTrackedCard';
import TaskAIAuditCard from './TaskAIAuditCard';
import TaskTagsDocumentationPanel from './TaskTagsDocumentationPanel';

interface TaskDetailGeneralTabProps {
  task: Task;
  aiPlanEnabled: boolean;
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
  aiPlanEnabled,
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
  void allUsers;
  const storageKey = useMemo(
    () => `velo_task_detail_effort_panel:${task.orgId}:${currentUser?.id || 'anonymous'}`,
    [task.orgId, currentUser?.id]
  );
  const [showEffortPanel, setShowEffortPanel] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(storageKey) === '1';
  });
  const [showEditPanel, setShowEditPanel] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, showEffortPanel ? '1' : '0');
  }, [storageKey, showEffortPanel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShowEffortPanel(window.localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  useEffect(() => {
    if (!showEffortPanel) setShowEditPanel(false);
  }, [showEffortPanel]);

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
  const aiStatus = riskAssessment ? (riskAssessment.isAtRisk ? 'At risk' : 'Healthy') : 'Not checked';
  const isHighPriority = String(task.priority || '').toLowerCase() === 'high';
  return (
    <div className="space-y-1 animate-in fade-in duration-300 w-full">
      <div className="w-full rounded-lg border border-slate-100 bg-slate-50/40">
        <div className="w-full px-3 py-2.5 flex items-start justify-between gap-2 rounded-lg hover:bg-slate-50/70 transition-colors">
          <button
            type="button"
            onClick={() =>
              setShowEffortPanel((prev) => {
                const next = !prev;
                if (next) setShowEditPanel(false);
                return next;
              })
            }
            className="min-w-0 flex-1 text-left"
            aria-expanded={showEffortPanel}
          >
            <p className="text-xs font-semibold text-slate-900">Effort and Delivery Health</p>
            {!showEffortPanel ? (
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex h-5 items-center rounded-full border border-slate-200 bg-white px-2 text-[10px] text-slate-700">
                  Estimate {estimateHours ? `${estimateHours}h` : 'not set'}
                </span>
                <span className="inline-flex h-5 items-center rounded-full border border-slate-200 bg-white px-2 text-[10px] text-slate-700">
                  Tracked {trackedHours}h
                </span>
                <span
                  className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] ${
                    aiStatus === 'At risk'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : aiStatus === 'Healthy'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  AI {aiStatus}
                </span>
              </div>
            ) : null}
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            {isHighPriority && !task.approvedAt ? (
              canApprove ? (
                <Button
                  size="sm"
                  className="h-7 px-2 text-[11px] shrink-0"
                  onClick={() => {
                    onUpdate(task.id, { approvedAt: Date.now(), approvedBy: currentUser?.displayName || 'Admin' });
                    onAddComment(task.id, `Approved for completion by ${currentUser?.displayName || 'Admin'}.`);
                  }}
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Approve high impact
                </Button>
              ) : (
                <span className="inline-flex h-7 items-center rounded-md border border-amber-200 bg-amber-50 px-2 text-[10px] font-medium text-amber-800 shrink-0">
                  Awaiting owner/admin approval
                </span>
              )
            ) : null}
            {showEffortPanel ? (
              <button
                type="button"
                onClick={() => setShowEditPanel((prev) => !prev)}
                className={`inline-flex h-7 items-center rounded-md border px-2 text-[10px] shrink-0 ${
                  showEditPanel ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {showEditPanel ? 'Done' : 'Edit'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowEffortPanel((prev) => !prev)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              aria-label={showEffortPanel ? 'Collapse effort panel' : 'Expand effort panel'}
            >
              {showEffortPanel ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showEffortPanel ? (
          <div className="px-1.5 pb-1.5 space-y-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
              <TaskEffortCard
                task={task}
                currentUser={currentUser}
                canManageTask={canManageTask}
                estimateMinutes={estimateMinutes}
                estimateHours={estimateHours}
                trackedMinutes={trackedMinutes}
                approvalThresholdRatio={approvalThresholdRatio}
                overrunPercent={overrunPercent}
                requiresCompletionApproval={requiresCompletionApproval}
                overrunApprovalRequired={overrunApprovalRequired}
                showControls={showEditPanel}
                onUpdate={onUpdate}
              />
              <TaskTimeTrackedCard
                task={task}
                formatTrackedTime={formatTrackedTime}
                totalTrackedMs={totalTrackedMs}
                canTrackTime={canTrackTime}
                onToggleTimer={onToggleTimer}
                manualHours={manualHours}
                setManualHours={setManualHours}
                manualMinutes={manualMinutes}
                setManualMinutes={setManualMinutes}
                manualTimeError={manualTimeError}
                setManualTimeError={setManualTimeError}
                addManualTime={addManualTime}
                showControls={showEditPanel}
              />
            </div>
            <TaskAIAuditCard
              canManageTask={canManageTask}
              aiPlanEnabled={aiPlanEnabled}
              aiEnabled={aiEnabled}
              isAIThinking={isAIThinking}
              runAIAudit={runAIAudit}
              riskAssessment={riskAssessment}
              estimateHours={estimateHours}
              trackedHours={trackedHours}
              adjustedHours={adjustedHours}
              overrunPercent={overrunPercent}
              showControls={showEditPanel}
            />
          </div>
        ) : null}
      </div>

      <div className="w-full">
        <TaskTagsDocumentationPanel
          task={task}
          description={description}
          setDescription={setDescription}
          canManageTask={canManageTask}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
};

export default TaskDetailGeneralTab;
