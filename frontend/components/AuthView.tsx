import React, { useState } from 'react';
import { ArrowLeft, Cloud, Eye, EyeOff } from 'lucide-react';
import { userService } from '../services/userService';
import { User } from '../types';
import Button from './ui/Button';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
  initialMode?: 'login' | 'register' | 'join';
  onBackToHome?: () => void;
  onOpenPricing?: () => void;
  onOpenSupport?: () => void;
}

type Tier = 'free' | 'basic' | 'pro';
type AuthMode = 'login' | 'signup' | 'join';

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, initialMode = 'login', onBackToHome }) => {
  const initialAuthMode: AuthMode = initialMode === 'register' ? 'signup' : initialMode === 'join' ? 'join' : 'login';
  const [mode, setMode] = useState<AuthMode>(initialAuthMode);
  const [identifier, setIdentifier] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [selectedTier, setSelectedTier] = useState<Tier>('basic');
  const [seatCount, setSeatCount] = useState(3);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const plans: Array<{ id: Tier; label: string; maxSeats?: number; price: number }> = [
    { id: 'free', label: 'Free', maxSeats: 3, price: 0 },
    { id: 'basic', label: 'Basic', price: 5 },
    { id: 'pro', label: 'Pro', price: 7 }
  ];
  const selectedPlan = plans.find((plan) => plan.id === selectedTier) || plans[1];
  const effectiveSeatCount = selectedTier === 'free' ? Math.max(1, Math.min(3, seatCount || 1)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) return setError('Enter your username or email.');
    if (!password.trim()) return setError('Enter your password.');
    if (mode === 'signup' && !confirmPassword.trim()) return setError('Re-enter your password.');
    if (mode === 'signup' && password.trim() !== confirmPassword.trim()) return setError('Passwords do not match.');

    setLoading(true);

    if (mode === 'login') {
      const user = await userService.loginWithPassword(identifier.trim(), password.trim());
      if (!user) {
        setError('Account not found.');
        setLoading(false);
        return;
      }
      await userService.hydrateWorkspaceFromBackend(user.orgId);
      onAuthSuccess(user);
      return;
    }

    if (mode === 'join') {
      if (!inviteToken.trim()) {
        setError('Enter your invite token.');
        setLoading(false);
        return;
      }
      const result = await userService.acceptInviteWithPassword(inviteToken, identifier.trim(), password.trim());
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
    <div className="min-h-screen bg-[#efefef] px-4 py-8 text-slate-900 md:px-6">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1fr_1fr]">
          <aside className="hidden border-r border-[#ead4df] bg-[#f6eaf0] p-8 lg:block">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Workspace access</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Start or join your workspace.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              SaaS onboarding: create an org, allocate licenses, invite members with tokens, and onboard teams/groups.
            </p>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Demo access</p>
              <p className="mt-1">Password: <span className="font-semibold">Password</span></p>
              <p className="mt-2 text-xs text-slate-500">Use admin, alex, sarah, or mike as username.</p>
            </div>
          </aside>

          <section className="p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-slate-900 p-2 text-white"><Cloud className="h-4 w-4" /></div>
                <div>
                  <p className="text-xl font-semibold tracking-tight text-slate-900">Velo<span className="text-[#76003f]">.</span></p>
                  <p className="text-xs text-slate-500">
                    {mode === 'login' ? 'Sign in to continue' : mode === 'signup' ? 'Create your workspace' : 'Join your workspace'}
                  </p>
                </div>
              </div>
              {onBackToHome ? (
                <Button variant="ghost" size="sm" onClick={onBackToHome}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" />Home
                </Button>
              ) : null}
            </div>

            <div className="mb-6 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className={`h-10 rounded-lg text-sm font-medium ${mode === 'login' ? 'bg-white text-[#76003f] shadow-sm' : 'text-slate-500'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); }}
                className={`h-10 rounded-lg text-sm font-medium ${mode === 'signup' ? 'bg-white text-[#76003f] shadow-sm' : 'text-slate-500'}`}
              >
                Create org
              </button>
              <button
                type="button"
                onClick={() => { setMode('join'); setError(''); }}
                className={`h-10 rounded-lg text-sm font-medium ${mode === 'join' ? 'bg-white text-[#76003f] shadow-sm' : 'text-slate-500'}`}
              >
                Join org
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              {mode === 'join' ? (
                <div>
                  <label className="mb-1.5 block text-xs text-slate-500">Invite token</label>
                  <input
                    required
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="velo_xxxxxxxx"
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
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-slate-500">Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
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

              {mode === 'signup' ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-500">Re-enter password</label>
                    <div className="relative">
                      <input
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
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

              {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

              <Button type="submit" className="h-11 w-full bg-[#76003f] hover:bg-[#640035]" isLoading={loading}>
                {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create workspace' : 'Join workspace'}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-500">
              {mode === 'login'
                ? 'Need a new org? Use Create org. Have invite? Use Join org.'
                : mode === 'signup'
                  ? 'Already registered? Switch to Sign in.'
                  : 'No invite yet? Ask your admin to send one from Settings → Licenses.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
