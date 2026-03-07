import React from 'react';
import { User } from '../types';
import AuthViewPanel from './auth/AuthViewPanel';
import { useAuthViewController } from './auth/useAuthViewController';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
  initialMode?: 'login' | 'register' | 'join';
  onBackToHome?: () => void;
  onOpenPricing?: () => void;
  workspaceScoped?: boolean;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, initialMode = 'login', onBackToHome, workspaceScoped }) => {
  const controller = useAuthViewController({
    onAuthSuccess,
    initialMode,
    workspaceScoped
  });

  return (
    <div className="min-h-screen bg-[#efefef] px-4 py-6 text-slate-900 md:px-6 flex items-center justify-center">
      <AuthViewPanel
        scopedWorkspace={controller.scopedWorkspace}
        onBackToHome={onBackToHome}
        mode={controller.mode}
        setMode={controller.setMode}
        setError={controller.setError}
        setResetNotice={controller.setResetNotice}
        setIsResetPasswordMode={controller.setIsResetPasswordMode}
        setTempPasswordVerified={controller.setTempPasswordVerified}
        setVerifiedTempPassword={controller.setVerifiedTempPassword}
        handleSubmit={controller.handleSubmit}
        licenseBlocked={controller.licenseBlocked}
        orgName={controller.orgName}
        setOrgName={controller.setOrgName}
        invitePreview={controller.invitePreview}
        inviteToken={controller.inviteToken}
        setInviteToken={controller.setInviteToken}
        identifier={controller.identifier}
        setIdentifier={controller.setIdentifier}
        isResetPasswordMode={controller.isResetPasswordMode}
        loginPasswordStep={controller.loginPasswordStep}
        password={controller.password}
        setPassword={controller.setPassword}
        showPassword={controller.showPassword}
        setShowPassword={controller.setShowPassword}
        confirmPassword={controller.confirmPassword}
        setConfirmPassword={controller.setConfirmPassword}
        showConfirmPassword={controller.showConfirmPassword}
        setShowConfirmPassword={controller.setShowConfirmPassword}
        plans={controller.plans}
        selectedTier={controller.selectedTier}
        setSelectedTier={controller.setSelectedTier}
        effectiveSeatCount={controller.effectiveSeatCount}
        selectedPlanLabel={controller.selectedPlan.label}
        planLocked={Boolean(controller.lockedPlan)}
        setSeatCount={controller.setSeatCount}
        error={controller.error}
        resetNotice={controller.resetNotice}
        loading={controller.loading}
        oauthLoadingProvider={controller.oauthLoadingProvider}
        handleProviderSignIn={controller.handleProviderSignIn}
        workspaceName={controller.workspaceName}
        inferredWorkspaceDomain={controller.inferredWorkspaceDomain}
      />
    </div>
  );
};

export default AuthView;
