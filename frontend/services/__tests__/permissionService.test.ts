import { describe, expect, it } from 'vitest';
import { canManageProject } from '../permissionService';
import { Project, User } from '../../types';

const orgId = 'org-1';

const admin: User = { id: 'u-admin', orgId, username: 'admin', displayName: 'Admin', role: 'admin' };
const member: User = { id: 'u-member', orgId, username: 'member', displayName: 'Member', role: 'member' };
const owner: User = { id: 'u-owner', orgId, username: 'owner', displayName: 'Owner', role: 'member' };

const baseProject: Project = {
  id: 'p-1',
  orgId,
  name: 'Project',
  description: '',
  color: 'bg-indigo-600',
  members: [member.id, owner.id]
};

describe('permissionService.canManageProject', () => {
  it('allows admins regardless of project owner fields', () => {
    expect(canManageProject(admin, baseProject)).toBe(true);
  });

  it('does not infer owner from members[0]', () => {
    const legacyProject: Project = { ...baseProject, createdBy: undefined, ownerIds: [] };
    expect(canManageProject(member, legacyProject)).toBe(false);
  });

  it('allows explicit owner via createdBy', () => {
    const project: Project = { ...baseProject, createdBy: owner.id };
    expect(canManageProject(owner, project)).toBe(true);
    expect(canManageProject(member, project)).toBe(false);
  });

  it('allows explicit owner via ownerIds', () => {
    const project: Project = { ...baseProject, createdBy: undefined, ownerIds: [owner.id] };
    expect(canManageProject(owner, project)).toBe(true);
    expect(canManageProject(member, project)).toBe(false);
  });
});
