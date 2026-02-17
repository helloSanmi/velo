import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Shield, ShieldCheck, UserCog, Users } from 'lucide-react';
import Button from '../../ui/Button';
import { Organization, User as UserType } from '../../../types';
import { dialogService } from '../../../services/dialogService';
import { settingsService, UserSettings } from '../../../services/settingsService';

interface SecuritySettingsPanelProps {
  user: UserType;
  org: Organization | null;
  settings: UserSettings;
  onToggle: (key: keyof UserSettings) => void;
  onThresholdChange: (value: number) => void;
}

const toggleClass = (active: boolean) => `w-11 h-6 rounded-full p-1 transition-colors ${active ? 'bg-slate-900' : 'bg-slate-300'}`;
const thumbClass = (active: boolean) => `block w-4 h-4 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`;

const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
  user,
  org,
  settings
}) => {
  const [draft, setDraft] = useState({
    requireTwoFactorAuth: settings.requireTwoFactorAuth,
    securitySessionTimeoutMinutes: settings.securitySessionTimeoutMinutes,
    securitySingleSessionOnly: settings.securitySingleSessionOnly,
    securityPasswordMinLength: settings.securityPasswordMinLength,
    securityPasswordRequireComplexity: settings.securityPasswordRequireComplexity,
    securityLockoutAttempts: settings.securityLockoutAttempts,
    securityAllowedEmailDomains: settings.securityAllowedEmailDomains,
    securityInviteExpiryDays: settings.securityInviteExpiryDays,
    securityInviteRequireAdminApproval: settings.securityInviteRequireAdminApproval,
    securityApiTokensEnabled: settings.securityApiTokensEnabled,
    securityAuditExportEnabled: settings.securityAuditExportEnabled,
    securityRequireApprovalForPurge: settings.securityRequireApprovalForPurge,
    securityAlertOnRiskEvents: settings.securityAlertOnRiskEvents,
    dataRetentionPolicy: settings.dataRetentionPolicy
  });

  useEffect(() => {
    setDraft({
      requireTwoFactorAuth: settings.requireTwoFactorAuth,
      securitySessionTimeoutMinutes: settings.securitySessionTimeoutMinutes,
      securitySingleSessionOnly: settings.securitySingleSessionOnly,
      securityPasswordMinLength: settings.securityPasswordMinLength,
      securityPasswordRequireComplexity: settings.securityPasswordRequireComplexity,
      securityLockoutAttempts: settings.securityLockoutAttempts,
      securityAllowedEmailDomains: settings.securityAllowedEmailDomains,
      securityInviteExpiryDays: settings.securityInviteExpiryDays,
      securityInviteRequireAdminApproval: settings.securityInviteRequireAdminApproval,
      securityApiTokensEnabled: settings.securityApiTokensEnabled,
      securityAuditExportEnabled: settings.securityAuditExportEnabled,
      securityRequireApprovalForPurge: settings.securityRequireApprovalForPurge,
      securityAlertOnRiskEvents: settings.securityAlertOnRiskEvents,
      dataRetentionPolicy: settings.dataRetentionPolicy
    });
  }, [settings]);

  const isAdmin = user.role === 'admin';

  const hasChanges = useMemo(
    () =>
      draft.requireTwoFactorAuth !== settings.requireTwoFactorAuth ||
      draft.securitySessionTimeoutMinutes !== settings.securitySessionTimeoutMinutes ||
      draft.securitySingleSessionOnly !== settings.securitySingleSessionOnly ||
      draft.securityPasswordMinLength !== settings.securityPasswordMinLength ||
      draft.securityPasswordRequireComplexity !== settings.securityPasswordRequireComplexity ||
      draft.securityLockoutAttempts !== settings.securityLockoutAttempts ||
      draft.securityAllowedEmailDomains !== settings.securityAllowedEmailDomains ||
      draft.securityInviteExpiryDays !== settings.securityInviteExpiryDays ||
      draft.securityInviteRequireAdminApproval !== settings.securityInviteRequireAdminApproval ||
      draft.securityApiTokensEnabled !== settings.securityApiTokensEnabled ||
      draft.securityAuditExportEnabled !== settings.securityAuditExportEnabled ||
      draft.securityRequireApprovalForPurge !== settings.securityRequireApprovalForPurge ||
      draft.securityAlertOnRiskEvents !== settings.securityAlertOnRiskEvents ||
      draft.dataRetentionPolicy !== settings.dataRetentionPolicy,
    [draft, settings]
  );

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Security is managed by workspace admins.
      </div>
    );
  }

  const setBool = (key: keyof typeof draft) => setDraft((prev) => ({ ...prev, [key]: !prev[key] as never }));

  const apply = () => {
    settingsService.updateSettings({
      requireTwoFactorAuth: draft.requireTwoFactorAuth,
      securitySessionTimeoutMinutes: draft.securitySessionTimeoutMinutes,
      securitySingleSessionOnly: draft.securitySingleSessionOnly,
      securityPasswordMinLength: draft.securityPasswordMinLength,
      securityPasswordRequireComplexity: draft.securityPasswordRequireComplexity,
      securityLockoutAttempts: draft.securityLockoutAttempts,
      securityAllowedEmailDomains: draft.securityAllowedEmailDomains,
      securityInviteExpiryDays: draft.securityInviteExpiryDays,
      securityInviteRequireAdminApproval: draft.securityInviteRequireAdminApproval,
      securityApiTokensEnabled: draft.securityApiTokensEnabled,
      securityAuditExportEnabled: draft.securityAuditExportEnabled,
      securityRequireApprovalForPurge: draft.securityRequireApprovalForPurge,
      securityAlertOnRiskEvents: draft.securityAlertOnRiskEvents,
      dataRetentionPolicy: draft.dataRetentionPolicy
    });
    dialogService.notice('Security policies updated.', { title: 'Security' });
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-900">Security command center</p>
          </div>
          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            Admin
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Workspace: {org?.name || 'Unknown'} ({org?.id?.slice(0, 8) || 'N/A'}...)</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">RBAC permissions</p>
            <p className="text-xs text-slate-500">Use Teams & Access to manage role-based groups and scoped access.</p>
          </div>
          <button
            className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => dialogService.notice('Manage RBAC in Settings → Teams & Access.', { title: 'RBAC permissions' })}
          >
            Open guide
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">Enforce 2FA for all users</p>
            <p className="text-xs text-slate-500">Require 2FA on every account in this workspace.</p>
          </div>
          <button onClick={() => setBool('requireTwoFactorAuth')} className={toggleClass(draft.requireTwoFactorAuth)}>
            <span className={thumbClass(draft.requireTwoFactorAuth)} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <p className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
          <UserCog className="w-4 h-4 text-slate-600" />
          Session & authentication
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] text-slate-500">Idle timeout</p>
            <select
              value={draft.securitySessionTimeoutMinutes}
              onChange={(event) => setDraft((prev) => ({ ...prev, securitySessionTimeoutMinutes: Number(event.target.value) as UserSettings['securitySessionTimeoutMinutes'] }))}
              className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={120}>120 min</option>
            </select>
          </label>
          <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] text-slate-500">Password min length</p>
            <select
              value={draft.securityPasswordMinLength}
              onChange={(event) => setDraft((prev) => ({ ...prev, securityPasswordMinLength: Number(event.target.value) as UserSettings['securityPasswordMinLength'] }))}
              className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
            >
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={12}>12</option>
            </select>
          </label>
          <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] text-slate-500">Lockout attempts</p>
            <select
              value={draft.securityLockoutAttempts}
              onChange={(event) => setDraft((prev) => ({ ...prev, securityLockoutAttempts: Number(event.target.value) as UserSettings['securityLockoutAttempts'] }))}
              className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
            >
              <option value={3}>3 attempts</option>
              <option value={5}>5 attempts</option>
              <option value={10}>10 attempts</option>
            </select>
          </label>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-900">Single session only</p>
              <p className="text-[11px] text-slate-500">Sign out other sessions on login.</p>
            </div>
            <button onClick={() => setBool('securitySingleSessionOnly')} className={toggleClass(draft.securitySingleSessionOnly)}>
              <span className={thumbClass(draft.securitySingleSessionOnly)} />
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between sm:col-span-2">
            <div>
              <p className="text-[11px] text-slate-900">Require password complexity</p>
              <p className="text-[11px] text-slate-500">Uppercase, lowercase, number, and symbol.</p>
            </div>
            <button onClick={() => setBool('securityPasswordRequireComplexity')} className={toggleClass(draft.securityPasswordRequireComplexity)}>
              <span className={thumbClass(draft.securityPasswordRequireComplexity)} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <p className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
          <Users className="w-4 h-4 text-slate-600" />
          Access & invite controls
        </p>
        <label className="block rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] text-slate-500">Allowed email domains (comma-separated)</p>
          <input
            value={draft.securityAllowedEmailDomains}
            onChange={(event) => setDraft((prev) => ({ ...prev, securityAllowedEmailDomains: event.target.value }))}
            placeholder="example.com, partner.org"
            className="mt-1 h-8 w-full rounded-md border border-slate-300 px-2 text-xs outline-none"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] text-slate-500">Invite expiry</p>
            <select
              value={draft.securityInviteExpiryDays}
              onChange={(event) => setDraft((prev) => ({ ...prev, securityInviteExpiryDays: Number(event.target.value) as UserSettings['securityInviteExpiryDays'] }))}
              className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-900">Invite approval required</p>
              <p className="text-[11px] text-slate-500">Require admin approval for new joins.</p>
            </div>
            <button onClick={() => setBool('securityInviteRequireAdminApproval')} className={toggleClass(draft.securityInviteRequireAdminApproval)}>
              <span className={thumbClass(draft.securityInviteRequireAdminApproval)} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <p className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-slate-600" />
          API, audit & data protection
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['securityApiTokensEnabled', 'API tokens enabled', 'Allow API token usage for integrations.'],
            ['securityAuditExportEnabled', 'Audit export enabled', 'Allow audit log export for compliance.'],
            ['securityRequireApprovalForPurge', 'Approval required for purge', 'Require admin approval before hard deletes.'],
            ['securityAlertOnRiskEvents', 'Security risk alerts', 'Alert admins on suspicious/risky events.']
          ].map(([key, title, subtitle]) => (
            <div key={key} className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-900">{title}</p>
                <p className="text-[11px] text-slate-500">{subtitle}</p>
              </div>
              <button onClick={() => setBool(key as keyof typeof draft)} className={toggleClass(Boolean(draft[key as keyof typeof draft]))}>
                <span className={thumbClass(Boolean(draft[key as keyof typeof draft]))} />
              </button>
            </div>
          ))}
        </div>
        <label className="block rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] text-slate-500">Data retention policy</p>
          <select
            value={draft.dataRetentionPolicy}
            onChange={(event) => setDraft((prev) => ({ ...prev, dataRetentionPolicy: event.target.value as UserSettings['dataRetentionPolicy'] }))}
            className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
          >
            <option value="30_days">30 days</option>
            <option value="90_days">90 days</option>
            <option value="365_days">365 days</option>
            <option value="indefinite">Indefinitely</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-wrap items-center justify-between gap-2">
        <button
          className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => dialogService.notice('Session revoke and API key rotation endpoints are ready for backend wiring.', { title: 'Security actions' })}
        >
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5" />
          Run security actions
        </button>
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-slate-500">{hasChanges ? 'Unsaved security changes.' : 'No pending changes.'}</p>
          <Button variant="outline" disabled={!hasChanges} onClick={() => setDraft({
            requireTwoFactorAuth: settings.requireTwoFactorAuth,
            securitySessionTimeoutMinutes: settings.securitySessionTimeoutMinutes,
            securitySingleSessionOnly: settings.securitySingleSessionOnly,
            securityPasswordMinLength: settings.securityPasswordMinLength,
            securityPasswordRequireComplexity: settings.securityPasswordRequireComplexity,
            securityLockoutAttempts: settings.securityLockoutAttempts,
            securityAllowedEmailDomains: settings.securityAllowedEmailDomains,
            securityInviteExpiryDays: settings.securityInviteExpiryDays,
            securityInviteRequireAdminApproval: settings.securityInviteRequireAdminApproval,
            securityApiTokensEnabled: settings.securityApiTokensEnabled,
            securityAuditExportEnabled: settings.securityAuditExportEnabled,
            securityRequireApprovalForPurge: settings.securityRequireApprovalForPurge,
            securityAlertOnRiskEvents: settings.securityAlertOnRiskEvents,
            dataRetentionPolicy: settings.dataRetentionPolicy
          })}>
            Discard
          </Button>
          <Button disabled={!hasChanges} onClick={apply}>Apply changes</Button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsPanel;
