import { describe, expect, it } from 'vitest';
import { Project, Task, TaskPriority } from '../../types';
import {
  getReopenReleaseProjectIds,
  getStalePendingApprovalProjectIds
} from '../completionFlowService';

const makeProject = (id: string, overrides?: Partial<Project>): Project => ({
  id,
  orgId: 'org-1',
  createdBy: 'owner-1',
  ownerIds: ['owner-1'],
  name: `Project ${id}`,
  description: '',
  color: '#000',
  members: ['owner-1', 'member-1'],
  stages: [
    { id: 'todo', name: 'To Do' },
    { id: 'in-progress', name: 'In Progress' },
    { id: 'done', name: 'Done' }
  ],
  ...overrides
});

const makeTask = (id: string, projectId: string, status: string): Task => ({
  id,
  orgId: 'org-1',
  userId: 'member-1',
  projectId,
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
  timeLogged: 0
});

describe('completion flow multi-project selectors', () => {
  it('returns stale pending request ids only for projects that have tasks outside final stage', () => {
    const now = Date.now();
    const p1 = makeProject('p1', {
      completionRequestedAt: now,
      completionRequestedById: 'member-1'
    });
    const p2 = makeProject('p2', {
      completionRequestedAt: now,
      completionRequestedById: 'member-1'
    });
    const p3 = makeProject('p3', {
      completionRequestedAt: now,
      completionRequestedById: 'member-1'
    });
    const tasks = [
      makeTask('t1', 'p1', 'done'),
      makeTask('t2', 'p1', 'in-progress'),
      makeTask('t3', 'p2', 'done'),
      makeTask('t4', 'p2', 'done')
    ];

    expect(getStalePendingApprovalProjectIds([p1, p2, p3], tasks)).toEqual(['p1']);
  });

  it('returns reopen release ids only for matching projects and respects per-project final stage', () => {
    const p1 = makeProject('p1', {
      reopenedAt: Date.now(),
      reopenedById: 'owner-1'
    });
    const p2 = makeProject('p2', {
      reopenedAt: Date.now(),
      reopenedById: 'owner-1',
      stages: [
        { id: 'todo', name: 'To Do' },
        { id: 'in-progress', name: 'In Progress' },
        { id: 'qa', name: 'QA' }
      ]
    });
    const p3 = makeProject('p3', {
      reopenedAt: Date.now(),
      reopenedById: 'owner-1',
      isArchived: true
    });
    const tasks = [
      makeTask('t1', 'p1', 'done'),
      makeTask('t2', 'p1', 'in-progress'),
      makeTask('t3', 'p2', 'qa'),
      makeTask('t4', 'p2', 'qa'),
      makeTask('t5', 'p3', 'in-progress')
    ];

    expect(getReopenReleaseProjectIds([p1, p2, p3], tasks)).toEqual(['p1']);
  });
});
