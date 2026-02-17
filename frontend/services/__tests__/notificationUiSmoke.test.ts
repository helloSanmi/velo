import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Project, Task, TaskPriority, TaskStatus, User } from '../../types';
import { notificationService } from '../notificationService';
import { processSlaNotifications } from '../slaNotificationService';
import { notifyProjectLifecycle } from '../projectNotificationService';
import { taskService } from '../taskService';
import { toastService } from '../toastService';
import { backendSyncService } from '../backendSyncService';

const ORG_ID = 'org-smoke';
const USERS_KEY = 'velo_users';
const PROJECTS_KEY = 'velo_projects';
const TASKS_KEY = 'velo_data';
const SESSION_KEY = 'velo_session';
const SETTINGS_KEY = `velo_settings:${ORG_ID}:u2`;

const admin: User = { id: 'u1', orgId: ORG_ID, username: 'admin', displayName: 'Admin', role: 'admin' };
const alex: User = { id: 'u2', orgId: ORG_ID, username: 'alex', displayName: 'Alex', role: 'member' };
const sarah: User = { id: 'u3', orgId: ORG_ID, username: 'sarah', displayName: 'Sarah', role: 'member' };
const mike: User = { id: 'u4', orgId: ORG_ID, username: 'mike', displayName: 'Mike', role: 'member' };

const project: Project = {
  id: 'p1',
  orgId: ORG_ID,
  name: 'Smoke Project',
  description: 'QA',
  color: 'bg-indigo-600',
  members: [admin.id, alex.id, sarah.id, mike.id],
  createdBy: admin.id
};

const seedTask = (dueDate?: number): Task => ({
  id: 't1',
  orgId: ORG_ID,
  userId: alex.id,
  assigneeId: alex.id,
  assigneeIds: [alex.id],
  projectId: project.id,
  title: 'Smoke Task',
  description: 'Desc',
  status: TaskStatus.TODO,
  priority: TaskPriority.HIGH,
  createdAt: Date.now(),
  order: 1,
  subtasks: [],
  tags: [],
  comments: [],
  auditLog: [],
  timeLogged: 0,
  dueDate
});

const seedStorage = (task: Task) => {
  localStorage.setItem(USERS_KEY, JSON.stringify([admin, alex, sarah, mike]));
  localStorage.setItem(PROJECTS_KEY, JSON.stringify([project]));
  localStorage.setItem(TASKS_KEY, JSON.stringify([task]));
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      enableNotifications: true,
      notificationDigestMode: 'instant',
      notificationInAppAssigned: true,
      notificationInAppCompleted: true,
      notificationInAppComments: true,
      notificationUrgentTasks: true,
      notificationMentionsFromLeads: true,
      notificationSound: false
    })
  );
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: alex.id, orgId: ORG_ID }));
};

describe('notification UI smoke flows', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(backendSyncService, 'updateTask').mockResolvedValue(undefined as any);
    vi.spyOn(backendSyncService, 'createTask').mockResolvedValue(undefined as any);
    vi.spyOn(backendSyncService, 'deleteTask').mockResolvedValue(undefined as any);
  });

  it('flow: assign -> unassign -> comment mention -> complete -> read controls', () => {
    seedStorage(seedTask());

    taskService.updateTask(admin.id, ORG_ID, 't1', { assigneeIds: [sarah.id], assigneeId: sarah.id }, admin.displayName);
    taskService.addComment(admin.id, ORG_ID, 't1', 'Please review @[Mike]', admin.displayName);
    taskService.updateTaskStatus(admin.id, ORG_ID, 't1', TaskStatus.DONE, admin.displayName);

    const sarahAlerts = notificationService.getNotifications(ORG_ID, sarah.id);
    const mikeAlerts = notificationService.getNotifications(ORG_ID, mike.id);
    const alexAlerts = notificationService.getNotifications(ORG_ID, alex.id);

    expect(sarahAlerts.some((n) => n.message.includes('Assigned: Smoke Task'))).toBe(true);
    expect(mikeAlerts.some((n) => n.title === 'You were mentioned')).toBe(true);
    expect(alexAlerts.some((n) => n.message.includes('Unassigned: Smoke Task'))).toBe(true);
    expect(sarahAlerts.some((n) => n.category === 'completed')).toBe(true);

    const unreadBefore = sarahAlerts.filter((n) => !n.read).length;
    expect(unreadBefore).toBeGreaterThan(0);
    notificationService.markAllAsRead(ORG_ID, sarah.id);
    const unreadAfter = notificationService.getNotifications(ORG_ID, sarah.id).filter((n) => !n.read).length;
    expect(unreadAfter).toBe(0);
  });

  it('flow: due soon + overdue + escalation + project lifecycle', () => {
    const now = Date.now();
    seedStorage(seedTask(now + 2 * 60 * 60 * 1000));
    processSlaNotifications({
      user: alex,
      allUsers: [admin, alex, sarah, mike],
      tasks: [seedTask(now + 2 * 60 * 60 * 1000)],
      enableEstimateCalibration: false,
      now
    });
    processSlaNotifications({
      user: alex,
      allUsers: [admin, alex, sarah, mike],
      tasks: [seedTask(now - 30 * 60 * 60 * 1000)],
      enableEstimateCalibration: false,
      now
    });
    notifyProjectLifecycle(admin, project, 'archived');

    const alexAlerts = notificationService.getNotifications(ORG_ID, alex.id);
    const sarahAlerts = notificationService.getNotifications(ORG_ID, sarah.id);
    const adminAlerts = notificationService.getNotifications(ORG_ID, admin.id);

    expect(alexAlerts.some((n) => n.title === 'Due soon')).toBe(true);
    expect(alexAlerts.some((n) => n.title === 'Task overdue')).toBe(true);
    expect(sarahAlerts.some((n) => n.title === 'Project archived')).toBe(true);
    expect(adminAlerts.some((n) => n.title === 'SLA escalation')).toBe(true);
  });

  it('shows toast event when current user receives notification', () => {
    seedStorage(seedTask());
    let toastCount = 0;
    const handler = () => {
      toastCount += 1;
    };
    window.addEventListener(toastService.eventName, handler as EventListener);

    notificationService.addNotification({
      orgId: ORG_ID,
      userId: alex.id,
      title: 'Direct',
      message: 'Direct smoke toast',
      type: 'SYSTEM',
      category: 'system'
    });

    window.removeEventListener(toastService.eventName, handler as EventListener);
    expect(toastCount).toBeGreaterThan(0);
  });
});
