import React from 'react';
import { Organization } from '../../types';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <rect x="3" y="3" width="8.5" height="8.5" fill="#F25022" />
    <rect x="12.5" y="3" width="8.5" height="8.5" fill="#7FBA00" />
    <rect x="3" y="12.5" width="8.5" height="8.5" fill="#00A4EF" />
    <rect x="12.5" y="12.5" width="8.5" height="8.5" fill="#FFB900" />
  </svg>
);

interface WorkspaceSsoSectionProps {
  org: Organization;
  ssoError: string;
  connectingProvider: 'microsoft' | null;
  onToggleAllow: (checked: boolean) => void;
  onConnect: () => void;
}

const WorkspaceSsoSection: React.FC<WorkspaceSsoSectionProps> = ({
  org,
  ssoError,
  connectingProvider,
  onToggleAllow,
  onConnect
}) => {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Workspace SSO</h3>
          <p className="mt-1 text-xs text-slate-500">
            Configure organization-level Microsoft sign-in for {org.loginSubdomain || 'workspace'}.velo.ai.
          </p>
        </div>
      </div>
      <article className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200">
              <MicrosoftLogo />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Microsoft Entra ID</p>
              <p className="text-[11px] text-slate-500">Org-wide sign-in provider</p>
            </div>
          </div>
          <Badge variant={org.microsoftWorkspaceConnected ? 'emerald' : 'neutral'}>
            {org.microsoftWorkspaceConnected ? 'Connected' : 'Not connected'}
          </Badge>
        </div>
        <label className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 flex items-center justify-between">
          <span className="text-xs text-slate-700">Consent / connection</span>
          <Button
            size="sm"
            variant={org.microsoftWorkspaceConnected ? 'outline' : 'primary'}
            className="!h-7 !px-2.5 !text-[11px]"
            onClick={onConnect}
            isLoading={connectingProvider === 'microsoft'}
          >
            {org.microsoftWorkspaceConnected ? 'Reconnect' : 'Connect'}
          </Button>
        </label>
        <label className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 flex items-center justify-between">
          <span className="text-xs text-slate-700">Allow user sign-in</span>
          <input
            type="checkbox"
            checked={Boolean(org.allowMicrosoftAuth)}
            onChange={(event) => onToggleAllow(event.target.checked)}
            disabled={!org.microsoftWorkspaceConnected}
          />
        </label>
      </article>
      {ssoError ? <p className="text-xs text-rose-600">{ssoError}</p> : null}
    </section>
  );
};

export default WorkspaceSsoSection;
