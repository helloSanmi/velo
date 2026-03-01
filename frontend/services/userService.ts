
import { OrgInvite, User, Organization } from '../types';
import { realtimeService } from './realtimeService';
import { createId } from '../utils/id';
import { apiRequest, clearAuthTokens } from './apiClient';
import { backendSyncService } from './backendSyncService';
import { isFreePlan, normalizeWorkspacePlan } from './planFeatureService';
import {
  acceptInviteWithPasswordRemote,
  addSeatsRemote,
  beginIntegrationConnectPopupRemote,
  beginOauthConnectPopupRemote,
  beginOauthPopupRemote,
  changePasswordRemote,
  createInviteRemote,
  deleteOrganizationRemote,
  deleteUserRemote,
  fetchInvitesFromBackendRemote,
  getDirectoryUsersRemote,
  getIntegrationConnectUrlRemote,
  getOauthProviderAvailabilityRemote,
  getOauthConnectUrlRemote,
  listIntegrationConnectionsRemote,
  importDirectoryUsersRemote,
  loginWithPasswordRemote,
  provisionUserRemote,
  previewInviteRemote,
  registerWithPasswordRemote,
  resetPasswordRemote,
  resendInviteRemote,
  revokeInviteRemote,
  updateUserRemote,
  updateOrganizationSettingsRemote,
} from './user-service/remote';
import {
  INVITES_KEY,
  ORGS_KEY,
  PLAN_DEFAULT_SEATS,
  PLAN_SEAT_PRICE,
  SESSION_KEY,
  USERS_KEY
} from './user-service/constants';
import { clearOrganizationStorage, clearSessionForOrganization, emitUsersUpdated, inferOrgEmailDomain } from './user-service/helpers';

const PROJECTS_KEY = 'velo_projects';

