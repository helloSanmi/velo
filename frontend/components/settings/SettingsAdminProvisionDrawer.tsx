import React from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import AppSelect from '../ui/AppSelect';

interface SettingsAdminProvisionDrawerProps {
  open: boolean;
  newUserFirstName: string;
  newUserLastName: string;
  newUserName: string;
  newUserEmail: string;
  newUserRole: 'member' | 'admin';
  newUserTempPassword: string;
  provisionError: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  setNewUserFirstName: (value: string) => void;
  setNewUserLastName: (value: string) => void;
  setNewUserName: (value: string) => void;
  setNewUserEmail: (value: string) => void;
  setNewUserRole: (value: 'member' | 'admin') => void;
  setNewUserTempPassword: (value: string) => void;
}

const SettingsAdminProvisionDrawer: React.FC<SettingsAdminProvisionDrawerProps> = (props) => {
  if (!props.open) return null;
  return (
    <div className="absolute inset-0 z-10 rounded-xl bg-slate-900/10 backdrop-blur-[1px]">
      <aside className="ml-auto flex h-full w-full max-w-md flex-col rounded-l-xl border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div><p className="text-sm font-semibold text-slate-900">Add user</p><p className="text-xs text-slate-500">Create a licensed user in this workspace.</p></div>
          <button type="button" onClick={props.onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={props.onSubmit} className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block space-y-1.5"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">First name</span><input autoFocus placeholder="e.g. John" value={props.newUserFirstName} onChange={(event) => props.setNewUserFirstName(event.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400" /></label>
          <label className="block space-y-1.5"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last name</span><input placeholder="e.g. Doe" value={props.newUserLastName} onChange={(event) => props.setNewUserLastName(event.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400" /></label>
          <label className="block space-y-1.5"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Username</span><input placeholder="e.g. john" value={props.newUserName} onChange={(event) => props.setNewUserName(event.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400" /></label>
          <label className="block space-y-1.5"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</span><input type="email" placeholder="e.g. john@company.com" value={props.newUserEmail} onChange={(event) => props.setNewUserEmail(event.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400" /></label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Role</span>
            <AppSelect
              value={props.newUserRole}
              onChange={(value) => props.setNewUserRole(value as 'member' | 'admin')}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              options={[
                { value: 'member', label: 'Member' },
                { value: 'admin', label: 'Admin' }
              ]}
            />
          </label>
          <label className="block space-y-1.5"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Temporary password</span><input value={props.newUserTempPassword} onChange={(event) => props.setNewUserTempPassword(event.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400" /><p className="text-[11px] text-slate-500">User must change this password at first sign-in.</p></label>
          {props.provisionError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{props.provisionError}</p> : null}
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white pt-3"><Button type="button" size="sm" variant="outline" onClick={props.onClose}>Cancel</Button><Button type="submit" size="sm">Create user</Button></div>
        </form>
      </aside>
    </div>
  );
};

export default SettingsAdminProvisionDrawer;
