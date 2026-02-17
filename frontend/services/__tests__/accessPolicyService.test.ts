import { describe, expect, it } from 'vitest';
import { Project, Task, TaskPriority, User } from '../../types';
import { canUserAccessProject, getAccessibleProjectIds } from '../accessPolicyService';

const orgId = 'org-access';
const admin: User = { id: 'u-admin', orgId, username: 'admin', displayName: 'Admin', role: 'admin' };
const owner: User = { id: 'u-owner', orgId, username: 'owner', displayName: 'Owner', role: 'member' };
const member: User = { id: 'u-member', orgId, username: 'member', displayName: 'Member', role: 'member' };
const outsider: User = { id: 'u-outsider', orgId, username: 'outsider', displayName: 'Outsider', role: 'member' };

const baseProject: Project = {
  id: 'p-1',
  orgId,
  createdBy: owner.id,
  ownerIds: [owner.id],
  name: 'Project One',
  description: '',
  color: 'bg-indigo-600',
  members: [member.id]
};

const mkTask = (id: string, projectId: string, assigneeIds: string[] = []): Task => ({
  id,
  orgId,
  userId: owner.id,
  projectId,
  title: id,
  description: '',
  status: 'todo',
  priority: TaskPriority.MEDIUM,
  createdAt: Date.now(),
  order: 1,
  subtasks: [],
  tags: [],
  comments: [],
  auditLog: [],
  timeLogged: 0,
  assigneeIds,
  assigneeId: assigneeIds[0]
});

describe('accessPolicyService', () => {
  it('allows admins to access every project', () => {
    expect(canUserAccessProject({ user: admin, project: baseProject, tasks: [] })).toBe(true);
  });

  it('allows explicit owners even when not listed in members', () => {
    const project: Project = { ...baseProject, members: [member.id] };
    expect(canUserAccessProject({ user: owner, project, tasks: [] })).toBe(true);
  });

  it('allows project members', () => {
    expect(canUserAccessProject({ user: member, project: baseProject, tasks: [] })).toBe(true);
  });

  it('allows non-members assigned to a task in the project', () => {
    const tasks = [mkTask('t-1', baseProject.id, [outsider.id])];
    expect(canUserAccessProject({ user: outsider, project: baseProject, tasks })).toBe(true);
  });

  it('allows public project access for non-members', () => {
    const project: Project = { ...baseProject, isPublic: true };
    expect(canUserAccessProject({ user: outsider, project, tasks: [] })).toBe(true);
  });

  it('returns no access for unrelated private project', () => {
    expect(canUserAccessProject({ user: outsider, project: baseProject, tasks: [] })).toBe(false);
  });

  it('computes accessible ids with activeOnly filter', () => {
    const archivedProject: Project = { ...baseProject, id: 'p-2', isArchived: true };
    const publicProject: Project = { ...baseProject, id: 'p-3', isPublic: true, members: [] };
    const tasks = [mkTask('t-2', baseProject.id, [outsider.id])];
    const ids = getAccessibleProjectIds({
      user: outsider,
      projects: [baseProject, archivedProject, publicProject],
      tasks,
      activeOnly: true
    });
    expect(ids.has(baseProject.id)).toBe(true);
    expect(ids.has(publicProject.id)).toBe(true);
    expect(ids.has(archivedProject.id)).toBe(false);
  });
});
