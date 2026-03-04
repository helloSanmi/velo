import React from 'react';
import { AuthMode, InvitePreview } from './AuthView.types';

interface AuthWorkspaceFieldsProps {
  mode: AuthMode;
  orgName: string;
  setOrgName: (value: string) => void;
  invitePreview: InvitePreview | null;
  inviteToken: string;
  setInviteToken: (value: string) => void;
  identifier: string;
  setIdentifier: (value: string) => void;
}

export const AuthWorkspaceFields: React.FC<AuthWorkspaceFieldsProps> = ({
  mode,
  orgName,
  setOrgName,
  invitePreview,
  inviteToken,
  setInviteToken,
  identifier,
  setIdentifier
}) => (
  <>
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
  </>
);
