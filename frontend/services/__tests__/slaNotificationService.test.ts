import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Project, Task, TaskPriority, TaskStatus, User } from '../../types';
import { notificationService } from '../notificationService';
import { processSlaNotifications } from '../slaNotificationService';
import { estimationService } from '../estimationService';

const ORG_ID = 'org-1';
const USERS_KEY = 'velo_users';
const PROJECTS_KEY = 'velo_projects';
const SESSION_KEY = 'velo_session';
const SETTINGS_KEY = `velo_settings:${ORG_ID}:u2`;

const admin: User = { id: 'u1', orgId: ORG_ID, username: 'admin', displayName: 'Admin', role: 'admin' };
const memberA: User = { id: 'u2', orgId: ORG_ID, username: 'alex', displayName: 'Alex', role: 'member' };
const memberB: User = { id: 'u3', orgId: ORG_ID, username: 'sarah', displayName: 'Sarah', role: 'member' };

const project: Project = {
  id: 'p1',
  orgId: ORG_ID,
  name: 'Roadmap',
  description: 'Desc',
  color: 'bg-indigo-600',
  members: [admin.id, memberA.id, memberB.id],
  createdBy: admin.id
};

const buildTask = (overrides: Partial<Task>): Task => ({
  id: 't1',
  orgId: ORG_ID,
  userId: memberA.id,
  assigneeId: memberA.id,
  assigneeIds: [memberA.id, memberB.id],
  projectId: project.id,
  title: 'Task A',
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
  ...overrides
});

describe('SLA notification processing', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(USERS_KEY, JSON.stringify([admin, memberA, memberB]));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([project]));
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: memberA.id, orgId: ORG_ID }));
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        enableNotifications: true,
        notificationDigestMode: 'instant',
        notificationInAppAssigned: true,
        notificationInAppCompleted: true,
        notificationInAppComments: true,
        notificationUrgentTasks: true,
        notificationSound: false
      })
    );
  });

  it('triggers due soon and overdue for all assignees + owner', () => {
    const now = Date.now();
    processSlaNotifications({
      user: memberA,
      allUsers: [admin, memberA, memberB],
      tasks: [buildTask({ dueDate: now + 4 * 60 * 60 * 1000 })],
      enableEstimateCalibration: false,
      now
    });
    processSlaNotifications({
      user: memberA,
      allUsers: [admin, memberA, memberB],
      tasks: [buildTask({ dueDate: now - 5 * 60 * 60 * 1000 })],
      enableEstimateCalibration: false,
      now
    });

    const memberANotifications = notificationService.getNotifications(ORG_ID, memberA.id);
    const memberBNotifications = notificationService.getNotifications(ORG_ID, memberB.id);
    expect(memberANotifications.some((entry) => entry.title === 'Due soon')).toBe(true);
    expect(memberANotifications.some((entry) => entry.title === 'Task overdue')).toBe(true);
    expect(memberBNotifications.some((entry) => entry.title === 'Due soon')).toBe(true);
    expect(memberBNotifications.some((entry) => entry.title === 'Task overdue')).toBe(true);
  });

  it('triggers SLA escalation and forecast approval notifications for admins', () => {
    const now = Date.now();
    vi.spyOn(estimationService, 'getAdjustmentPreview').mockReturnValue({
      adjustedMinutes: 400,
      factor: 1.4,
      profileVersion: 1,
      confidence: 0.8,
      signalStrength: 0.7,
      requiresApproval: true
    });

    processSlaNotifications({
      user: memberA,
      allUsers: [admin, memberA, memberB],
      tasks: [
        buildTask({
          dueDate: now - 30 * 60 * 60 * 1000,
          estimateMinutes: 120,
          estimateProvidedBy: memberA.id
        })
      ],
      enableEstimateCalibration: true,
      now
    });

    const adminNotifications = notificationService.getNotifications(ORG_ID, admin.id);
    expect(adminNotifications.some((entry) => entry.title === 'SLA escalation')).toBe(true);
    expect(adminNotifications.some((entry) => entry.title === 'Forecast approval needed')).toBe(true);
  });
});
