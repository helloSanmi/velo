import { beforeEach, describe, expect, it } from 'vitest';
import { Project, User } from '../../types';
import { notificationService } from '../notificationService';
import { notifyProjectLifecycle } from '../projectNotificationService';

const ORG_ID = 'org-1';
const USERS_KEY = 'velo_users';
const SESSION_KEY = 'velo_session';
const SETTINGS_KEY = `velo_settings:${ORG_ID}:u1`;

const actor: User = { id: 'u1', orgId: ORG_ID, username: 'admin', displayName: 'Admin', role: 'admin' };
const memberA: User = { id: 'u2', orgId: ORG_ID, username: 'alex', displayName: 'Alex', role: 'member' };
const memberB: User = { id: 'u3', orgId: ORG_ID, username: 'sarah', displayName: 'Sarah', role: 'member' };

const project: Project = {
  id: 'p1',
  orgId: ORG_ID,
  name: 'Roadmap',
  description: 'Desc',
  color: 'bg-indigo-600',
  members: [actor.id, memberA.id, memberB.id],
  createdBy: actor.id
};

describe('project lifecycle notifications', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(USERS_KEY, JSON.stringify([actor, memberA, memberB]));
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: actor.id, orgId: ORG_ID }));
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        enableNotifications: true,
        notificationDigestMode: 'instant',
        notificationInAppAssigned: true,
        notificationInAppCompleted: true,
        notificationInAppComments: true,
        notificationSound: false
      })
    );
  });

  it('sends lifecycle notifications to project members excluding actor', () => {
    const events = ['renamed', 'archived', 'completed', 'reopened', 'restored', 'deleted', 'purged'] as const;
    events.forEach((event) => notifyProjectLifecycle(actor, project, event));

    const actorNotifications = notificationService.getNotifications(ORG_ID, actor.id);
    const memberNotifications = notificationService.getNotifications(ORG_ID, memberA.id);

    expect(actorNotifications.length).toBe(0);
    expect(memberNotifications.length).toBe(events.length);
    expect(memberNotifications.some((entry) => entry.title === 'Project completed')).toBe(true);
    expect(memberNotifications.some((entry) => entry.title === 'Project deleted')).toBe(true);
  });
});
