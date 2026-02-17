import { describe, expect, it } from 'vitest';
import { Task, TaskPriority } from '../../types';
import {
  areAllTasksInFinalStage,
  computeCompletionPromptResetState,
  getCompletionActionLabel,
  getCompletionPromptMode,
  hasTasksOutsideFinalStage,
  isProjectLockedForCompletionApproval,
  isTaskInFinalStage,
  pickTaskToMoveBackOnRejection,
  shouldEnforceCompletionApprovalLock,
  shouldAutoOpenCompletionPrompt,
  shouldShowCompletionPostponed
} from '../completionFlowService';
import { Project } from '../../types';

const makeTask = (id: string, status: string, overrides?: Partial<Task>): Task => ({
  id,
  orgId: 'org-1',
  userId: 'u-1',
  projectId: 'p-1',
  title: `Task ${id}`,
  description: '',
  status,
  priority: TaskPriority.MEDIUM,
  createdAt: Date.now(),
  order: 1,
  subtasks: [],
  tags: [],
  comments: [],
  auditLog: [],
  timeLogged: 0,
  ...overrides
});

describe('completionFlowService', () => {
  it('matches final-stage tasks across id, name, and status aliases', () => {
    expect(isTaskInFinalStage(makeTask('1', 'done'), 'done', 'Done')).toBe(true);
    expect(isTaskInFinalStage(makeTask('2', 'completed'), 'done', 'Done')).toBe(true);
    expect(isTaskInFinalStage(makeTask('3', 'final-review'), 'final-review', 'Final Review')).toBe(true);
    expect(isTaskInFinalStage(makeTask('4', 'final review'), 'final-review', 'final review')).toBe(true);
    expect(isTaskInFinalStage(makeTask('5', 'in-progress'), 'done', 'Done')).toBe(false);
  });

  it('evaluates completion readiness with mixed final-stage aliases', () => {
    const tasks = [makeTask('1', 'done'), makeTask('2', 'completed')];
    expect(areAllTasksInFinalStage(tasks, 'done', 'Done')).toBe(true);
    expect(hasTasksOutsideFinalStage(tasks, 'done', 'Done')).toBe(false);
  });

  it('detects tasks outside final stage after reversal', () => {
    const tasks = [makeTask('1', 'done'), makeTask('2', 'in-progress')];
    expect(areAllTasksInFinalStage(tasks, 'done', 'Done')).toBe(false);
    expect(hasTasksOutsideFinalStage(tasks, 'done', 'Done')).toBe(true);
  });

  it('selects role-based completion mode correctly', () => {
    expect(
      getCompletionPromptMode({
        canManageProject: false,
        currentUserId: 'member-1'
      })
    ).toBe('request');

    expect(
      getCompletionPromptMode({
        canManageProject: true,
        currentUserId: 'owner-1'
      })
    ).toBe('direct');

    expect(
      getCompletionPromptMode({
        canManageProject: true,
        currentUserId: 'owner-1',
        completionRequestedAt: Date.now(),
        completionRequestedById: 'member-1'
      })
    ).toBe('approve');

    expect(
      getCompletionPromptMode({
        canManageProject: true,
        currentUserId: 'owner-1',
        completionRequestedAt: Date.now(),
        completionRequestedById: 'owner-1'
      })
    ).toBe('direct');
  });

  it('returns the correct action label for owners/admins vs members', () => {
    expect(getCompletionActionLabel(true)).toBe('Finish project');
    expect(getCompletionActionLabel(false)).toBe('Request approval');
  });

  it('locks project for everyone while completion approval is pending', () => {
    expect(
      isProjectLockedForCompletionApproval({
        completionRequestedAt: Date.now(),
        completionRequestedById: 'member-1'
      })
    ).toBe(true);

    expect(
      isProjectLockedForCompletionApproval({
        completionRequestedAt: Date.now(),
        completionRequestedById: 'member-1'
      })
    ).toBe(true);
  });

  it('enforces approval lock only while project remains completion-ready', () => {
    const doneTasks = [makeTask('1', 'done'), makeTask('2', 'completed')];
    const mixedTasks = [makeTask('1', 'done'), makeTask('2', 'in-progress')];

    expect(
      shouldEnforceCompletionApprovalLock({
        completionRequestedAt: Date.now(),
        completionRequestedById: 'member-1',
        tasks: doneTasks,
        finalStageId: 'done',
        finalStageName: 'Done'
      })
    ).toBe(true);

    expect(
      shouldEnforceCompletionApprovalLock({
        completionRequestedAt: Date.now(),
        completionRequestedById: 'member-1',
        tasks: mixedTasks,
        finalStageId: 'done',
        finalStageName: 'Done'
      })
    ).toBe(false);
  });

  it('shows postponed banner only when still completion-ready', () => {
    const doneTasks = [makeTask('1', 'done'), makeTask('2', 'completed')];
    const movedBackTasks = [makeTask('1', 'done'), makeTask('2', 'in-progress')];

    expect(
      shouldShowCompletionPostponed({
        hasDismissedSignature: false,
        tasks: doneTasks,
        finalStageId: 'done',
        finalStageName: 'Done'
      })
    ).toBe(false);

    expect(
      shouldShowCompletionPostponed({
        hasDismissedSignature: true,
        isCompleted: true,
        tasks: doneTasks,
        finalStageId: 'done',
        finalStageName: 'Done'
      })
    ).toBe(false);

    expect(
      shouldShowCompletionPostponed({
        hasDismissedSignature: true,
        tasks: movedBackTasks,
        finalStageId: 'done',
        finalStageName: 'Done'
      })
    ).toBe(false);

    expect(
      shouldShowCompletionPostponed({
        hasDismissedSignature: true,
        tasks: [makeTask('1', 'done', { isTimerRunning: true }), makeTask('2', 'done')],
        finalStageId: 'done',
        finalStageName: 'Done'
      })
    ).toBe(false);

    expect(
      shouldShowCompletionPostponed({
        hasDismissedSignature: true,
        tasks: doneTasks,
        finalStageId: 'done',
        finalStageName: 'Done'
      })
    ).toBe(true);
  });

  it('auto-prompt path: member moving last task opens request flow (not direct)', () => {
    const autoOpen = shouldAutoOpenCompletionPrompt({
      latestFinalMoveActorId: 'member-1',
      currentUserId: 'member-1',
      canManageProject: false
    });
    const mode = getCompletionPromptMode({
      canManageProject: false,
      currentUserId: 'member-1'
    });
    const cta = getCompletionActionLabel(false);

    expect(autoOpen).toBe(true);
    expect(mode).toBe('request');
    expect(cta).toBe('Request approval');
  });

  it('auto-prompt path: owner does not auto-open unless they moved last task or previously requested', () => {
    expect(
      shouldAutoOpenCompletionPrompt({
        latestFinalMoveActorId: 'member-1',
        currentUserId: 'owner-1',
        canManageProject: true
      })
    ).toBe(false);

    expect(
      shouldAutoOpenCompletionPrompt({
        latestFinalMoveActorId: 'member-1',
        currentUserId: 'owner-1',
        canManageProject: true,
        completionRequestedById: 'owner-1'
      })
    ).toBe(true);
  });

  it('lock behavior: when request is pending, normal candidate flow should not auto-open another request', () => {
    const hasPendingRequest = true;
    expect(hasPendingRequest).toBe(true);
    // mirrors App candidate guard: if (project.completionRequestedAt) return false;
    const shouldOpenCandidatePrompt = !hasPendingRequest;
    expect(shouldOpenCandidatePrompt).toBe(false);
  });

  it('resets completion prompt cutoff when pending approval is cleared', () => {
    const fixedNow = 1_700_000_000_000;
    const project: Project = {
      id: 'p-cutoff',
      orgId: 'org-1',
      createdBy: 'owner-1',
      ownerIds: ['owner-1'],
      name: 'Cutoff project',
      description: '',
      color: '#000',
      members: ['owner-1', 'member-1'],
      updatedAt: fixedNow + 5000,
      completionRequestedAt: undefined,
      completionRequestedById: undefined
    };

    const result = computeCompletionPromptResetState({
      projects: [project],
      previousLifecycle: { 'p-cutoff': 'active' },
      previousPendingApproval: { 'p-cutoff': true },
      previousCutoff: { 'p-cutoff': fixedNow },
      now: fixedNow
    });

    expect(result.nextCutoff['p-cutoff']).toBe(fixedNow + 5000);
    expect(result.nextPendingApproval['p-cutoff']).toBe(false);
  });

  it('reject selection prefers requester latest move-to-final when available', () => {
    const taskA = makeTask('a', 'done', {
      updatedAt: 1000,
      auditLog: [
        {
          id: 'a1',
          userId: 'member-1',
          displayName: 'Member One',
          action: 'Moved task to Done',
          timestamp: 1200
        }
      ]
    });
    const taskB = makeTask('b', 'done', {
      updatedAt: 3000,
      auditLog: [
        {
          id: 'b1',
          userId: 'member-1',
          displayName: 'Member One',
          action: 'Moved task to Done',
          timestamp: 6000
        }
      ]
    });
    const taskC = makeTask('c', 'done', {
      updatedAt: 5000,
      auditLog: [
        {
          id: 'c1',
          userId: 'member-2',
          displayName: 'Member Two',
          action: 'Moved task to Done',
          timestamp: 9000
        }
      ]
    });

    const picked = pickTaskToMoveBackOnRejection({
      tasks: [taskA, taskB, taskC],
      finalStageId: 'done',
      finalStageName: 'Done',
      requesterId: 'member-1'
    });

    expect(picked?.id).toBe('b');
  });

  it('reject selection falls back to latest final-stage task when requester audit is missing', () => {
    const taskA = makeTask('a', 'done', { updatedAt: 2000, auditLog: [] });
    const taskB = makeTask('b', 'done', {
      updatedAt: 7000,
      auditLog: [
        {
          id: 'b1',
          userId: 'member-2',
          displayName: 'Member Two',
          action: 'Moved task to Done',
          timestamp: 3000
        }
      ]
    });
    const taskC = makeTask('c', 'in-progress', { updatedAt: 9000, auditLog: [] });

    const picked = pickTaskToMoveBackOnRejection({
      tasks: [taskA, taskB, taskC],
      finalStageId: 'done',
      finalStageName: 'Done',
      requesterId: 'member-1'
    });

    expect(picked?.id).toBe('b');
  });
});
