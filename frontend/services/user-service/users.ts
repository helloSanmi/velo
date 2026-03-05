import { Organization, User } from '../../types';
import { apiRequest } from '../apiClient';
import { backendSyncService } from '../backendSyncService';
import { mapUserFromApi } from './mappers';

export const provisionUserRemote = async (
  orgId: string,
  username: string,
  role: 'admin' | 'member' = 'member',
  profile?: { firstName?: string; lastName?: string; email?: string },
  password = 'Password',
  mustChangePassword = true
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
        password,
        mustChangePassword
      }
    });
    return { success: true, user: mapUserFromApi(user) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not provision user.' };
  }
};

export const importDirectoryUsersRemote = async (
  orgId: string,
  provider: 'microsoft',
  users: Array<{
    externalId?: string;
    email: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }>
): Promise<{
  success: boolean;
  created?: Array<{ id: string; email: string; displayName: string }>;
  skipped?: Array<{ email: string; reason: string }>;
  seats?: { used: number; total: number; limited: boolean };
  error?: string;
}> => {
  try {
    const response = await apiRequest<{
      created: Array<{ id: string; email: string; displayName: string }>;
      skipped: Array<{ email: string; reason: string }>;
      seats: { used: number; total: number; limited: boolean };
    }>(`/orgs/${orgId}/users/import`, {
      method: 'POST',
      body: { provider, users }
    });
    return { success: true, ...response };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not import users.' };
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

export const deleteOrganizationRemote = async (
  orgId: string
): Promise<{ success: boolean; error?: string }> => {
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
