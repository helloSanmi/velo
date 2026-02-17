import { beforeEach, describe, expect, it } from 'vitest';
import { Project } from '../../types';
import { projectService } from '../projectService';

const PROJECTS_KEY = 'velo_projects';

const baseProject: Project = {
  id: 'p-restore',
  orgId: 'org-1',
  createdBy: 'u-owner',
  ownerIds: ['u-owner'],
  name: 'Restore Project',
  description: '',
  color: 'bg-indigo-600',
  members: ['u-owner'],
  isArchived: true,
  isCompleted: false,
  isDeleted: false,
  completionRequestedAt: Date.now() - 1000,
  completionRequestedById: 'u-member',
  completionRequestedByName: 'Member',
  completionRequestedComment: 'Please complete',
  updatedAt: Date.now() - 1000
};

describe('projectService.restoreProject', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([baseProject]));
  });

  it('always sets reopenedAt and clears completion request metadata', () => {
    const updated = projectService.restoreProject(baseProject.id);
    expect(updated).toBeTruthy();
    expect(updated?.isArchived).toBe(false);
    expect(updated?.isCompleted).toBe(false);
    expect(updated?.isDeleted).toBe(false);
    expect(typeof updated?.reopenedAt).toBe('number');
    expect(updated?.completionRequestedAt).toBeUndefined();
    expect(updated?.completionRequestedById).toBeUndefined();
    expect(updated?.completionRequestedByName).toBeUndefined();
    expect(updated?.completionRequestedComment).toBeUndefined();
  });

  it('records actor id when provided', () => {
    const updated = projectService.restoreProject(baseProject.id, 'u-admin');
    expect(updated?.reopenedById).toBe('u-admin');
    expect(typeof updated?.reopenedAt).toBe('number');
  });
});
