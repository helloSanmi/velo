import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Task, TaskPriority, TaskStatus, User, Project } from '../../types';
import { notificationService } from '../notificationService';
import { taskService } from '../taskService';
import { backendSyncService } from '../backendSyncService';

const ORG_ID = 'org-1';
const USERS_KEY = 'velo_users';
const PROJECTS_KEY = 'velo_projects';
const TASKS_KEY = 'velo_data';
const SESSION_KEY = 'velo_session';
const SETTINGS_KEY = `velo_settings:${ORG_ID}:u1`;

const u1: User = { id: 'u1', orgId: ORG_ID, username: 'alex', displayName: 'Alex', role: 'member' };
const u2: User = { id: 'u2', orgId: ORG_ID, username: 'sarah', displayName: 'Sarah', role: 'member' };
const u3: User = { id: 'u3', orgId: ORG_ID, username: 'mike', displayName: 'Mike', role: 'member' };

const project: Project = {
  id: 'p1',
  orgId: ORG_ID,
  name: 'Proj',
  description: 'Desc',
  color: 'bg-indigo-600',
  members: [u1.id, u2.id, u3.id],
  createdBy: u1.id
};

const baseTask: Task = {
  id: 't1',
  orgId: ORG_ID,
  userId: u1.id,
  assigneeId: u1.id,
  assigneeIds: [u1.id],
  projectId: project.id,
  title: 'Task A',
  description: 'Desc',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  createdAt: Date.now(),
  order: 1,
  subtasks: [],
  tags: [],
  comments: [],
  auditLog: [],
  timeLogged: 0
};

describe('notification delivery QA', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(USERS_KEY, JSON.stringify([u1, u2, u3]));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([project]));
    localStorage.setItem(TASKS_KEY, JSON.stringify([baseTask]));
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: u1.id, orgId: ORG_ID }));
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        enableNotifications: false,
        notificationDigestMode: 'instant',
        notificationSound: false
      })
    );
    vi.spyOn(backendSyncService, 'updateTask').mockResolvedValue(undefined as any);
    vi.spyOn(backendSyncService, 'createTask').mockResolvedValue(undefined as any);
  });

  it('persists notification for recipient even if current session disabled notifications', () => {
    notificationService.addNotification({
      orgId: ORG_ID,
      userId: u2.id,
      title: 'Assigned',
      message: 'Assigned: Task A',
      type: 'ASSIGNMENT',
      category: 'assigned',
      linkId: 't1'
    });

    const u2Notifications = notificationService.getNotifications(ORG_ID, u2.id);
    expect(u2Notifications.length).toBe(1);
    expect(u2Notifications[0].message).toContain('Assigned: Task A');
  });

  it('creates both assign and unassign notifications on reassignment', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        enableNotifications: true,
        notificationDigestMode: 'instant',
        notificationSound: false
      })
    );

    taskService.updateTask(u1.id, ORG_ID, baseTask.id, {
      assigneeIds: [u2.id],
      assigneeId: u2.id
    });

    const assigned = notificationService.getNotifications(ORG_ID, u2.id);
    const unassigned = notificationService.getNotifications(ORG_ID, u1.id);

    expect(assigned.some((item) => item.message.includes('Assigned: Task A'))).toBe(true);
    expect(unassigned.some((item) => item.message.includes('Unassigned: Task A'))).toBe(true);
  });

  it('sends completion notification to other task participants', () => {
    taskService.updateTask(u1.id, ORG_ID, baseTask.id, {
      assigneeIds: [u2.id],
      assigneeId: u2.id
    });
    taskService.updateTaskStatus(u1.id, ORG_ID, baseTask.id, TaskStatus.DONE, u1.displayName);

    const assignedUserNotifications = notificationService.getNotifications(ORG_ID, u2.id);
    expect(assignedUserNotifications.some((item) => item.category === 'completed')).toBe(true);
  });

  it('sends comment notification to assignees and mentioned users', () => {
    taskService.updateTask(u1.id, ORG_ID, baseTask.id, {
      assigneeIds: [u2.id],
      assigneeId: u2.id
    });
    taskService.addComment(u1.id, ORG_ID, baseTask.id, 'Heads up @[Mike] please review', u1.displayName);

    const assigneeNotifications = notificationService.getNotifications(ORG_ID, u2.id);
    const mentionedNotifications = notificationService.getNotifications(ORG_ID, u3.id);

    expect(assigneeNotifications.some((item) => item.category === 'comment')).toBe(true);
    expect(mentionedNotifications.some((item) => item.title.toLowerCase().includes('mentioned'))).toBe(true);
  });

  it('notifies assignees when creating a new task', () => {
    taskService.createTask(
      u1.id,
      ORG_ID,
      project.id,
      'Task B',
      'Created',
      TaskPriority.MEDIUM,
      [],
      undefined,
      [u2.id, u3.id]
    );

    const u2Notifications = notificationService.getNotifications(ORG_ID, u2.id);
    const u3Notifications = notificationService.getNotifications(ORG_ID, u3.id);

    expect(u2Notifications.some((item) => item.message.includes('Assigned: Task B'))).toBe(true);
    expect(u3Notifications.some((item) => item.message.includes('Assigned: Task B'))).toBe(true);
  });
});
