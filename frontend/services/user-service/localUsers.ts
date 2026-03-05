import { User } from '../../types';
import { createId } from '../../utils/id';
import { isFreePlan } from '../planFeatureService';
import { SESSION_KEY, USERS_KEY } from './constants';
import { emitUsersUpdated, inferOrgEmailDomain } from './helpers';
import { getOrganizationLocal } from './localOrgInvite';
import { dedupeUsers } from './userDedupe';

export const getUsersLocal = (orgId?: string): User[] => {
  const allUsers: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  if (orgId) return dedupeUsers(allUsers.filter((user) => user.orgId === orgId));
  return dedupeUsers(allUsers);
};

export const updateUserLocal = (userId: string, updates: Partial<User>): User[] => {
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const updatedUsers = users.map((user) => (user.id === userId ? { ...user, ...updates } : user));
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  const current = getCurrentUserLocal();
  if (current && current.id === userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...updates }));
  }
  emitUsersUpdated(updatedUsers.find((user) => user.id === userId)?.orgId, userId, userId);
  return updatedUsers;
};

export const deleteUserLocal = (userId: string): User[] => {
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const updated = users.filter((user) => user.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(updated));
  emitUsersUpdated(users.find((user) => user.id === userId)?.orgId, userId, userId);
  return updated;
};

export const provisionUserLocal = (
  orgId: string,
  username: string,
  role: 'admin' | 'member' = 'member',
  profile?: { firstName?: string; lastName?: string; email?: string }
): { success: boolean; error?: string; user?: User } => {
  const org = getOrganizationLocal(orgId);
  const orgUsers = getUsersLocal(orgId);
  if (!org) return { success: false, error: 'Organization identifier mismatch.' };
  const activeLicenses = orgUsers.filter((member) => member.licenseActive !== false).length;
  if (isFreePlan(org.plan) && activeLicenses >= org.totalSeats) {
    return { success: false, error: `License threshold reached (${org.totalSeats} nodes).` };
  }
  const allUsers = getUsersLocal();
  const normalizedInput = username.toLowerCase().trim();
  const hasEmailInput = normalizedInput.includes('@');
  const cleanUsername = hasEmailInput ? normalizedInput.split('@')[0] : normalizedInput;
  const orgDomain = inferOrgEmailDomain(orgId);
  const explicitEmail = profile?.email?.trim().toLowerCase();
  const resolvedEmail =
    explicitEmail || (hasEmailInput ? normalizedInput : `${cleanUsername}@${orgDomain}`);
  const firstName = profile?.firstName?.trim() || '';
  const lastName = profile?.lastName?.trim() || '';
  const displayName =
    `${firstName} ${lastName}`.trim() || username.charAt(0).toUpperCase() + username.slice(1);
  if (!cleanUsername) {
    return { success: false, error: 'Username is required.' };
  }
  if (!resolvedEmail) {
    return { success: false, error: 'Email is required.' };
  }
  if (allUsers.find((user) => user.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: 'Identity already exists in cluster.' };
  }
  if (allUsers.find((user) => (user.email || '').toLowerCase() === resolvedEmail)) {
    return { success: false, error: 'Email already exists in cluster.' };
  }
  const newUser: User = {
    id: createId(),
    orgId,
    username: cleanUsername,
    displayName,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: resolvedEmail,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`,
    role,
    licenseActive: true
  };
  localStorage.setItem(USERS_KEY, JSON.stringify([...allUsers, newUser]));
  emitUsersUpdated(orgId, newUser.id, newUser.id);
  return { success: true, user: newUser };
};

export const saveUsersLocal = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getCurrentUserLocal = (): User | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

export const setCurrentUserLocal = (user: User) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};