export const userService = {
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },

  getOrganization: (orgId: string): Organization | null => {
    const orgs: Organization[] = JSON.parse(localStorage.getItem(ORGS_KEY) || '[]');
    return orgs.find(o => o.id === orgId) || null;
  },

  getOrganizations: (): Organization[] => {
    return JSON.parse(localStorage.getItem(ORGS_KEY) || '[]');
  },

  updateOrganization: (orgId: string, updates: Partial<Organization>): Organization | null => {
    const orgs: Organization[] = JSON.parse(localStorage.getItem(ORGS_KEY) || '[]');
    let updatedOrg: Organization | null = null;
    const newOrgs = orgs.map(o => {
      if (o.id === orgId) {
        updatedOrg = { ...o, ...updates };
        return updatedOrg;
      }
      return o;
    });
    localStorage.setItem(ORGS_KEY, JSON.stringify(newOrgs));
    emitUsersUpdated(orgId);
    return updatedOrg;
  },

  addSeats: (orgId: string, seatsToAdd: number): Organization | null => {
    if (!Number.isFinite(seatsToAdd) || seatsToAdd <= 0) return userService.getOrganization(orgId);
    const org = userService.getOrganization(orgId);
    if (!org) return null;
    return userService.updateOrganization(orgId, { totalSeats: Math.max(org.totalSeats, org.totalSeats + Math.round(seatsToAdd)) });
  },

  getInvites: (orgId?: string): OrgInvite[] => {
    const invites: OrgInvite[] = JSON.parse(localStorage.getItem(INVITES_KEY) || '[]');
    if (orgId) return invites.filter((invite) => invite.orgId === orgId);
    return invites;
  },

  createInvite: (
    orgId: string,
    createdBy: string,
    options?: { role?: 'member' | 'admin'; invitedIdentifier?: string; ttlDays?: number; maxUses?: number }
  ): { success: boolean; invite?: OrgInvite; error?: string } => {
    const org = userService.getOrganization(orgId);
    if (!org) return { success: false, error: 'Organization not found.' };
    const token = `velo_${createId().slice(0, 10)}`;
    const invite: OrgInvite = {
      id: createId(),
      orgId,
      token,
      role: options?.role || 'member',
      createdBy,
      createdAt: Date.now(),
      expiresAt: Date.now() + Math.max(1, options?.ttlDays || 14) * 24 * 60 * 60 * 1000,
      maxUses: options?.maxUses || 1,
      usedCount: 0,
      invitedIdentifier: options?.invitedIdentifier?.trim() || undefined
    };
    const invites = userService.getInvites();
    localStorage.setItem(INVITES_KEY, JSON.stringify([invite, ...invites]));
    emitUsersUpdated(orgId, createdBy);
    return { success: true, invite };
  },

  revokeInvite: (inviteId: string, actorId: string): { success: boolean; error?: string } => {
    const invites = userService.getInvites();
    const target = invites.find((invite) => invite.id === inviteId);
    if (!target) return { success: false, error: 'Invite not found.' };
    const updated = invites.map((invite) => invite.id === inviteId ? { ...invite, revoked: true } : invite);
    localStorage.setItem(INVITES_KEY, JSON.stringify(updated));
    emitUsersUpdated(target.orgId, actorId);
    return { success: true };
  },

  getUsers: (orgId?: string): User[] => {
    const allUsers: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (orgId) return allUsers.filter(u => u.orgId === orgId);
    return allUsers;
  },

  updateUser: (userId: string, updates: Partial<User>): User[] => {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const updatedUsers = users.map((u: User) => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    const current = userService.getCurrentUser();
    if (current && current.id === userId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...updates }));
    }
    emitUsersUpdated(updatedUsers.find((u) => u.id === userId)?.orgId, userId, userId);
    return updatedUsers;
  },

  deleteUser: (userId: string): User[] => {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const updated = users.filter(u => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    emitUsersUpdated(users.find((u) => u.id === userId)?.orgId, userId, userId);
    return updated;
  },

  provisionUser: (
    orgId: string,
    username: string,
    role: 'admin' | 'member' = 'member',
    profile?: { firstName?: string; lastName?: string; email?: string }
  ): { success: boolean; error?: string; user?: User } => {
    const org = userService.getOrganization(orgId);
    const orgUsers = userService.getUsers(orgId);
    if (!org) return { success: false, error: 'Organization identifier mismatch.' };
    const activeLicenses = orgUsers.filter((member) => member.licenseActive !== false).length;
    if (isFreePlan(org.plan) && activeLicenses >= org.totalSeats) {
      return { success: false, error: `License threshold reached (${org.totalSeats} nodes).` };
    }
    const allUsers = userService.getUsers();
    const normalizedInput = username.toLowerCase().trim();
    const hasEmailInput = normalizedInput.includes('@');
    const cleanUsername = hasEmailInput ? normalizedInput.split('@')[0] : normalizedInput;
    const orgDomain = inferOrgEmailDomain(orgId);
    const explicitEmail = profile?.email?.trim().toLowerCase();
    const resolvedEmail = explicitEmail || (hasEmailInput ? normalizedInput : `${cleanUsername}@${orgDomain}`);
    const firstName = profile?.firstName?.trim() || '';
    const lastName = profile?.lastName?.trim() || '';
    const displayName = `${firstName} ${lastName}`.trim() || username.charAt(0).toUpperCase() + username.slice(1);
    if (!cleanUsername) {
      return { success: false, error: 'Username is required.' };
    }
    if (!resolvedEmail) {
      return { success: false, error: 'Email is required.' };
    }
    if (allUsers.find(u => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'Identity already exists in cluster.' };
    }
    if (allUsers.find(u => (u.email || '').toLowerCase() === resolvedEmail)) {
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
  },

  register: (
    identifier: string,
    orgName?: string,
    options?: { plan?: 'free' | 'basic' | 'pro'; totalSeats?: number }
  ): User => {
    const allUsers = userService.getUsers();
    const cleanId = identifier.toLowerCase().trim();
    const existing = allUsers.find((u: User) => u.username === cleanId || u.email === cleanId);
    if (existing) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(existing));
      return existing;
    }
    const orgs: Organization[] = JSON.parse(localStorage.getItem(ORGS_KEY) || '[]');
    const newOrgId = createId();
    const newUserId = createId();
    const plan = normalizeWorkspacePlan(options?.plan || 'basic');
    const selectedSeats = Number.isFinite(options?.totalSeats as number) ? Number(options?.totalSeats) : PLAN_DEFAULT_SEATS[plan];
    const totalSeats = plan === 'free' ? Math.max(1, Math.min(3, Math.round(selectedSeats))) : PLAN_DEFAULT_SEATS[plan];
    const newOrg: Organization = {
      id: newOrgId,
      name: orgName || `${cleanId}'s Cluster`,
      totalSeats,
      ownerId: newUserId,
      createdAt: Date.now(),
      plan,
      seatPrice: PLAN_SEAT_PRICE[plan],
      billingCurrency: 'USD'
    };
    orgs.push(newOrg);
    localStorage.setItem(ORGS_KEY, JSON.stringify(orgs));
    const newUser: User = { 
      id: newUserId, 
      orgId: newOrgId, 
      username: cleanId,
      displayName: cleanId.charAt(0).toUpperCase() + cleanId.slice(1),
      email: cleanId.includes('@') ? cleanId : `${cleanId}@velo.ai`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
      role: 'admin'
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([...allUsers, newUser]));
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    emitUsersUpdated(newOrgId, newUser.id, newUser.id);
    return newUser;
  },

  loginWithPassword: async (identifier: string, password: string, workspaceDomain?: string): Promise<{ user?: User; error?: string; code?: string }> =>
    loginWithPasswordRemote(identifier, password, workspaceDomain, (nextUser) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    }),

  getOauthProviderAvailability: async (
    workspaceDomain: string
  ): Promise<{ microsoftEnabled: boolean; workspaceDomain?: string; orgName?: string; error?: string }> =>
    getOauthProviderAvailabilityRemote(workspaceDomain),

  loginWithProvider: async (
    provider: 'microsoft',
    workspaceDomain?: string
  ): Promise<{ user?: User; error?: string; code?: string }> =>
    beginOauthPopupRemote(provider, workspaceDomain, (nextUser) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    }),

  connectWorkspaceProvider: async (
    provider: 'microsoft',
    workspaceDomain: string
  ): Promise<{
    success: boolean;
    microsoftConnected?: boolean;
    microsoftAllowed?: boolean;
    error?: string;
  }> => {
    const start = await getOauthConnectUrlRemote(provider, workspaceDomain);
    if (!start.url) return { success: false, error: start.error || 'Could not start provider connection.' };
    return beginOauthConnectPopupRemote(start.url, provider, workspaceDomain);
  },

  listIntegrationConnections: async (): Promise<{
    success: boolean;
    slackConnected: boolean;
    githubConnected: boolean;
    slackLabel?: string;
    githubLabel?: string;
    error?: string;
  }> => listIntegrationConnectionsRemote(),

  connectIntegrationProvider: async (
    provider: 'slack' | 'github'
  ): Promise<{ success: boolean; provider?: 'slack' | 'github'; error?: string }> => {
    const start = await getIntegrationConnectUrlRemote(provider);
    if (!start.url) return { success: false, error: start.error || 'Could not start integration connection.' };
    return beginIntegrationConnectPopupRemote(start.url, provider);
  },

  startDirectoryImport: async (
    provider: 'microsoft'
  ): Promise<{
    success: boolean;
    provider?: 'microsoft';
    users?: Array<{ externalId: string; email: string; displayName: string; firstName?: string; lastName?: string }>;
    error?: string;
    code?: string;
  }> => {
    const direct = await getDirectoryUsersRemote(provider);
    if (direct.success) return direct;
    if (direct.code === 'SSO_RECONNECT_REQUIRED') {
      return {
        success: false,
        code: direct.code,
        error: 'Microsoft directory access needs reconnect. Use Integrations > Workspace SSO and click Connect once.'
      };
    }
    return { success: false, code: direct.code, error: direct.error || 'Could not load directory users.' };
  },

  importDirectoryUsers: async (
    orgId: string,
    provider: 'microsoft',
    users: Array<{ email: string; displayName: string; firstName?: string; lastName?: string }>
  ): Promise<{
    success: boolean;
    created?: Array<{ id: string; email: string; displayName: string }>;
    skipped?: Array<{ email: string; reason: string }>;
    seats?: { used: number; total: number; limited: boolean };
    error?: string;
  }> => importDirectoryUsersRemote(orgId, provider, users),

  registerWithPassword: async (
    identifier: string,
    password: string,
    orgName: string,
    options?: { plan?: 'free' | 'basic' | 'pro'; totalSeats?: number }
  ): Promise<{ success: boolean; user?: User; error?: string }> =>
    registerWithPasswordRemote(identifier, password, orgName, options, (nextUser) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    }),

  acceptInviteWithPassword: async (token: string, identifier: string | undefined, password: string): Promise<{ success: boolean; error?: string; user?: User }> =>
    acceptInviteWithPasswordRemote(token, identifier, password, (nextUser) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    }),
  previewInvite: async (token: string): Promise<{
    success: boolean;
    data?: {
      token: string;
      role: 'member' | 'admin';
      invitedIdentifier: string | null;
      expiresAt: string;
      org: { id: string; name: string; loginSubdomain: string };
    };
    error?: string;
  }> => previewInviteRemote(token),

  changePassword: async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> =>
    changePasswordRemote(currentPassword, newPassword, confirmPassword),

  resetPassword: async (
    identifier: string,
    workspaceDomain: string | undefined,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> =>
    resetPasswordRemote(identifier, workspaceDomain, newPassword, confirmPassword),

  fetchInvitesFromBackend: async (orgId: string): Promise<OrgInvite[]> =>
    fetchInvitesFromBackendRemote(orgId, userService.getInvites),

  createInviteRemote: async (
    orgId: string,
    options?: { role?: 'member' | 'admin'; invitedIdentifier?: string; ttlDays?: number; maxUses?: number }
  ): Promise<{ success: boolean; invite?: OrgInvite; error?: string }> => createInviteRemote(orgId, options),

  revokeInviteRemote: async (orgId: string, inviteId: string): Promise<{ success: boolean; error?: string }> =>
    revokeInviteRemote(orgId, inviteId),

  resendInviteRemote: async (
    orgId: string,
    inviteId: string
  ): Promise<{ success: boolean; invite?: OrgInvite; error?: string }> =>
    resendInviteRemote(orgId, inviteId),

  addSeatsRemote: async (orgId: string, seatsToAdd: number): Promise<Organization | null> =>
    addSeatsRemote(orgId, seatsToAdd),

  updateOrganizationSettingsRemote: async (
    orgId: string,
    patch: Partial<Pick<Organization, 'loginSubdomain' | 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected' | 'notificationSenderEmail'>>
  ): Promise<Organization | null> => updateOrganizationSettingsRemote(orgId, patch),

  provisionUserRemote: async (
    orgId: string,
    username: string,
    role: 'admin' | 'member' = 'member',
    profile?: { firstName?: string; lastName?: string; email?: string },
    password = 'Password',
    mustChangePassword = true
  ): Promise<{ success: boolean; error?: string; user?: User }> =>
    provisionUserRemote(orgId, username, role, profile, password, mustChangePassword),

  updateUserRemote: async (orgId: string, userId: string, updates: Partial<User>): Promise<User[] | null> =>
    updateUserRemote(orgId, userId, updates, userService.hydrateWorkspaceFromBackend, userService.getUsers),

  updateUserLicenseRemote: async (
    orgId: string,
    userId: string,
    licenseActive: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiRequest(`/orgs/${orgId}/users/${userId}/license`, {
        method: 'PATCH',
        body: { licenseActive }
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Could not update license.' };
    }
  },

  deleteUserRemote: async (orgId: string, userId: string): Promise<User[] | null> =>
    deleteUserRemote(orgId, userId, userService.hydrateWorkspaceFromBackend, userService.getUsers),

  deleteOrganizationRemote: async (orgId: string): Promise<{ success: boolean; error?: string }> =>
    deleteOrganizationRemote(orgId),

  hydrateWorkspaceFromBackend: async (orgId: string): Promise<{ users: User[]; projects: any[] } | null> => {
    try {
      const localProjectsSnapshot = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') as Array<any>;
      const localProjectsById = new Map(
        localProjectsSnapshot
          .filter((project) => project?.orgId === orgId && project?.id)
          .map((project) => [project.id, project])
      );
      const result = await backendSyncService.hydrateWorkspace(orgId);
      const mergedProjects = result.projects.map((project) => {
        const localProject = localProjectsById.get(project.id);
        if (!localProject) return project;
        const remoteHasPendingApproval = Boolean(project.completionRequestedAt && project.completionRequestedById);
        const localHasPendingApproval = Boolean(localProject.completionRequestedAt && localProject.completionRequestedById);
        const localUpdatedAt = typeof localProject.updatedAt === 'number' ? localProject.updatedAt : 0;
        const remoteUpdatedAt = typeof project.updatedAt === 'number' ? project.updatedAt : 0;
        if (project.isArchived || project.isCompleted || project.isDeleted) return project;
        if (localUpdatedAt < remoteUpdatedAt) return project;

        if (localHasPendingApproval && !remoteHasPendingApproval) {
          return {
            ...project,
            completionRequestedAt: localProject.completionRequestedAt,
            completionRequestedById: localProject.completionRequestedById,
            completionRequestedByName: localProject.completionRequestedByName,
            completionRequestedComment: localProject.completionRequestedComment,
            updatedAt: localUpdatedAt || project.updatedAt
          };
        }

        if (!localHasPendingApproval && remoteHasPendingApproval) {
          return {
            ...project,
            completionRequestedAt: undefined,
            completionRequestedById: undefined,
            completionRequestedByName: undefined,
            completionRequestedComment: undefined,
            updatedAt: localUpdatedAt || project.updatedAt
          };
        }

        return project;
      });
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(mergedProjects));
      return { users: result.users, projects: mergedProjects };
    } catch (error) {
      return null;
    }
  },

  login: (identifier: string): User | null => {
    const users = userService.getUsers();
    const user = users.find((u: User) => u.username.toLowerCase() === identifier.toLowerCase() || u.email.toLowerCase() === identifier.toLowerCase());
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },

  acceptInvite: (token: string, identifier: string): { success: boolean; error?: string; user?: User } => {
    const cleanToken = token.trim();
    const cleanId = identifier.toLowerCase().trim();
    if (!cleanToken) return { success: false, error: 'Invite token is required.' };
    if (!cleanId) return { success: false, error: 'Username or email is required.' };

    const invites = userService.getInvites();
    const inviteIndex = invites.findIndex((item) => item.token === cleanToken);
    if (inviteIndex < 0) return { success: false, error: 'Invite token not found.' };
    const invite = invites[inviteIndex];
    if (invite.revoked) return { success: false, error: 'This invite has been revoked.' };
    if (invite.expiresAt < Date.now()) return { success: false, error: 'This invite has expired.' };
    if ((invite.maxUses || 1) <= invite.usedCount) return { success: false, error: 'This invite has reached its usage limit.' };
    if (invite.invitedIdentifier && invite.invitedIdentifier.toLowerCase() !== cleanId) {
      return { success: false, error: 'This invite is restricted to a different identifier.' };
    }

    const org = userService.getOrganization(invite.orgId);
    if (!org) return { success: false, error: 'Organization no longer exists.' };
    const orgUsers = userService.getUsers(org.id);
    const activeLicenses = orgUsers.filter((member) => member.licenseActive !== false).length;
    if (isFreePlan(org.plan) && activeLicenses >= org.totalSeats) {
      return { success: false, error: `No available licenses in ${org.name}. Ask admin to buy more seats.` };
    }

    const allUsers = userService.getUsers();
    const exists = allUsers.find((user) => user.username.toLowerCase() === cleanId || user.email?.toLowerCase() === cleanId);
    if (exists) {
      return { success: false, error: 'This identifier is already in use.' };
    }

    const newUser: User = {
      id: createId(),
      orgId: org.id,
      username: cleanId.includes('@') ? cleanId.split('@')[0] : cleanId,
      displayName: cleanId.includes('@') ? cleanId.split('@')[0].replace(/\b\w/g, (c) => c.toUpperCase()) : cleanId.charAt(0).toUpperCase() + cleanId.slice(1),
      email: cleanId.includes('@') ? cleanId : `${cleanId}@${inferOrgEmailDomain(org.id)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
      role: invite.role,
      licenseActive: true
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([...allUsers, newUser]));
    const updatedInvites = [...invites];
    updatedInvites[inviteIndex] = { ...invite, usedCount: invite.usedCount + 1 };
    localStorage.setItem(INVITES_KEY, JSON.stringify(updatedInvites));
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    emitUsersUpdated(org.id, newUser.id, newUser.id);
    return { success: true, user: newUser };
  },

  logout: () => {
    const current = userService.getCurrentUser();
    if (current) {
      apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
    }
    localStorage.removeItem(SESSION_KEY);
    clearAuthTokens();
  },

  deleteOrganization: (
    actorId: string,
    orgId: string
  ): { success: boolean; error?: string } => {
    const actor = userService.getUsers(orgId).find((candidate) => candidate.id === actorId);
    if (!actor) return { success: false, error: 'Actor not found in organization.' };
    if (actor.role !== 'admin') return { success: false, error: 'Only admins can delete organization.' };

    const allUsers = userService.getUsers();
    const orgUserIds = new Set(allUsers.filter((item) => item.orgId === orgId).map((item) => item.id));

    clearOrganizationStorage(orgId, orgUserIds);
    clearSessionForOrganization(orgId);

    emitUsersUpdated(orgId, actorId);
    realtimeService.publish({ type: 'PROJECTS_UPDATED', orgId, actorId });
    realtimeService.publish({ type: 'TASKS_UPDATED', orgId, actorId });
    realtimeService.publish({ type: 'GROUPS_UPDATED', orgId, actorId });
    realtimeService.publish({ type: 'TEAMS_UPDATED', orgId, actorId });

    return { success: true };
  },

  getPlanDefaults: () => ({
    seatDefaults: PLAN_DEFAULT_SEATS,
    seatPrices: PLAN_SEAT_PRICE
  })
};
