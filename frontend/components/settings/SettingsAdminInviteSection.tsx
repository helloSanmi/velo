import React from 'react';
import { MailPlus } from 'lucide-react';
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
}

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
            <input placeholder="Emails (comma-separated)" value={props.newInviteIdentifier} onChange={(event) => props.setNewInviteIdentifier(event.target.value)} className="h-7.5 rounded-md border border-slate-300 px-2 text-xs outline-none" />
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
              <span>{invite.invitedIdentifier || invite.token}</span>
              <button type="button" onClick={() => props.handleRevokeInvite(invite.id)} className="text-rose-700 hover:text-rose-800">Revoke</button>
            </div>
          ))}
        </div>
      ) : <p className="mt-1 text-[11px] text-slate-500">{props.activeInvites.length} active invite{props.activeInvites.length === 1 ? '' : 's'}.</p>}
    </div>
  </>
);

export default SettingsAdminInviteSection;
