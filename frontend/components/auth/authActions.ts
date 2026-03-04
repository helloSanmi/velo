import { FormEvent } from 'react';
import { User } from '../../types';
import { userService } from '../../services/userService';
import { AuthMode, InvitePreview, Tier } from './AuthView.types';

interface CommonActionArgs {
  onAuthSuccess: (user: User) => void;
  inferredWorkspaceDomain: string | null;
  setError: (value: string) => void;
  setLoading: (value: boolean) => void;
}

interface ProviderSignInArgs extends Omit<CommonActionArgs, 'setLoading'> {
  provider: 'microsoft';
  setLicenseBlocked: (value: { provider: 'microsoft'; message: string } | null) => void;
  setOauthLoadingProvider: (value: 'microsoft' | null) => void;
}

export const handleProviderSignInAction = async ({
  provider,
  inferredWorkspaceDomain,
  onAuthSuccess,
  setError,
  setLicenseBlocked,
  setOauthLoadingProvider
}: ProviderSignInArgs) => {
  setError('');
  setLicenseBlocked(null);
  setOauthLoadingProvider(provider);

  const result = await userService.loginWithProvider(provider, inferredWorkspaceDomain);
  if (!result.user) {
    if (result.code === 'LICENSE_REQUIRED') {
      setLicenseBlocked({
        provider,
        message: result.error || 'No license seat is available for your workspace. Contact your admin.'
      });
      setOauthLoadingProvider(null);
      return;
    }
    setError(result.error || 'Microsoft sign-in failed.');
    setOauthLoadingProvider(null);
    return;
  }

  await userService.hydrateWorkspaceFromBackend(result.user.orgId);
  onAuthSuccess(result.user);
};

interface SubmitAuthFormArgs extends CommonActionArgs {
  event: FormEvent;
  mode: AuthMode;
  inviteToken: string;
  invitePreview: InvitePreview | null;
  identifier: string;
  password: string;
  confirmPassword: string;
  isResetPasswordMode: boolean;
  orgName: string;
  selectedTier: Tier;
  effectiveSeatCount: number | null;
  setResetNotice: (value: string) => void;
  setIsResetPasswordMode: (value: boolean) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
}

export const handleSubmitAuthForm = async ({
  event,
  mode,
  inviteToken,
  invitePreview,
  identifier,
  password,
  confirmPassword,
  isResetPasswordMode,
  orgName,
  selectedTier,
  effectiveSeatCount,
  inferredWorkspaceDomain,
  onAuthSuccess,
  setError,
  setLoading,
  setResetNotice,
  setIsResetPasswordMode,
  setPassword,
  setConfirmPassword
}: SubmitAuthFormArgs) => {
  event.preventDefault();
  setError('');
  setResetNotice('');

  const resolvedInviteIdentifier = (invitePreview?.invitedIdentifier || identifier).trim();
  if (mode !== 'join' && !identifier.trim()) return setError('Enter your username or email.');
  if (mode === 'join' && !resolvedInviteIdentifier) return setError('Enter your work email or username from the invite.');
  if (!isResetPasswordMode && !password.trim()) return setError('Enter your password.');
  if (isResetPasswordMode && !password.trim()) return setError('Enter your new password.');
  if (isResetPasswordMode && !confirmPassword.trim()) return setError('Re-enter your new password.');
  if (mode === 'signup' && !confirmPassword.trim()) return setError('Re-enter your password.');
  if (mode === 'signup' && password.trim() !== confirmPassword.trim()) return setError('Passwords do not match.');

  setLoading(true);

  if (mode === 'login') {
    if (isResetPasswordMode) {
      const resetResult = await userService.resetPassword(identifier.trim(), inferredWorkspaceDomain, password.trim(), confirmPassword.trim());
      if (!resetResult.success) {
        setError(resetResult.error || 'Could not reset password.');
        setLoading(false);
        return;
      }
      setResetNotice('Password updated. You can now sign in.');
      setIsResetPasswordMode(false);
      setPassword('');
      setConfirmPassword('');
      setLoading(false);
      return;
    }

    const login = await userService.loginWithPassword(identifier.trim(), password.trim(), inferredWorkspaceDomain);
    if (!login.user) {
      if (login.code === 'PASSWORD_CHANGE_REQUIRED') {
        setIsResetPasswordMode(true);
        setResetNotice('Temporary password verified. Set a new password to continue.');
        setLoading(false);
        return;
      }
      setError(login.error || 'Account not found.');
      setLoading(false);
      return;
    }

    await userService.hydrateWorkspaceFromBackend(login.user.orgId);
    onAuthSuccess(login.user);
    return;
  }

  if (mode === 'join') {
    if (!inviteToken.trim()) {
      setError('Invite link is required.');
      setLoading(false);
      return;
    }
    const result = await userService.acceptInviteWithPassword(inviteToken, resolvedInviteIdentifier, password.trim());
    if (!result.success || !result.user) {
      setError(result.error || 'Unable to join workspace.');
      setLoading(false);
      return;
    }
    await userService.hydrateWorkspaceFromBackend(result.user.orgId);
    onAuthSuccess(result.user);
    return;
  }

  if (!orgName.trim()) {
    setError('Enter your organization name.');
    setLoading(false);
    return;
  }

  const result = await userService.registerWithPassword(identifier.trim(), password.trim(), orgName.trim(), {
    plan: selectedTier,
    totalSeats: effectiveSeatCount || undefined
  });
  if (!result.success || !result.user) {
    setError(result.error || 'Could not create workspace account.');
    setLoading(false);
    return;
  }

  await userService.hydrateWorkspaceFromBackend(result.user.orgId);
  sessionStorage.setItem('velo_post_signup_setup', JSON.stringify({ orgId: result.user.orgId, userId: result.user.id, createdAt: Date.now() }));
  onAuthSuccess(result.user);
};
