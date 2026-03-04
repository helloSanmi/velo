import React from 'react';
import { ArrowLeft, Cloud } from 'lucide-react';
import Button from '../ui/Button';
import { WorkspaceIllustration } from './AuthViewVisuals';
import { AuthMode } from './AuthView.types';

interface AuthViewHeaderProps {
  scopedWorkspace: boolean;
  onBackToHome?: () => void;
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  setError: (value: string) => void;
  setResetNotice: (value: string) => void;
  setIsResetPasswordMode: (value: boolean) => void;
  isResetPasswordMode: boolean;
  workspaceName: string;
  inferredWorkspaceDomain: string | null;
}

export const AuthViewHeader: React.FC<AuthViewHeaderProps> = ({
  scopedWorkspace,
  onBackToHome,
  mode,
  setMode,
  setError,
  setResetNotice,
  setIsResetPasswordMode,
  isResetPasswordMode,
  workspaceName,
  inferredWorkspaceDomain
}) => (
  <>
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
  </>
);

