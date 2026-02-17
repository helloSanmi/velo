import { beforeEach, describe, expect, it } from 'vitest';
import { Project } from '../../types';
import { projectService } from '../projectService';

const PROJECTS_KEY = 'velo_projects';

const baseProject: Project = {
  id: 'p-public',
  orgId: 'org-public',
  createdBy: 'u-owner',
  ownerIds: ['u-owner'],
  name: 'Public Access Project',
  description: '',
  color: 'bg-indigo-600',
  members: ['u-owner'],
  isPublic: false
};

describe('projectService public access updates', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([baseProject]));
  });

  it('persists isPublic=true and ensures a publicToken is present', () => {
    const updated = projectService.updateProject(baseProject.id, { isPublic: true });
    expect(updated?.isPublic).toBe(true);
    expect(typeof updated?.publicToken).toBe('string');
    expect((updated?.publicToken || '').length).toBeGreaterThan(0);
  });
});
