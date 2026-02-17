import { beforeEach, describe, expect, it } from 'vitest';
import { TaskPriority, User, Project } from '../../types';
import { taskService } from '../taskService';
import { PROJECTS_KEY, USERS_KEY } from '../user-service/constants';

const orgId = 'org-assign';
const owner: User = { id: 'u-owner', orgId, username: 'owner', displayName: 'Owner', role: 'member' };
const admin: User = { id: 'u-admin', orgId, username: 'admin', displayName: 'Admin', role: 'admin' };
const member: User = { id: 'u-member', orgId, username: 'member', displayName: 'Member', role: 'member' };
const outsider: User = { id: 'u-outsider', orgId, username: 'outsider', displayName: 'Outsider', role: 'member' };

const project: Project = {
  id: 'p-assign',
  orgId,
  createdBy: owner.id,
  ownerIds: [owner.id],
  name: 'Assignment Project',
  description: 'Assignment integration',
  color: 'bg-indigo-600',
  members: [member.id]
};

describe('task assignment integration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(USERS_KEY, JSON.stringify([owner, admin, member, outsider]));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([project]));
  });

  it('allows assigning a project admin who is not in project members', () => {
    const created = taskService.createTask(
      owner.id,
      orgId,
      project.id,
      'Task A',
      'Desc',
      TaskPriority.MEDIUM,
      [],
      undefined,
      [member.id]
    );

    taskService.updateTask(owner.id, orgId, created.id, {
      assigneeIds: [admin.id],
      assigneeId: admin.id
    });

    const updated = taskService.getTaskById(created.id);
    expect(updated?.assigneeIds).toEqual([admin.id]);
    expect(updated?.assigneeId).toBe(admin.id);
  });

  it('allows assigning the project owner even when owner is not listed in project members', () => {
    const created = taskService.createTask(
      owner.id,
      orgId,
      project.id,
      'Task B',
      'Desc',
      TaskPriority.MEDIUM,
      [],
      undefined,
      [member.id]
    );

    taskService.updateTask(owner.id, orgId, created.id, {
      assigneeIds: [owner.id],
      assigneeId: owner.id
    });

    const updated = taskService.getTaskById(created.id);
    expect(updated?.assigneeIds).toEqual([owner.id]);
    expect(updated?.assigneeId).toBe(owner.id);
  });

  it('allows assigning a regular org member who is not listed in project members', () => {
    const created = taskService.createTask(
      owner.id,
      orgId,
      project.id,
      'Task C',
      'Desc',
      TaskPriority.MEDIUM,
      [],
      undefined,
      [member.id]
    );

    taskService.updateTask(owner.id, orgId, created.id, {
      assigneeIds: [outsider.id],
      assigneeId: outsider.id
    });

    const updated = taskService.getTaskById(created.id);
    expect(updated?.assigneeIds).toEqual([outsider.id]);
    expect(updated?.assigneeId).toBe(outsider.id);
  });

  it('shows all project tasks to an assigned non-member user', () => {
    const taskA = taskService.createTask(
      owner.id,
      orgId,
      project.id,
      'Task D',
      'Desc',
      TaskPriority.MEDIUM
    );
    const taskB = taskService.createTask(
      owner.id,
      orgId,
      project.id,
      'Task E',
      'Desc',
      TaskPriority.MEDIUM
    );

    taskService.updateTask(owner.id, orgId, taskA.id, {
      assigneeIds: [outsider.id],
      assigneeId: outsider.id
    });

    const outsiderTasks = taskService.getTasks(outsider.id, orgId).filter((task) => task.projectId === project.id);
    const outsiderTaskIds = outsiderTasks.map((task) => task.id);

    expect(outsiderTaskIds).toContain(taskA.id);
    expect(outsiderTaskIds).toContain(taskB.id);
  });
});
