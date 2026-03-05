import { User } from '../../types';
import { apiRequest, setAuthTokens } from '../apiClient';

export const loginWithPasswordRemote = async (
  identifier: string,
  password: string,
  workspaceDomain: string | undefined,
  saveSession: (user: User) => void
): Promise<{ user?: User; error?: string; code?: string }> => {
  try {
    const response = await apiRequest<{
      tokens: { accessToken: string; refreshToken: string };
      user: User;
    }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { identifier, password, workspaceDomain }
    });
    setAuthTokens(response.tokens);
    saveSession(response.user);
    return { user: response.user };
  } catch (error: any) {
    return { error: error?.message || 'Account not found.', code: error?.details?.code };
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
  identifier: string | undefined,
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

export const previewInviteRemote = async (
  token: string
): Promise<{
  success: boolean;
  data?: {
    token: string;
    role: 'member' | 'admin';
    invitedIdentifier: string | null;
    expiresAt: string;
    org: { id: string; name: string; loginSubdomain: string };
  };
  error?: string;
}> => {
  try {
    const data = await apiRequest<{
      token: string;
      role: 'member' | 'admin';
      invitedIdentifier: string | null;
      expiresAt: string;
      org: { id: string; name: string; loginSubdomain: string };
    }>(`/auth/invites/${encodeURIComponent(token)}`, {
      method: 'GET',
      auth: false
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Invite link is invalid or expired.' };
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

export const resetPasswordRemote = async (
  identifier: string,
  workspaceDomain: string | undefined,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest('/auth/reset-password', {
      method: 'POST',
      auth: false,
      body: { identifier, workspaceDomain, newPassword, confirmPassword }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reset password.' };
  }
};
