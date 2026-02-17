import { useEffect, useMemo, useRef, useState } from 'react';
import { Task, TaskPriority, TaskStatus, User, Subtask } from '../types';
import { aiService } from '../services/aiService';
import { userService } from '../services/userService';
import { realtimeService } from '../services/realtimeService';
import { TaskDetailTabType } from '../components/task-detail/types';
import { dialogService } from '../services/dialogService';
import { aiJobService } from '../services/aiJobService';
import { toastService } from '../services/toastService';

interface UseTaskDetailStateParams {
  task: Task;
  tasks: Task[];
  currentUser?: User;
  aiEnabled: boolean;
  initialTab?: TaskDetailTabType;
  onUpdate: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'order'>>) => void;
  onAddComment: (id: string, text: string) => void;
}

export const useTaskDetailState = ({
  task,
  tasks,
  currentUser,
  aiEnabled,
  initialTab,
  onUpdate,
  onAddComment
}: UseTaskDetailStateParams) => {
  const [activeTab, setActiveTab] = useState<TaskDetailTabType>(initialTab || 'general');
  const [description, setDescription] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [securityGroupIds, setSecurityGroupIds] = useState<string[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<{ isAtRisk: boolean; reason: string } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; lastSeen: number }>>({});
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isGeneratingSubtasksAI, setIsGeneratingSubtasksAI] = useState(false);
  const [dependencyQuery, setDependencyQuery] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualTimeError, setManualTimeError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const typingStopTimeoutRef = useRef<number | null>(null);
  const allUsers = userService.getUsers(currentUser?.orgId);

  useEffect(() => {
    if (activeTab === 'comments') {
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [activeTab, task.comments]);

  useEffect(() => {
    const normalizedAssignees =
      Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0
        ? task.assigneeIds
        : task.assigneeId
          ? [task.assigneeId]
          : [];
    setDescription(task.description);
    setAssigneeIds(normalizedAssignees);
    setSecurityGroupIds(Array.isArray(task.securityGroupIds) ? task.securityGroupIds : []);
    setRiskAssessment(task.isAtRisk ? { isAtRisk: true, reason: 'Health scan previously flagged this task.' } : null);
    setDependencyQuery('');
    setTypingUsers({});
    setActiveTab(initialTab || 'general');
  }, [task.id, initialTab]);

  useEffect(() => {
    // Keep AI audit result stable during task refreshes; only sync when the flag actually changes.
    setRiskAssessment((prev) => {
      if (typeof task.isAtRisk !== 'boolean') return prev;
      if (!prev) {
        return task.isAtRisk ? { isAtRisk: true, reason: 'Health scan previously flagged this task.' } : null;
      }
      if (prev.isAtRisk === task.isAtRisk) return prev;
      return task.isAtRisk
        ? { isAtRisk: true, reason: prev.reason || 'Health scan previously flagged this task.' }
        : { isAtRisk: false, reason: prev.reason || 'Task is currently healthy.' };
    });
  }, [task.isAtRisk]);

  useEffect(() => {
    if (!currentUser) return;
    const dedupeKey = `task-audit:${task.id}`;
    setIsAIThinking(aiJobService.isJobRunning(currentUser.orgId, currentUser.id, dedupeKey));
    const handler = () => setIsAIThinking(aiJobService.isJobRunning(currentUser.orgId, currentUser.id, dedupeKey));
    window.addEventListener(aiJobService.eventName, handler);
    return () => window.removeEventListener(aiJobService.eventName, handler);
  }, [currentUser, task.id]);

  useEffect(() => {
    if (!currentUser) return undefined;

    const stopTyping = () => {
      realtimeService.publish({
        type: 'COMMENT_TYPING',
        orgId: currentUser.orgId,
        actorId: currentUser.id,
        payload: {
          taskId: task.id,
          displayName: currentUser.displayName,
          isTyping: false
        }
      });
    };

    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type !== 'COMMENT_TYPING') return;
      if (event.orgId !== currentUser.orgId) return;
      const taskId = typeof event.payload?.taskId === 'string' ? event.payload.taskId : '';
      if (taskId !== task.id) return;
      const actorId = event.actorId;
      if (!actorId || actorId === currentUser.id) return;
      const displayName = typeof event.payload?.displayName === 'string' ? event.payload.displayName : 'Someone';
      const isActorTyping = Boolean(event.payload?.isTyping);
      setTypingUsers((prev) => {
        if (isActorTyping) return { ...prev, [actorId]: { name: displayName, lastSeen: Date.now() } };
        const next = { ...prev };
        delete next[actorId];
        return next;
      });
    });

    const cleanupTimer = window.setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        return Object.fromEntries(Object.entries(prev).filter(([, value]) => now - value.lastSeen < 4000));
      });
    }, 4000);

    return () => {
      unsubscribe();
      stopTyping();
      if (typingStopTimeoutRef.current) {
        window.clearTimeout(typingStopTimeoutRef.current);
        typingStopTimeoutRef.current = null;
      }
      window.clearInterval(cleanupTimer);
    };
  }, [task.id, currentUser?.id, currentUser?.orgId, currentUser?.displayName]);

  useEffect(() => {
    let interval: number | undefined;
    if (task.isTimerRunning && task.timerStartedAt) {
      interval = window.setInterval(() => {
        setElapsed(Date.now() - task.timerStartedAt!);
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [task.isTimerRunning, task.timerStartedAt]);

  const potentialDependencies = useMemo(
    () => tasks.filter((item) => item.id !== task.id && item.projectId === task.projectId),
    [tasks, task.id, task.projectId]
  );

  const totalTrackedMs = (task.timeLogged || 0) + elapsed;
  const canApprove = currentUser?.role === 'admin';

  const handleToggleDependency = (depId: string) => {
    const currentDeps = task.blockedByIds || [];
    const nextDeps = currentDeps.includes(depId)
      ? currentDeps.filter((id) => id !== depId)
      : [...currentDeps, depId];
    onUpdate(task.id, { blockedByIds: nextDeps });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;
    onAddComment(task.id, commentText);
    setCommentText('');
    setTypingUsers({});
    realtimeService.publish({
      type: 'COMMENT_TYPING',
      orgId: currentUser.orgId,
      actorId: currentUser.id,
      payload: {
        taskId: task.id,
        displayName: currentUser.displayName,
        isTyping: false
      }
    });
  };

  const handleTypingStart = () => {
    if (!currentUser) return;
    realtimeService.publish({
      type: 'COMMENT_TYPING',
      orgId: currentUser.orgId,
      actorId: currentUser.id,
      payload: {
        taskId: task.id,
        displayName: currentUser.displayName,
        isTyping: true
      }
    });
    if (typingStopTimeoutRef.current) window.clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = window.setTimeout(() => {
      realtimeService.publish({
        type: 'COMMENT_TYPING',
        orgId: currentUser.orgId,
        actorId: currentUser.id,
        payload: {
          taskId: task.id,
          displayName: currentUser.displayName,
          isTyping: false
        }
      });
      typingStopTimeoutRef.current = null;
    }, 1200);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    const value = newSubtaskTitle.trim();
    if (!value) return;
    const nextSubtasks: Subtask[] = [
      ...(task.subtasks || []),
      { id: `sub-${Date.now()}`, title: value, isCompleted: false }
    ];
    onUpdate(task.id, { subtasks: nextSubtasks });
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const nextSubtasks = (task.subtasks || []).map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, isCompleted: !subtask.isCompleted } : subtask
    );
    onUpdate(task.id, { subtasks: nextSubtasks });
  };

  const handleRemoveSubtask = async (subtaskId: string) => {
    const subtask = (task.subtasks || []).find((item) => item.id === subtaskId);
    const confirmed = await dialogService.confirm(`Delete subtask "${subtask?.title || 'this subtask'}"?`, {
      title: 'Delete subtask',
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    const nextSubtasks = (task.subtasks || []).filter((subtask) => subtask.id !== subtaskId);
    onUpdate(task.id, { subtasks: nextSubtasks });
  };

  const handleGenerateSubtasksWithAI = async () => {
    if (!aiEnabled || !currentUser) return;
    setIsGeneratingSubtasksAI(true);
    try {
      const steps = await aiService.breakDownTask(task.title, task.description || description);
      const cleaned = (steps || []).map((step) => step.trim()).filter(Boolean);
      if (cleaned.length === 0) {
        toastService.warning('No subtasks generated', 'Try a more specific task title or description.');
        return;
      }
      const existingTitles = new Set((task.subtasks || []).map((subtask) => subtask.title.trim().toLowerCase()));
      const uniqueSteps = cleaned.filter((step) => !existingTitles.has(step.toLowerCase()));
      if (uniqueSteps.length === 0) {
        toastService.info('No new subtasks', 'Generated subtasks already exist for this task.');
        return;
      }
      const nextSubtasks: Subtask[] = [
        ...(task.subtasks || []),
        ...uniqueSteps.map((title, index) => ({
          id: `sub-ai-${Date.now()}-${index}`,
          title,
          isCompleted: false
        }))
      ];
      onUpdate(task.id, { subtasks: nextSubtasks });
      onAddComment(
        task.id,
        `AI generated and applied ${uniqueSteps.length} subtask${uniqueSteps.length > 1 ? 's' : ''}.`
      );
      toastService.success('Subtasks generated', `${uniqueSteps.length} AI subtask${uniqueSteps.length > 1 ? 's' : ''} added.`);
    } catch (error) {
      toastService.error('AI generation failed', 'Please retry in a moment.');
    } finally {
      setIsGeneratingSubtasksAI(false);
    }
  };

  const addManualTime = (minutesToAdd?: number) => {
    const computedMinutes = minutesToAdd ?? (Number(manualHours || 0) * 60 + Number(manualMinutes || 0));
    if (!Number.isFinite(computedMinutes) || computedMinutes <= 0) {
      setManualTimeError('Enter hours or minutes greater than zero.');
      return;
    }
    onUpdate(task.id, { timeLogged: (task.timeLogged || 0) + Math.round(computedMinutes) * 60000 });
    setManualHours('');
    setManualMinutes('');
    setManualTimeError('');
  };

  const formatTrackedTime = (ms: number) => {
    const totalMinutes = Math.floor((ms || 0) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const runAIAudit = async () => {
    if (!aiEnabled || !currentUser) return;
    const dedupeKey = `task-audit:${task.id}`;
    setIsAIThinking(true);
    const result = await aiJobService.runJob({
      orgId: currentUser.orgId,
      userId: currentUser.id,
      type: 'task_audit',
      label: `Task AI audit for "${task.title}"`,
      dedupeKey,
      run: () => aiService.predictRisk(task),
      onSuccess: (assessment) => {
        setRiskAssessment(assessment);
        onUpdate(task.id, { isAtRisk: assessment.isAtRisk });
        toastService.success('AI audit complete', assessment.isAtRisk ? 'Task flagged as at risk.' : 'Task looks healthy.');
      },
      onError: () => {
        toastService.error('AI audit failed', 'Please retry in a moment.');
      }
    });
    if (result === null && !aiJobService.isJobRunning(currentUser.orgId, currentUser.id, dedupeKey)) {
      toastService.warning('AI audit unavailable', 'No result returned. Check AI settings and retry.');
    }
    setIsAIThinking(aiJobService.isJobRunning(currentUser.orgId, currentUser.id, dedupeKey));
  };

  return {
    activeTab,
    setActiveTab,
    description,
    setDescription,
    assigneeIds,
    setAssigneeIds,
    securityGroupIds,
    setSecurityGroupIds,
    commentText,
    setCommentText,
    isAIThinking,
    riskAssessment,
    typingUsers,
    newSubtaskTitle,
    setNewSubtaskTitle,
    isGeneratingSubtasksAI,
    dependencyQuery,
    setDependencyQuery,
    manualHours,
    setManualHours,
    manualMinutes,
    setManualMinutes,
    manualTimeError,
    setManualTimeError,
    commentsEndRef,
    allUsers,
    potentialDependencies,
    totalTrackedMs,
    canApprove,
    handleToggleDependency,
    handleAddComment,
    handleTypingStart,
    handleAddSubtask,
    handleToggleSubtask,
    handleRemoveSubtask,
    handleGenerateSubtasksWithAI,
    addManualTime,
    formatTrackedTime,
    runAIAudit
  };
};
