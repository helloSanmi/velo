import React from 'react';
import Button from '../ui/Button';
import AuthPasswordInput from './AuthPasswordInput';
import AuthSignupPlanSection from './AuthSignupPlanSection';
import { AuthWorkspaceFields } from './AuthWorkspaceFields';
import { AuthMicrosoftSsoSection } from './AuthMicrosoftSsoSection';
import { AuthViewFormProps } from './AuthViewForm.types';

export const AuthViewForm: React.FC<AuthViewFormProps> = ({
  mode,
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
  setSeatCount,
  error,
  resetNotice,
  loading,
  oauthLoadingProvider,
  handleProviderSignIn,
  setIsResetPasswordMode,
  setError,
  setResetNotice
}) => (
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

    <AuthWorkspaceFields
      mode={mode}
      orgName={orgName}
      setOrgName={setOrgName}
      invitePreview={invitePreview}
      inviteToken={inviteToken}
      setInviteToken={setInviteToken}
      identifier={identifier}
      setIdentifier={setIdentifier}
    />

    <AuthPasswordInput
      label={isResetPasswordMode ? 'New password' : 'Password'}
      placeholder={isResetPasswordMode ? 'New password' : 'Password'}
      value={password}
      onChange={setPassword}
      show={showPassword}
      onToggleShow={() => setShowPassword((prev) => !prev)}
    />

    {mode === 'signup' || (mode === 'login' && isResetPasswordMode) ? (
      <>
        <AuthPasswordInput
          label={mode === 'signup' ? 'Re-enter password' : 'Re-enter new password'}
          placeholder={mode === 'signup' ? 'Re-enter password' : 'Re-enter new password'}
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirmPassword}
          onToggleShow={() => setShowConfirmPassword((prev) => !prev)}
        />
        {mode === 'signup' ? (
          <AuthSignupPlanSection
            plans={plans}
            selectedTier={selectedTier}
            setSelectedTier={setSelectedTier}
            effectiveSeatCount={effectiveSeatCount}
            selectedPlanLabel={selectedPlanLabel}
            onSeatCountChange={setSeatCount}
          />
        ) : null}
      </>
    ) : null}

    {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    {resetNotice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{resetNotice}</div> : null}

    <Button type="submit" className="h-11 w-full bg-[#76003f] hover:bg-[#640035]" isLoading={loading}>
      {mode === 'login' ? (isResetPasswordMode ? 'Reset password' : 'Sign in') : mode === 'signup' ? 'Create workspace' : 'Join workspace'}
    </Button>

    {mode === 'login' && !isResetPasswordMode ? (
      <AuthMicrosoftSsoSection
        oauthLoadingProvider={oauthLoadingProvider}
        handleProviderSignIn={handleProviderSignIn}
      />
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
);
