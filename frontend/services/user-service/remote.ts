import { Organization, OrgInvite, User } from '../../types';
import { apiRequest, setAuthTokens } from '../apiClient';
import { backendSyncService } from '../backendSyncService';

const mapInviteFromApi = (invite: any): OrgInvite => ({
  id: invite.id,
  orgId: invite.orgId,
  token: invite.token,
  role: invite.role,
  createdBy: invite.createdBy,
  createdAt: new Date(invite.createdAt).getTime(),
  expiresAt: new Date(invite.expiresAt).getTime(),
  maxUses: invite.maxUses,
  usedCount: invite.usedCount,
  revoked: invite.revoked,
  invitedIdentifier: invite.invitedIdentifier || undefined
});

const mapOrganizationFromApi = (org: any): Organization => ({
  id: org.id,
  name: org.name,
  totalSeats: org.totalSeats,
  ownerId: org.ownerId,
  createdAt: new Date(org.createdAt).getTime(),
  plan: org.plan,
  seatPrice: org.seatPrice,
  billingCurrency: org.billingCurrency,
  aiDailyRequestLimit: typeof org.aiDailyRequestLimit === 'number' ? org.aiDailyRequestLimit : undefined,
  aiDailyTokenLimit: typeof org.aiDailyTokenLimit === 'number' ? org.aiDailyTokenLimit : undefined
});

const mapUserFromApi = (user: any): User => ({
  id: user.id,
  orgId: user.orgId,
  username: user.username,
  displayName: user.displayName,
  firstName: user.firstName || undefined,
  lastName: user.lastName || undefined,
  email: user.email || undefined,
  avatar: user.avatar || undefined,
  role: user.role
});

export const loginWithPasswordRemote = async (
  identifier: string,
  password: string,
  saveSession: (user: User) => void
): Promise<User | null> => {
  try {
    const response = await apiRequest<{
      tokens: { accessToken: string; refreshToken: string };
      user: User;
    }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { identifier, password }
    });
    setAuthTokens(response.tokens);
    saveSession(response.user);
    return response.user;
  } catch {
    return null;
  }
};

export const registerWithPasswordRemote = async (
  identifier: string,
  password: string,
  orgName: string,
  options: { plan?: 'free' | 'basic' | 'pro'; totalSeats?: number } | undefined,
  saveSession: (user: User) => void
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await apiRequest<{
      tokens: { accessToken: string; refreshToken: string };
      user: User;
    }>('/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        identifier,
        password,
        orgName,
        plan: options?.plan || 'basic',
        totalSeats: options?.totalSeats
      }
    });
    setAuthTokens(response.tokens);
    saveSession(response.user);
    return { success: true, user: response.user };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not create workspace account.' };
  }
};

export const acceptInviteWithPasswordRemote = async (
  token: string,
  identifier: string,
  password: string,
  saveSession: (user: User) => void
): Promise<{ success: boolean; error?: string; user?: User }> => {
  try {
    const response = await apiRequest<{
      tokens: { accessToken: string; refreshToken: string };
      user: User;
    }>('/auth/invites/accept', {
      method: 'POST',
      auth: false,
      body: { token, identifier, password }
    });
    setAuthTokens(response.tokens);
    saveSession(response.user);
    return { success: true, user: response.user };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Unable to join workspace.' };
  }
};

export const changePasswordRemote = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword, confirmPassword }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not change password.' };
  }
};

export const fetchInvitesFromBackendRemote = async (
  orgId: string,
  getLocalInvites: (orgId?: string) => OrgInvite[]
): Promise<OrgInvite[]> => {
  try {
    const rows = await apiRequest<any[]>(`/orgs/${orgId}/invites`);
    return rows.map(mapInviteFromApi);
  } catch {
    return getLocalInvites(orgId);
  }
};

export const createInviteRemote = async (
  orgId: string,
  options?: { role?: 'member' | 'admin'; invitedIdentifier?: string; ttlDays?: number; maxUses?: number }
): Promise<{ success: boolean; invite?: OrgInvite; error?: string }> => {
  try {
    const invite = await apiRequest<any>(`/orgs/${orgId}/invites`, {
      method: 'POST',
      body: {
        role: options?.role || 'member',
        invitedIdentifier: options?.invitedIdentifier,
        ttlDays: options?.ttlDays || 14,
        maxUses: options?.maxUses || 1
      }
    });
    return { success: true, invite: mapInviteFromApi(invite) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not create invite.' };
  }
};

export const revokeInviteRemote = async (orgId: string, inviteId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest(`/orgs/${orgId}/invites/${inviteId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not revoke invite.' };
  }
};

export const addSeatsRemote = async (orgId: string, seatsToAdd: number): Promise<Organization | null> => {
  try {
    const org = await apiRequest<any>(`/orgs/${orgId}/seats/add`, {
      method: 'POST',
      body: { seatsToAdd }
    });
    return mapOrganizationFromApi(org);
  } catch {
    return null;
  }
};

export const provisionUserRemote = async (
  orgId: string,
  username: string,
  role: 'admin' | 'member' = 'member',
  profile?: { firstName?: string; lastName?: string; email?: string },
  password = 'Password'
): Promise<{ success: boolean; error?: string; user?: User }> => {
  try {
    const user = await apiRequest<any>(`/orgs/${orgId}/users`, {
      method: 'POST',
      body: {
        username,
        role,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        email: profile?.email,
        password
      }
    });
    return { success: true, user: mapUserFromApi(user) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not provision user.' };
  }
};

export const updateUserRemote = async (
  orgId: string,
  userId: string,
  updates: Partial<User>,
  hydrateWorkspace: (orgId: string) => Promise<{ users: User[]; projects: any[] } | null>,
  getUsers: (orgId?: string) => User[]
): Promise<User[] | null> => {
  try {
    await apiRequest(`/orgs/${orgId}/users/${userId}`, {
      method: 'PATCH',
      body: {
        firstName: updates.firstName,
        lastName: updates.lastName,
        email: updates.email,
        displayName: updates.displayName,
        avatar: updates.avatar
      }
    });
    const hydrated = await hydrateWorkspace(orgId);
    if (hydrated) return hydrated.users;
    return getUsers(orgId);
  } catch {
    return null;
  }
};

export const deleteUserRemote = async (
  orgId: string,
  userId: string,
  hydrateWorkspace: (orgId: string) => Promise<{ users: User[]; projects: any[] } | null>,
  getUsers: (orgId?: string) => User[]
): Promise<User[] | null> => {
  try {
    await apiRequest(`/orgs/${orgId}/users/${userId}`, { method: 'DELETE' });
    const hydrated = await hydrateWorkspace(orgId);
    if (hydrated) return hydrated.users;
    return getUsers(orgId);
  } catch {
    return null;
  }
};

export const deleteOrganizationRemote = async (orgId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest(`/orgs/${orgId}`, {
      method: 'DELETE',
      body: { confirmation: 'DELETE' }
    });
    backendSyncService.clearAuthSession();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not delete organization.' };
  }
};
