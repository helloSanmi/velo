import { OrgInvite, User } from '../../types';
import { realtimeService } from '../realtimeService';
import { createId } from '../../utils/id';
import { apiRequest, clearAuthTokens } from '../apiClient';
import { isFreePlan, normalizeWorkspacePlan } from '../planFeatureService';
import { INVITES_KEY, SESSION_KEY } from './constants';
import {
  clearOrganizationStorage,
  clearSessionForOrganization,
  emitUsersUpdated,
  inferOrgEmailDomain
} from './helpers';
import {
  getInvitesLocal,
  getOrganizationLocal,
  registerLocalOrganization,
  resolvePlanSeats
} from './localOrgInvite';
import { getUsersLocal, saveUsersLocal, setCurrentUserLocal } from './localUsers';

export const registerLocal = (
  identifier: string,
  orgName?: string,
  options?: { plan?: 'free' | 'basic' | 'pro'; totalSeats?: number }
): User => {
  const allUsers = getUsersLocal();
  const cleanId = identifier.toLowerCase().trim();
  const existing = allUsers.find(
    (user) => user.username === cleanId || user.email === cleanId
  );
  if (existing) {
    setCurrentUserLocal(existing);
    return existing;
  }
  const newOrgId = createId();
  const newUserId = createId();
  const plan = normalizeWorkspacePlan(options?.plan || 'basic');
  const totalSeats = resolvePlanSeats(plan, options?.totalSeats);
  registerLocalOrganization(
    newOrgId,
    newUserId,
    orgName || `${cleanId}'s Cluster`,
    plan,
    totalSeats
  );
  const newUser: User = {
    id: newUserId,
    orgId: newOrgId,
    username: cleanId,
    displayName: cleanId.charAt(0).toUpperCase() + cleanId.slice(1),
    email: cleanId.includes('@') ? cleanId : `${cleanId}@velo.ai`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
    role: 'admin'
  };
  saveUsersLocal([...allUsers, newUser]);
  setCurrentUserLocal(newUser);
  emitUsersUpdated(newOrgId, newUser.id, newUser.id);
  return newUser;
};

export const loginLocal = (identifier: string): User | null => {
  const users = getUsersLocal();
  const normalized = identifier.toLowerCase();
  const user = users.find(
    (entry) => entry.username.toLowerCase() === normalized || entry.email.toLowerCase() === normalized
  );
  if (!user) return null;
  setCurrentUserLocal(user);
  return user;
};

export const acceptInviteLocal = (
  token: string,
  identifier: string
): { success: boolean; error?: string; user?: User } => {
  const cleanToken = token.trim();
  const cleanId = identifier.toLowerCase().trim();
  if (!cleanToken) return { success: false, error: 'Invite token is required.' };
  if (!cleanId) return { success: false, error: 'Username or email is required.' };

  const invites = getInvitesLocal();
  const inviteIndex = invites.findIndex((item) => item.token === cleanToken);
  if (inviteIndex < 0) return { success: false, error: 'Invite token not found.' };
  const invite: OrgInvite = invites[inviteIndex];
  if (invite.revoked) return { success: false, error: 'This invite has been revoked.' };
  if (invite.expiresAt < Date.now()) return { success: false, error: 'This invite has expired.' };
  if ((invite.maxUses || 1) <= invite.usedCount) {
    return { success: false, error: 'This invite has reached its usage limit.' };
  }
  if (invite.invitedIdentifier && invite.invitedIdentifier.toLowerCase() !== cleanId) {
    return { success: false, error: 'This invite is restricted to a different identifier.' };
  }

  const org = getOrganizationLocal(invite.orgId);
  if (!org) return { success: false, error: 'Organization no longer exists.' };
  const orgUsers = getUsersLocal(org.id);
  const activeLicenses = orgUsers.filter((member) => member.licenseActive !== false).length;
  if (isFreePlan(org.plan) && activeLicenses >= org.totalSeats) {
    return {
      success: false,
      error: `No available licenses in ${org.name}. Ask admin to buy more seats.`
    };
  }

  const allUsers = getUsersLocal();
  const exists = allUsers.find(
    (user) => user.username.toLowerCase() === cleanId || user.email?.toLowerCase() === cleanId
  );
  if (exists) {
    return { success: false, error: 'This identifier is already in use.' };
  }

  const newUser: User = {
    id: createId(),
    orgId: org.id,
    username: cleanId.includes('@') ? cleanId.split('@')[0] : cleanId,
    displayName: cleanId.includes('@')
      ? cleanId.split('@')[0].replace(/\b\w/g, (char) => char.toUpperCase())
      : cleanId.charAt(0).toUpperCase() + cleanId.slice(1),
    email: cleanId.includes('@') ? cleanId : `${cleanId}@${inferOrgEmailDomain(org.id)}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
    role: invite.role,
    licenseActive: true
  };

  saveUsersLocal([...allUsers, newUser]);
  const updatedInvites = [...invites];
  updatedInvites[inviteIndex] = { ...invite, usedCount: invite.usedCount + 1 };
  localStorage.setItem(INVITES_KEY, JSON.stringify(updatedInvites));
  setCurrentUserLocal(newUser);
  emitUsersUpdated(org.id, newUser.id, newUser.id);
  return { success: true, user: newUser };
};

export const logoutLocal = () => {
  const current = getCurrentUserLocal();
  if (current) {
    apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
  }
  localStorage.removeItem(SESSION_KEY);
  clearAuthTokens();
};

const getCurrentUserLocal = (): User | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

export const deleteOrganizationLocal = (
  actorId: string,
  orgId: string
): { success: boolean; error?: string } => {
  const actor = getUsersLocal(orgId).find((candidate) => candidate.id === actorId);
  if (!actor) return { success: false, error: 'Actor not found in organization.' };
  if (actor.role !== 'admin') return { success: false, error: 'Only admins can delete organization.' };

  const allUsers = getUsersLocal();
  const orgUserIds = new Set(allUsers.filter((item) => item.orgId === orgId).map((item) => item.id));
  clearOrganizationStorage(orgId, orgUserIds);
  clearSessionForOrganization(orgId);

  emitUsersUpdated(orgId, actorId);
  realtimeService.publish({ type: 'PROJECTS_UPDATED', orgId, actorId });
  realtimeService.publish({ type: 'TASKS_UPDATED', orgId, actorId });
  realtimeService.publish({ type: 'GROUPS_UPDATED', orgId, actorId });
  realtimeService.publish({ type: 'TEAMS_UPDATED', orgId, actorId });

  return { success: true };
};
