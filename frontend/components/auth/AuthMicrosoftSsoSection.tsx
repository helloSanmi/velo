import React from 'react';
import Button from '../ui/Button';
import { MicrosoftLogo } from './AuthViewVisuals';

interface AuthMicrosoftSsoSectionProps {
  oauthLoadingProvider: 'microsoft' | null;
  handleProviderSignIn: (provider: 'microsoft') => Promise<void>;
}

export const AuthMicrosoftSsoSection: React.FC<AuthMicrosoftSsoSectionProps> = ({
  oauthLoadingProvider,
  handleProviderSignIn
}) => (
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
);
