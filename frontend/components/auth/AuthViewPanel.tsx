import React from 'react';
import { WorkspaceIllustration } from './AuthViewVisuals';
import { AuthMode, InvitePreview, LoginPasswordStep, PlanOption, Tier } from './AuthView.types';
import { AuthViewHeader } from './AuthViewHeader';
import { AuthViewForm } from './AuthViewForm';

interface AuthViewPanelProps {
  scopedWorkspace: boolean;
  onBackToHome?: () => void;
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  setError: (value: string) => void;
  setResetNotice: (value: string) => void;
  setIsResetPasswordMode: (value: boolean) => void;
  setTempPasswordVerified: (value: boolean) => void;
  setVerifiedTempPassword: (value: string) => void;
  handleSubmit: (event: React.FormEvent) => void;
  licenseBlocked: { provider: 'microsoft'; message: string } | null;
  orgName: string;
  setOrgName: (value: string) => void;
  invitePreview: InvitePreview | null;
  inviteToken: string;
  setInviteToken: (value: string) => void;
  identifier: string;
  setIdentifier: (value: string) => void;
  isResetPasswordMode: boolean;
  loginPasswordStep: LoginPasswordStep;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  plans: PlanOption[];
  selectedTier: Tier;
  setSelectedTier: (tier: Tier) => void;
  effectiveSeatCount: number;
  selectedPlanLabel: string;
  planLocked: boolean;
  setSeatCount: (count: number) => void;
  error: string;
  resetNotice: string;
  loading: boolean;
  oauthLoadingProvider: 'microsoft' | null;
  handleProviderSignIn: (provider: 'microsoft') => Promise<void>;
  workspaceName: string;
  inferredWorkspaceDomain: string | null;
}

const AuthViewPanel: React.FC<AuthViewPanelProps> = ({
  scopedWorkspace,
  onBackToHome,
  mode,
  setMode,
  setError,
  setResetNotice,
  setIsResetPasswordMode,
  setTempPasswordVerified,
  setVerifiedTempPassword,
  handleSubmit,
  licenseBlocked,
  orgName,
  setOrgName,
  invitePreview,
  inviteToken,
  setInviteToken,
  identifier,
  setIdentifier,
  isResetPasswordMode,
  loginPasswordStep,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  confirmPassword,
  setConfirmPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  plans,
  selectedTier,
  setSelectedTier,
  effectiveSeatCount,
  selectedPlanLabel,
  planLocked,
  setSeatCount,
  error,
  resetNotice,
  loading,
  oauthLoadingProvider,
  handleProviderSignIn,
  workspaceName,
  inferredWorkspaceDomain
}) => (
  <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="grid lg:grid-cols-[1fr_1fr]">
      <aside className="hidden border-r border-[#ead4df] bg-[#f6eaf0] p-8 lg:block">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Workspace access</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {scopedWorkspace
            ? 'This URL is dedicated to a single workspace. Use it for direct access, password setup, and approved SSO sign-in.'
            : 'Use Sign in if you already have an account, Create workspace to start a new org, or Join workspace with an invite token.'}
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <WorkspaceIllustration />
        </div>
      </aside>

      <section className="flex items-center justify-center p-5 md:p-8">
        <div className="w-full max-w-[560px]">
          <AuthViewHeader
            scopedWorkspace={scopedWorkspace}
            onBackToHome={onBackToHome}
            mode={mode}
            setMode={setMode}
            setError={setError}
            setResetNotice={setResetNotice}
            setIsResetPasswordMode={setIsResetPasswordMode}
            setTempPasswordVerified={setTempPasswordVerified}
            setVerifiedTempPassword={setVerifiedTempPassword}
            isResetPasswordMode={isResetPasswordMode}
            workspaceName={workspaceName}
            inferredWorkspaceDomain={inferredWorkspaceDomain}
          />
          <AuthViewForm
            mode={mode}
            handleSubmit={handleSubmit}
            licenseBlocked={licenseBlocked}
            orgName={orgName}
            setOrgName={setOrgName}
            invitePreview={invitePreview}
            inviteToken={inviteToken}
            setInviteToken={setInviteToken}
            identifier={identifier}
            setIdentifier={setIdentifier}
            isResetPasswordMode={isResetPasswordMode}
            loginPasswordStep={loginPasswordStep}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            plans={plans}
            selectedTier={selectedTier}
            setSelectedTier={setSelectedTier}
            effectiveSeatCount={effectiveSeatCount}
            selectedPlanLabel={selectedPlanLabel}
            planLocked={planLocked}
            setSeatCount={setSeatCount}
            error={error}
            resetNotice={resetNotice}
            loading={loading}
            oauthLoadingProvider={oauthLoadingProvider}
            handleProviderSignIn={handleProviderSignIn}
            setIsResetPasswordMode={setIsResetPasswordMode}
            setTempPasswordVerified={setTempPasswordVerified}
            setVerifiedTempPassword={setVerifiedTempPassword}
            setError={setError}
            setResetNotice={setResetNotice}
          />

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
);

export default AuthViewPanel;
