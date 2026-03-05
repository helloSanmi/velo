import { OrgInvite, Organization, User } from '../../types';
import { apiRequest } from '../apiClient';
import {
  PLAN_DEFAULT_SEATS,
  PLAN_SEAT_PRICE,
  SESSION_KEY
} from './constants';
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
} from './remote';

type Deps = {
  getInvites: (orgId?: string) => OrgInvite[];
  getUsers: (orgId?: string) => User[];
  hydrateWorkspaceFromBackend: (
    orgId: string,
    options?: { force?: boolean }
  ) => Promise<{ users: any[]; projects: any[] } | null>;
};

export const createRemoteUserFacade = (deps: Deps) => ({
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
    users?: Array<{
      externalId: string;
      email: string;
      displayName: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
    }>;
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
    fetchInvitesFromBackendRemote(orgId, deps.getInvites),

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
    updateUserRemote(orgId, userId, updates, deps.hydrateWorkspaceFromBackend, deps.getUsers),

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
    deleteUserRemote(orgId, userId, deps.hydrateWorkspaceFromBackend, deps.getUsers),

  deleteOrganizationRemote: async (orgId: string): Promise<{ success: boolean; error?: string }> =>
    deleteOrganizationRemote(orgId),

  getPlanDefaults: () => ({
    seatDefaults: PLAN_DEFAULT_SEATS,
    seatPrices: PLAN_SEAT_PRICE
  })
});
