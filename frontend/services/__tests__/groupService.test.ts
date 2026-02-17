import { describe, expect, it, beforeEach } from 'vitest';
import { groupService } from '../groupService';
import { Project, User } from '../../types';

const orgId = 'org-test';
const admin: User = { id: 'u-admin', orgId, username: 'admin', displayName: 'Admin', role: 'admin' };
const owner: User = { id: 'u-owner', orgId, username: 'owner', displayName: 'Owner', role: 'member' };
const member: User = { id: 'u-member', orgId, username: 'member', displayName: 'Member', role: 'member' };
const outsider: User = { id: 'u-outsider', orgId, username: 'outsider', displayName: 'Outsider', role: 'member' };

const project: Project = {
  id: 'p-1',
  orgId,
  createdBy: owner.id,
  name: 'Project A',
  description: 'Desc',
  color: 'bg-indigo-600',
  members: [owner.id, member.id, admin.id]
};

describe('groupService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('allows only admin to create global group', () => {
    const blocked = groupService.createGroup(member, orgId, { name: 'Global Ops', scope: 'global', memberIds: [member.id] }, [project]);
    expect(blocked.error).toBeTruthy();

    const allowed = groupService.createGroup(admin, orgId, { name: 'Global Ops', scope: 'global', memberIds: [member.id] }, [project]);
    expect(allowed.group?.scope).toBe('global');
    expect(allowed.group?.memberIds).toEqual([member.id]);
  });

  it('allows project owner to create project-scoped group and filters members by project membership', () => {
    const result = groupService.createGroup(owner, orgId, {
      name: 'Delivery Team',
      scope: 'project',
      projectId: project.id,
      memberIds: [owner.id, member.id, outsider.id]
    }, [project]);

    expect(result.error).toBeUndefined();
    expect(result.group?.scope).toBe('project');
    expect(result.group?.projectId).toBe(project.id);
    expect(result.group?.memberIds.sort()).toEqual([owner.id, member.id].sort());
  });

  it('resolves assignees from direct assignees + valid group members within project scope', () => {
    const global = groupService.createGroup(admin, orgId, {
      name: 'Global Team',
      scope: 'global',
      memberIds: [member.id, outsider.id]
    }, [project]).group!;

    const scoped = groupService.createGroup(owner, orgId, {
      name: 'Project Team',
      scope: 'project',
      projectId: project.id,
      memberIds: [owner.id, outsider.id]
    }, [project]).group!;

    const resolved = groupService.resolveAssigneeIdsFromGroups(
      orgId,
      project.id,
      [owner.id, outsider.id],
      [global.id, scoped.id],
      [admin, owner, member, outsider],
      [project]
    );

    expect(resolved.securityGroupIds.sort()).toEqual([global.id, scoped.id].sort());
    expect(resolved.assigneeIds.sort()).toEqual([owner.id, member.id, outsider.id].sort());
  });

  it('keeps owner/admin assignable even when not listed in project members', () => {
    const ownerNotInMembersProject: Project = {
      ...project,
      id: 'p-2',
      members: [member.id]
    };
    const global = groupService.createGroup(admin, orgId, {
      name: 'Leadership',
      scope: 'global',
      memberIds: [owner.id, admin.id, outsider.id]
    }, [ownerNotInMembersProject]).group!;

    const resolved = groupService.resolveAssigneeIdsFromGroups(
      orgId,
      ownerNotInMembersProject.id,
      [owner.id, admin.id, outsider.id],
      [global.id],
      [admin, owner, member, outsider],
      [ownerNotInMembersProject]
    );

    expect(resolved.assigneeIds.sort()).toEqual([owner.id, admin.id, outsider.id].sort());
  });
});
