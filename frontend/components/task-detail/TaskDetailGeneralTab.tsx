import React from 'react';
import { Task, User } from '../../types';
import { estimationService } from '../../services/estimationService';
import { settingsService } from '../../services/settingsService';
import TaskEffortCard from './TaskEffortCard';
import TaskTimeTrackedCard from './TaskTimeTrackedCard';
import TaskAIAuditCard from './TaskAIAuditCard';
import TaskTagsDocumentationPanel from './TaskTagsDocumentationPanel';

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
  void allUsers;

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
      <TaskEffortCard
        task={task}
        currentUser={currentUser}
        canApprove={canApprove}
        canManageTask={canManageTask}
        estimateMinutes={estimateMinutes}
        estimateHours={estimateHours}
        trackedMinutes={trackedMinutes}
        approvalThresholdRatio={approvalThresholdRatio}
        overrunPercent={overrunPercent}
        requiresCompletionApproval={requiresCompletionApproval}
        overrunApprovalRequired={overrunApprovalRequired}
        onUpdate={onUpdate}
        onAddComment={onAddComment}
      />

      <div className={`grid grid-cols-1 ${aiEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
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
        />

        {aiEnabled ? (
          <TaskAIAuditCard
            canManageTask={canManageTask}
            isAIThinking={isAIThinking}
            runAIAudit={runAIAudit}
            riskAssessment={riskAssessment}
            estimateHours={estimateHours}
            trackedHours={trackedHours}
            adjustedHours={adjustedHours}
            overrunPercent={overrunPercent}
          />
        ) : null}
      </div>

      <TaskTagsDocumentationPanel
        task={task}
        description={description}
        setDescription={setDescription}
        canManageTask={canManageTask}
        onUpdate={onUpdate}
      />
    </div>
  );
};

export default TaskDetailGeneralTab;
