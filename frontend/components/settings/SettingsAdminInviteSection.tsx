import React from 'react';
import { Copy, MailPlus, RefreshCcw } from 'lucide-react';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';
import { OrgInvite } from '../../types';
import { UserSettings } from '../../services/settingsService';

interface SettingsAdminInviteSectionProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  inviteExpanded: boolean;
  activeInvites: OrgInvite[];
  newInviteIdentifier: string;
  newInviteRole: 'member' | 'admin';
  setInviteExpanded: (value: boolean) => void;
  setNewInviteIdentifier: (value: string) => void;
  setNewInviteRole: (value: 'member' | 'admin') => void;
  handleCreateInvite: () => void;
  handleRevokeInvite: (inviteId: string) => void;
  handleResendInvite: (inviteId: string) => void;
}

const formatDeliveryStatus = (invite: OrgInvite): { label: string; tone: string } => {
  const status = (invite.deliveryStatus || 'pending').toLowerCase();
  if (status === 'sent') return { label: 'Sent', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (status === 'failed') return { label: 'Failed', tone: 'text-rose-700 bg-rose-50 border-rose-200' };
  if (status === 'not_configured') return { label: 'Not configured', tone: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { label: 'Pending', tone: 'text-slate-700 bg-slate-100 border-slate-200' };
};

const toggleClass = (active: boolean) => `w-11 h-6 rounded-full p-1 transition-colors ${active ? 'bg-slate-900' : 'bg-slate-300'}`;
const thumbClass = (active: boolean) => `block h-4 w-4 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`;

const SettingsAdminInviteSection: React.FC<SettingsAdminInviteSectionProps> = (props) => (
  <>
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold tracking-tight text-slate-900">Invite policy</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-700">Allowed email domains</span>
          <input value={props.settings.securityAllowedEmailDomains} onChange={(event) => props.onUpdateSettings({ securityAllowedEmailDomains: event.target.value })} placeholder="example.com, partner.org" className="h-7 w-[240px] rounded-md border border-slate-300 bg-white px-2 text-xs outline-none" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-700">Invite expiry</span>
          <div className="w-[110px]">
            <AppSelect
              value={String(props.settings.securityInviteExpiryDays)}
              onChange={(value) => props.onUpdateSettings({ securityInviteExpiryDays: Number(value) as UserSettings['securityInviteExpiryDays'] })}
              className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs"
              options={[
                { value: '1', label: '1 day' },
                { value: '3', label: '3 days' },
                { value: '7', label: '7 days' },
                { value: '14', label: '14 days' },
                { value: '30', label: '30 days' }
              ]}
            />
          </div>
        </div>
        <div className="inline-flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-700">Require admin approval</span>
          <button type="button" onClick={() => props.onUpdateSettings({ securityInviteRequireAdminApproval: !props.settings.securityInviteRequireAdminApproval })} className={toggleClass(props.settings.securityInviteRequireAdminApproval)}><span className={thumbClass(props.settings.securityInviteRequireAdminApproval)} /></button>
        </div>
      </div>
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5"><MailPlus className="h-3.5 w-3.5 text-slate-500" /><p className="text-sm font-semibold tracking-tight text-slate-900">Quick invite</p></div>
        <button type="button" onClick={() => props.setInviteExpanded(!props.inviteExpanded)} className="text-xs text-slate-600 hover:text-slate-900">{props.inviteExpanded ? 'Hide' : 'Show'}</button>
      </div>
      {props.inviteExpanded ? (
        <div className="mt-2 space-y-2">
          <div className="grid gap-1.5 md:grid-cols-[1fr_140px_auto]">
            <input placeholder="Work email (name@company.com)" value={props.newInviteIdentifier} onChange={(event) => props.setNewInviteIdentifier(event.target.value)} className="h-7.5 rounded-md border border-slate-300 px-2 text-xs outline-none" />
            <AppSelect
              value={props.newInviteRole}
              onChange={(value) => props.setNewInviteRole(value as 'member' | 'admin')}
              className="h-7.5 rounded-md border border-slate-300 bg-white px-2 text-xs"
              options={[
                { value: 'member', label: 'Member' },
                { value: 'admin', label: 'Admin' }
              ]}
            />
            <Button size="sm" onClick={props.handleCreateInvite}>Create invite</Button>
          </div>
          {props.activeInvites.slice(0, 3).map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]">
              <div className="min-w-0">
                <div className="truncate">{invite.invitedIdentifier || invite.token}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] ${formatDeliveryStatus(invite).tone}`}>{formatDeliveryStatus(invite).label}</span>
                  {invite.deliveryError ? <span className="truncate text-[10px] text-rose-700">{invite.deliveryError}</span> : null}
                </div>
              </div>
              <div className="ml-2 inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/?invite=${encodeURIComponent(invite.token)}`;
                    navigator.clipboard.writeText(link).catch(() => undefined);
                  }}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
                  title="Copy invite link"
                >
                  <Copy className="h-3 w-3" /> Copy link
                </button>
                <button type="button" onClick={() => props.handleResendInvite(invite.id)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900" title="Resend invite email">
                  <RefreshCcw className="h-3 w-3" /> Resend
                </button>
                <button type="button" onClick={() => props.handleRevokeInvite(invite.id)} className="text-rose-700 hover:text-rose-800">Revoke</button>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="mt-1 text-[11px] text-slate-500">{props.activeInvites.length} active invite{props.activeInvites.length === 1 ? '' : 's'}.</p>}
    </div>
  </>
);

export default SettingsAdminInviteSection;
