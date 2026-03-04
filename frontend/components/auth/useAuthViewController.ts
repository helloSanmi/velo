import { useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import { User } from '../../types';
import { inferWorkspaceDomainFromHost, isWorkspaceSubdomainHost } from '../../utils/workspaceHost';
import { AuthMode, InvitePreview, PlanOption, Tier } from './AuthView.types';
import { handleProviderSignInAction, handleSubmitAuthForm } from './authActions';

interface UseAuthViewControllerParams {
  onAuthSuccess: (user: User) => void;
  initialMode?: 'login' | 'register' | 'join';
  workspaceScoped?: boolean;
}

export const useAuthViewController = ({
  onAuthSuccess,
  initialMode = 'login',
  workspaceScoped
}: UseAuthViewControllerParams) => {
  const hostScoped = isWorkspaceSubdomainHost();
  const scopedWorkspace = workspaceScoped ?? hostScoped;
  const initialAuthMode: AuthMode = scopedWorkspace
    ? 'login'
    : initialMode === 'register'
      ? 'signup'
      : 'login';

  const [mode, setMode] = useState<AuthMode>(initialAuthMode);
  const [identifier, setIdentifier] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);
  const [resetNotice, setResetNotice] = useState('');
  const [licenseBlocked, setLicenseBlocked] = useState<{ provider: 'microsoft'; message: string } | null>(null);
  const [orgName, setOrgName] = useState('');
  const [selectedTier, setSelectedTier] = useState<Tier>('basic');
  const [seatCount, setSeatCount] = useState(3);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<'microsoft' | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');

  const plans: PlanOption[] = [
    { id: 'free', label: 'Free', maxSeats: 3, price: 0 },
    { id: 'basic', label: 'Basic', price: 5 },
    { id: 'pro', label: 'Pro', price: 7 }
  ];
  const selectedPlan = plans.find((plan) => plan.id === selectedTier) || plans[1];
  const effectiveSeatCount = selectedTier === 'free' ? Math.max(1, Math.min(3, seatCount || 1)) : null;
  const inferredWorkspaceDomain = inferWorkspaceDomainFromHost();
  const inferredWorkspaceSubdomain = inferredWorkspaceDomain?.split('.')[0]?.toLowerCase();

  useEffect(() => {
    if (!scopedWorkspace || !inferredWorkspaceDomain) return;
    let cancelled = false;
    userService.getOauthProviderAvailability(inferredWorkspaceDomain).then((result) => {
      if (cancelled) return;
      if (result.orgName) setWorkspaceName(result.orgName);
    });
    return () => {
      cancelled = true;
    };
  }, [scopedWorkspace, inferredWorkspaceDomain]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tokenFromLink = (params.get('invite') || params.get('token') || '').trim();
    if (!tokenFromLink) return;
    setMode('join');
    setInviteToken(tokenFromLink);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!inviteToken.trim()) {
      setInvitePreview(null);
      return;
    }

    userService.previewInvite(inviteToken.trim()).then((result) => {
      if (cancelled) return;
      if (!result.success || !result.data) {
        setInvitePreview(null);
        setError(result.error || 'Invite link is invalid or expired.');
        return;
      }
      if (
        scopedWorkspace &&
        inferredWorkspaceSubdomain &&
        result.data.org.loginSubdomain.toLowerCase() !== inferredWorkspaceSubdomain
      ) {
        setInvitePreview(null);
        setError(`This invite is for ${result.data.org.loginSubdomain}. Open that workspace URL to continue.`);
        return;
      }
      setError('');
      setInvitePreview(result.data);
      if (result.data.invitedIdentifier) {
        setIdentifier(result.data.invitedIdentifier);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [inviteToken, scopedWorkspace, inferredWorkspaceSubdomain]);

  const handleProviderSignIn = async (provider: 'microsoft') =>
    handleProviderSignInAction({
      provider,
      inferredWorkspaceDomain,
      onAuthSuccess,
      setError,
      setLicenseBlocked,
      setOauthLoadingProvider
    });

  const handleSubmit = async (event: React.FormEvent) =>
    handleSubmitAuthForm({
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
    });

  return {
    scopedWorkspace,
    mode,
    setMode,
    identifier,
    setIdentifier,
    inviteToken,
    setInviteToken,
    invitePreview,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isResetPasswordMode,
    setIsResetPasswordMode,
    resetNotice,
    setResetNotice,
    licenseBlocked,
    orgName,
    setOrgName,
    selectedTier,
    setSelectedTier,
    seatCount,
    setSeatCount,
    plans,
    selectedPlan,
    effectiveSeatCount,
    error,
    setError,
    loading,
    oauthLoadingProvider,
    workspaceName,
    inferredWorkspaceDomain,
    handleProviderSignIn,
    handleSubmit
  };
};
