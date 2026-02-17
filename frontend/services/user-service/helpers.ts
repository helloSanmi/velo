import { OrgInvite, Organization, User } from '../../types';
import { realtimeService } from '../realtimeService';
import {
  ESTIMATION_PROFILES_KEY,
  GROUPS_KEY,
  INVITES_KEY,
  NOTIFICATIONS_KEY,
  ORGS_KEY,
  PRESENCE_KEY_PREFIX,
  PROJECTS_KEY,
  PROJECT_CHAT_KEY,
  SAVED_VIEWS_KEY,
  SESSION_KEY,
  TEAMS_KEY,
  USERS_KEY,
  WORKFLOWS_KEY
} from './constants';
import { TASKS_STORAGE_KEY } from '../task-service/storage';

export const extractEmailDomain = (email?: string): string | null => {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1]?.trim().toLowerCase();
  return domain || null;
};

export const inferOrgEmailDomain = (orgId: string): string => {
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const domains = users
    .filter((user) => user.orgId === orgId)
    .map((user) => extractEmailDomain(user.email))
    .filter((domain): domain is string => Boolean(domain));
  if (domains.length === 0) return 'velo.ai';
  const counts = new Map<string, number>();
  domains.forEach((domain) => counts.set(domain, (counts.get(domain) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
};

export const emitUsersUpdated = (orgId?: string, actorId?: string, userId?: string) => {
  realtimeService.publish({
    type: 'USERS_UPDATED',
    orgId,
    actorId,
    payload: userId ? { userId } : undefined
  });
};

const safeRead = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const writeArray = <T>(key: string, items: T[]) => {
  localStorage.setItem(key, JSON.stringify(items));
};

export const clearOrganizationStorage = (orgId: string, orgUserIds: Set<string>) => {
  writeArray(
    ORGS_KEY,
    safeRead<Organization>(ORGS_KEY).filter((org) => org.id !== orgId)
  );
  writeArray(
    USERS_KEY,
    safeRead<User>(USERS_KEY).filter((member) => member.orgId !== orgId)
  );
  writeArray(
    INVITES_KEY,
    safeRead<OrgInvite>(INVITES_KEY).filter((invite) => invite.orgId !== orgId)
  );
  writeArray(
    PROJECTS_KEY,
    safeRead<{ orgId?: string }>(PROJECTS_KEY).filter((project) => project.orgId !== orgId)
  );
  writeArray(
    TASKS_STORAGE_KEY,
    safeRead<{ orgId?: string }>(TASKS_STORAGE_KEY).filter((task) => task.orgId !== orgId)
  );
  writeArray(
    GROUPS_KEY,
    safeRead<{ orgId?: string }>(GROUPS_KEY).filter((group) => group.orgId !== orgId)
  );
  writeArray(
    TEAMS_KEY,
    safeRead<{ orgId?: string }>(TEAMS_KEY).filter((team) => team.orgId !== orgId)
  );
  writeArray(
    WORKFLOWS_KEY,
    safeRead<{ orgId?: string }>(WORKFLOWS_KEY).filter((workflow) => workflow.orgId !== orgId)
  );
  writeArray(
    PROJECT_CHAT_KEY,
    safeRead<{ orgId?: string }>(PROJECT_CHAT_KEY).filter((message) => message.orgId !== orgId)
  );
  writeArray(
    SAVED_VIEWS_KEY,
    safeRead<{ orgId?: string }>(SAVED_VIEWS_KEY).filter((view) => view.orgId !== orgId)
  );
  writeArray(
    ESTIMATION_PROFILES_KEY,
    safeRead<{ orgId?: string }>(ESTIMATION_PROFILES_KEY).filter((profile) => profile.orgId !== orgId)
  );
  writeArray(
    NOTIFICATIONS_KEY,
    safeRead<{ userId?: string }>(NOTIFICATIONS_KEY).filter((notification) => !orgUserIds.has(notification.userId || ''))
  );

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(PRESENCE_KEY_PREFIX)) {
      const maybeOrgId = key.slice(PRESENCE_KEY_PREFIX.length);
      if (maybeOrgId === orgId) localStorage.removeItem(key);
    }
  });
};

export const clearSessionForOrganization = (orgId: string) => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const current = JSON.parse(raw) as User;
    if (current?.orgId === orgId) localStorage.removeItem(SESSION_KEY);
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
};

