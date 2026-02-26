import React, { useEffect, useState } from 'react';
import { ArrowLeft, Cloud, Eye, EyeOff } from 'lucide-react';
import { userService } from '../services/userService';
import { User } from '../types';
import Button from './ui/Button';
import { inferWorkspaceDomainFromHost, isWorkspaceSubdomainHost } from '../utils/workspaceHost';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
  initialMode?: 'login' | 'register' | 'join';
  onBackToHome?: () => void;
  onOpenPricing?: () => void;
  onOpenSupport?: () => void;
  workspaceScoped?: boolean;
}

type Tier = 'free' | 'basic' | 'pro';
type AuthMode = 'login' | 'signup' | 'join';

const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
    <rect x="2" y="2" width="9" height="9" fill="#F35325" />
    <rect x="13" y="2" width="9" height="9" fill="#81BC06" />
    <rect x="2" y="13" width="9" height="9" fill="#05A6F0" />
    <rect x="13" y="13" width="9" height="9" fill="#FFBA08" />
  </svg>
);

const WorkspaceIllustration = () => (
  <svg viewBox="0 0 520 260" className="h-full w-full" role="img" aria-label="Workspace collaboration illustration">
    <defs>
      <linearGradient id="veloAuthBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8edf2" />
        <stop offset="100%" stopColor="#f1f5f9" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="520" height="260" rx="28" fill="url(#veloAuthBg)" />
    <rect x="28" y="36" width="464" height="188" rx="16" fill="#ffffff" stroke="#e2e8f0" />
    <rect x="52" y="62" width="184" height="16" rx="8" fill="#cbd5e1" />
    <rect x="52" y="88" width="142" height="12" rx="6" fill="#e2e8f0" />
    <rect x="52" y="116" width="122" height="76" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
    <rect x="188" y="116" width="122" height="76" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
    <rect x="324" y="116" width="122" height="76" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
    <circle cx="365" cy="154" r="26" fill="#76003f" opacity="0.92" />
    <circle cx="422" cy="154" r="20" fill="#0f172a" opacity="0.9" />
    <circle cx="305" cy="154" r="20" fill="#475569" opacity="0.9" />
  </svg>
);

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, initialMode = 'login', onBackToHome, workspaceScoped }) => {
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
  const [invitePreview, setInvitePreview] = useState<{
    token: string;
    role: 'member' | 'admin';
    invitedIdentifier: string | null;
    expiresAt: string;
    org: { id: string; name: string; loginSubdomain: string };
  } | null>(null);
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

  const plans: Array<{ id: Tier; label: string; maxSeats?: number; price: number }> = [
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
  }, [inviteToken]);

  const handleProviderSignIn = async (provider: 'microsoft') => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const user = result.user;
    await userService.hydrateWorkspaceFromBackend(user.orgId);
    sessionStorage.setItem('velo_post_signup_setup', JSON.stringify({ orgId: user.orgId, userId: user.id, createdAt: Date.now() }));
    onAuthSuccess(user);
  };

  return (
    <div className="min-h-screen bg-[#efefef] px-4 py-6 text-slate-900 md:px-6 flex items-center justify-center">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1fr_1fr]">
          <aside className="hidden border-r border-[#ead4df] bg-[#f6eaf0] p-8 lg:block">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Workspace access</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {scopedWorkspace ? 'Workspace sign-in' : 'Sign in, create, or join a workspace'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {scopedWorkspace
                ? 'This URL is dedicated to a single workspace. Sign in with your workspace credentials or approved SSO provider.'
                : 'Use Sign in if you already have an account, Create workspace to start a new org, or Join workspace with an invite token.'}
            </p>
            {!scopedWorkspace ? (
              <>
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <WorkspaceIllustration />
                </div>
              </>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <WorkspaceIllustration />
              </div>
            )}
          </aside>

          <section className="flex items-center justify-center p-5 md:p-8">
            <div className="w-full max-w-[560px]">
              {scopedWorkspace ? (
                <div className="mb-6">
                  {onBackToHome ? (
                    <div className="mb-3 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={onBackToHome}>
                        <ArrowLeft className="mr-1.5 h-4 w-4" />Main site
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-slate-900 p-2 text-white"><Cloud className="h-4 w-4" /></div>
                      <p className="text-xl font-semibold tracking-tight text-slate-900">Velo<span className="text-[#76003f]">.</span></p>
                    </div>
                    {workspaceName || inferredWorkspaceDomain ? (
                      <p className="mt-2 text-base font-semibold text-slate-800">{workspaceName ? `Welcome to ${workspaceName}` : 'Welcome back'}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {mode === 'login'
                        ? isResetPasswordMode
                          ? 'Reset your password'
                          : 'Sign in to your workspace'
                        : mode === 'signup'
                          ? 'Create your workspace'
                          : 'Join your workspace'}
                    </p>
                    {inferredWorkspaceDomain ? (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Workspace</span>
                        <span className="text-sm font-semibold text-slate-900">{inferredWorkspaceDomain}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-slate-900 p-2 text-white"><Cloud className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xl font-semibold tracking-tight text-slate-900">Velo<span className="text-[#76003f]">.</span></p>
                      <p className="text-xs text-slate-500">
                        {mode === 'login'
                          ? isResetPasswordMode
                            ? 'Reset your password'
                            : 'Sign in to your account'
                          : mode === 'signup'
                            ? 'Create a new workspace'
                            : 'Join an existing workspace'}
                      </p>
                    </div>
                  </div>
                  {onBackToHome ? (
                    <Button variant="ghost" size="sm" onClick={onBackToHome}>
                      <ArrowLeft className="mr-1.5 h-4 w-4" />Home
                    </Button>
                  ) : null}
                </div>
              )}

            {scopedWorkspace ? (
              <div className="mb-4 block overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 lg:hidden">
                <WorkspaceIllustration />
              </div>
            ) : null}

            {!scopedWorkspace ? (
              <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setResetNotice(''); setIsResetPasswordMode(false); }}
                  className={`h-10 rounded-lg text-sm font-medium ${mode === 'login' ? 'bg-white text-[#76003f] shadow-sm' : 'text-slate-500'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); setResetNotice(''); setIsResetPasswordMode(false); }}
                  className={`h-10 rounded-lg text-sm font-medium ${mode === 'signup' ? 'bg-white text-[#76003f] shadow-sm' : 'text-slate-500'}`}
                >
                  Create workspace
                </button>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {licenseBlocked ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold">No license seat available</p>
                  <p className="mt-1">{licenseBlocked.message}</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Ask your workspace admin to add/assign a seat, then retry Microsoft sign-in.
                  </p>
                </div>
              ) : null}
              {mode === 'signup' ? (
                <div>
                  <label className="mb-1.5 block text-xs text-slate-500">Organization</label>
                  <input
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Inc"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3.5 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              ) : null}

              {mode === 'join' && invitePreview ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold text-emerald-800">Invite to workspace</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {invitePreview.org.name} ({invitePreview.org.loginSubdomain}.velo.ai)
                  </p>
                </div>
              ) : null}

              {mode === 'join' && !invitePreview ? (
                <div>
                  <label className="mb-1.5 block text-xs text-slate-500">Invite link token</label>
                  <input
                    required
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="Paste invite token from your link"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3.5 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              ) : null}
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">Username or email</label>
                <input
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@company.com"
                  readOnly={mode === 'join' && Boolean(invitePreview?.invitedIdentifier)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 outline-none focus:ring-2 focus:ring-slate-300 read-only:bg-slate-50 read-only:text-slate-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">{isResetPasswordMode ? 'New password' : 'Password'}</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isResetPasswordMode ? 'New password' : 'Password'}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3.5 pr-11 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' || (mode === 'login' && isResetPasswordMode) ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-500">{mode === 'signup' ? 'Re-enter password' : 'Re-enter new password'}</label>
                    <div className="relative">
                      <input
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={mode === 'signup' ? 'Re-enter password' : 'Re-enter new password'}
                        className="h-11 w-full rounded-xl border border-slate-300 px-3.5 pr-11 outline-none focus:ring-2 focus:ring-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {mode === 'signup' ? (
                    <>
                      <div>
                        <label className="mb-2 block text-xs text-slate-500">Plan</label>
                        <div className="grid gap-2">
                          {plans.map((plan) => (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedTier(plan.id)}
                              className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
                                selectedTier === plan.id ? 'border-[#76003f] bg-[#76003f] text-white' : 'border-slate-200 bg-white text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{plan.label}</p>
                                <p className={`text-xs ${selectedTier === plan.id ? 'text-slate-200' : 'text-slate-500'}`}>
                                  {plan.price > 0 ? `$${plan.price}/user` : 'Free'}
                                </p>
                              </div>
                              <p className={`text-xs mt-1 ${selectedTier === plan.id ? 'text-slate-200' : 'text-slate-500'}`}>
                                {plan.id === 'free' ? 'Up to 3 licenses' : 'Feature-based plan (no seat cap)'}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                      {selectedTier === 'free' ? (
                        <div>
                          <label className="mb-1.5 block text-xs text-slate-500">Licenses (seats)</label>
                          <input
                            type="number"
                            min={1}
                            max={3}
                            step={1}
                            value={effectiveSeatCount || 3}
                            onChange={(e) => setSeatCount(Number(e.target.value))}
                            className="h-11 w-full rounded-xl border border-slate-300 px-3.5 outline-none focus:ring-2 focus:ring-slate-300"
                          />
                          <p className="mt-1.5 text-xs text-slate-500">Free plan allows up to 3 licenses.</p>
                        </div>
                      ) : (
                        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          {selectedPlan.label} is feature-based. License capacity is managed by your workspace plan.
                        </p>
                      )}
                    </>
                  ) : null}
                </>
              ) : null}
 
              {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
              {resetNotice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{resetNotice}</div> : null}

              <Button type="submit" className="h-11 w-full bg-[#76003f] hover:bg-[#640035]" isLoading={loading}>
                {mode === 'login' ? (isResetPasswordMode ? 'Reset password' : 'Sign in') : mode === 'signup' ? 'Create workspace' : 'Join workspace'}
              </Button>
              {mode === 'login' && !isResetPasswordMode ? (
                <>
                  <div className="flex items-center gap-2 py-0.5">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[11px] text-slate-500">or continue with</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full"
                      disabled={oauthLoadingProvider !== null}
                      onClick={(event) => {
                        event.preventDefault();
                        handleProviderSignIn('microsoft');
                      }}
                      isLoading={oauthLoadingProvider === 'microsoft'}
                      aria-label="Sign in with Microsoft"
                      title="Sign in with Microsoft"
                    >
                      <MicrosoftLogo />
                    </Button>
                  </div>
                </>
              ) : null}
              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPasswordMode((prev) => !prev);
                    setError('');
                    setResetNotice('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-700"
                >
                  {isResetPasswordMode ? 'Back to sign in' : 'Forgot password? Reset here'}
                </button>
              ) : null}
            </form>
            {!scopedWorkspace ? (
              <p className="mt-4 text-center text-xs text-slate-500">
                {mode === 'login'
                  ? 'Need a new workspace? Use Create workspace. Have an invite link? Open it directly.'
                  : mode === 'signup'
                    ? 'Already registered? Switch to Sign in.'
                    : 'No invite link yet? Ask your admin to send one from Settings → Users.'}
              </p>
            ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
