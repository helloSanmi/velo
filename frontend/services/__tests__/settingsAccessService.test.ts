import { describe, expect, it } from 'vitest';
import { Project, Task, TaskPriority, TaskStatus, User } from '../../types';
import {
  canAccessWorkflowAutomation,
  canManageWorkflowAutomation,
  getWorkflowOwnerProjectIds,
  getWorkflowVisibleProjects
} from '../settingsAccessService';

const orgId = 'org-1';

const admin: User = {
  id: 'u-admin',
  orgId,
  username: 'admin',
  displayName: 'Admin',
  role: 'admin'
};

const owner: User = {
  id: 'u-owner',
  orgId,
  username: 'owner',
  displayName: 'Owner',
  role: 'member'
};

const member: User = {
  id: 'u-member',
  orgId,
  username: 'member',
  displayName: 'Member',
  role: 'member'
};

const outsider: User = {
  id: 'u-outsider',
  orgId,
  username: 'outsider',
  displayName: 'Outsider',
  role: 'member'
};

const privateProject: Project = {
  id: 'p-1',
  orgId,
  name: 'Project 1',
  description: 'Private',
  color: '#111827',
  createdBy: owner.id,
  ownerIds: [owner.id],
  members: [owner.id, member.id]
};

const assignedProject: Project = {
  id: 'p-2',
  orgId,
  name: 'Project 2',
  description: 'Assigned only',
  color: '#111827',
  createdBy: owner.id,
  ownerIds: [owner.id],
  members: [owner.id]
};

const projects = [privateProject, assignedProject];

const assignedTask: Task = {
  id: 't-1',
  orgId,
  userId: owner.id,
  assigneeIds: [outsider.id],
  projectId: assignedProject.id,
  title: 'Assigned work',
  description: '',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  createdAt: Date.now(),
  order: 0,
  subtasks: [],
  tags: [],
  comments: [],
  auditLog: [],
  timeLogged: 0
};

describe('settingsAccessService', () => {
  it('admin can see and manage workflow for all projects', () => {
    const visible = getWorkflowVisibleProjects(admin, projects, []);
    const manageable = getWorkflowOwnerProjectIds(admin, projects);
    expect(visible.map((p) => p.id)).toEqual(['p-1', 'p-2']);
    expect(manageable.has('p-1')).toBe(true);
    expect(manageable.has('p-2')).toBe(true);
    expect(canAccessWorkflowAutomation(admin, visible)).toBe(true);
    expect(canManageWorkflowAutomation(admin, manageable)).toBe(true);
  });

  it('owner can see owned/member projects and manage owned projects', () => {
    const visible = getWorkflowVisibleProjects(owner, projects, []);
    const manageable = getWorkflowOwnerProjectIds(owner, projects);
    expect(visible.map((p) => p.id)).toEqual(['p-1', 'p-2']);
    expect(canAccessWorkflowAutomation(owner, visible)).toBe(true);
    expect(canManageWorkflowAutomation(owner, manageable)).toBe(true);
  });

  it('member can view involved projects but cannot manage workflows', () => {
    const visible = getWorkflowVisibleProjects(member, projects, []);
    const manageable = getWorkflowOwnerProjectIds(member, projects);
    expect(visible.map((p) => p.id)).toEqual(['p-1']);
    expect(canAccessWorkflowAutomation(member, visible)).toBe(true);
    expect(canManageWorkflowAutomation(member, manageable)).toBe(false);
  });

  it('task-assigned non-member can view project workflows but cannot manage', () => {
    const visible = getWorkflowVisibleProjects(outsider, projects, [assignedTask]);
    const manageable = getWorkflowOwnerProjectIds(outsider, projects);
    expect(visible.map((p) => p.id)).toEqual(['p-2']);
    expect(canAccessWorkflowAutomation(outsider, visible)).toBe(true);
    expect(canManageWorkflowAutomation(outsider, manageable)).toBe(false);
  });

  it('uninvolved member cannot access workflow tab', () => {
    const user: User = { ...outsider, id: 'u-none', username: 'none', displayName: 'None' };
    const visible = getWorkflowVisibleProjects(user, projects, []);
    const manageable = getWorkflowOwnerProjectIds(user, projects);
    expect(visible).toHaveLength(0);
    expect(canAccessWorkflowAutomation(user, visible)).toBe(false);
    expect(canManageWorkflowAutomation(user, manageable)).toBe(false);
  });
});

