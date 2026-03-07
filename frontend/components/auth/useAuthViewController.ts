import { useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import { PLAN_DEFINITIONS } from '../../services/planFeatureService';
import { User } from '../../types';
import { inferWorkspaceDomainFromHost, isWorkspaceSubdomainHost } from '../../utils/workspaceHost';
import { AuthMode, InvitePreview, LoginPasswordStep, PlanOption, Tier } from './AuthView.types';
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
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const requestedPlan = searchParams?.get('plan');
  const lockedPlan: Tier | null =
    requestedPlan === 'free' || requestedPlan === 'basic' || requestedPlan === 'pro' ? requestedPlan : null;
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
  const [tempPasswordVerified, setTempPasswordVerified] = useState(false);
  const [verifiedTempPassword, setVerifiedTempPassword] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [licenseBlocked, setLicenseBlocked] = useState<{ provider: 'microsoft'; message: string } | null>(null);
  const [orgName, setOrgName] = useState('');
  const [selectedTier, setSelectedTier] = useState<Tier>(
    lockedPlan || 'basic'
  );
  const [seatCount, setSeatCount] = useState(lockedPlan === 'free' ? 3 : 5);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<'microsoft' | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');

  const plans: PlanOption[] = [
    {
      id: PLAN_DEFINITIONS.free.id,
      label: PLAN_DEFINITIONS.free.name,
      minSeats: 1,
      maxSeats: 3,
      price: PLAN_DEFINITIONS.free.price,
      seatLabel: PLAN_DEFINITIONS.free.seatLabel
    },
    {
      id: PLAN_DEFINITIONS.basic.id,
      minSeats: 1,
      label: PLAN_DEFINITIONS.basic.name,
      price: PLAN_DEFINITIONS.basic.price,
      seatLabel: PLAN_DEFINITIONS.basic.seatLabel
    },
    {
      id: PLAN_DEFINITIONS.pro.id,
      minSeats: 1,
      label: PLAN_DEFINITIONS.pro.name,
      price: PLAN_DEFINITIONS.pro.price,
      seatLabel: PLAN_DEFINITIONS.pro.seatLabel
    }
  ];
  const selectedPlan = plans.find((plan) => plan.id === selectedTier) || plans[1];
  const effectiveSeatCount =
    selectedTier === 'free'
      ? Math.max(1, Math.min(3, seatCount || 1))
      : Math.max(1, Math.min(100000, Math.round(seatCount || 1)));
  const visiblePlans = lockedPlan ? [selectedPlan] : plans;
  const inferredWorkspaceDomain = inferWorkspaceDomainFromHost();
  const inferredWorkspaceSubdomain = inferredWorkspaceDomain?.split('.')[0]?.toLowerCase();
  const loginPasswordStep: LoginPasswordStep =
    mode === 'login' && isResetPasswordMode
      ? tempPasswordVerified
        ? 'set_new_password'
        : 'verify_temp_password'
      : 'sign_in';

  useEffect(() => {
    if (!lockedPlan) return;
    setSelectedTier(lockedPlan);
  }, [lockedPlan]);

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
      tempPasswordVerified,
      verifiedTempPassword,
      orgName,
      selectedTier,
      effectiveSeatCount,
      inferredWorkspaceDomain,
      onAuthSuccess,
      setError,
      setLoading,
      setResetNotice,
      setIsResetPasswordMode,
      setTempPasswordVerified,
      setVerifiedTempPassword,
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
    loginPasswordStep,
    setIsResetPasswordMode,
    tempPasswordVerified,
    setTempPasswordVerified,
    setVerifiedTempPassword,
    resetNotice,
    setResetNotice,
    licenseBlocked,
    orgName,
    setOrgName,
    selectedTier,
    setSelectedTier,
    lockedPlan,
    seatCount,
    setSeatCount,
    plans: visiblePlans,
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
