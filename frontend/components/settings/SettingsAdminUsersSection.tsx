import React from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { User as UserType } from '../../types';
import AppSelect from '../ui/AppSelect';

type Row =
  | { key: string; source: 'workspace'; displayName: string; email: string; role: 'admin' | 'member' | 'guest'; licensed: boolean; member: UserType }
  | { key: string; source: 'directory'; provider: 'google' | 'microsoft'; displayName: string; email: string; licensed: false; entry: { email: string; displayName: string; firstName?: string; lastName?: string } };

interface SettingsAdminUsersSectionProps {
  org?: { googleWorkspaceConnected?: boolean; microsoftWorkspaceConnected?: boolean } | null;
  directoryLoading: boolean;
  directoryError: string;
  peopleExpanded: boolean;
  userSearch: string;
  filteredRows: Row[];
  currentUserId: string;
  onTogglePeopleExpanded: () => void;
  onUserSearchChange: (value: string) => void;
  onSyncDirectory: (provider: 'google' | 'microsoft') => void;
  onUpdateUserRole: (userId: string, role: 'admin' | 'member') => void;
  onUnlicense: (member: UserType) => void;
  onLicenseRow: (row: Row) => void;
  onRemoveUser: (userId: string) => void;
}

const SettingsAdminUsersSection: React.FC<SettingsAdminUsersSectionProps> = (props) => (
  <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold tracking-tight text-slate-900">Users</p>
      <div className="flex items-center gap-2">
        {props.org?.googleWorkspaceConnected ? <button type="button" onClick={() => props.onSyncDirectory('google')} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> Google</button> : null}
        {props.org?.microsoftWorkspaceConnected ? <button type="button" onClick={() => props.onSyncDirectory('microsoft')} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> Microsoft</button> : null}
        {props.directoryLoading ? <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing directory…</span> : null}
        <button type="button" onClick={props.onTogglePeopleExpanded} className="text-xs text-slate-600 hover:text-slate-900">{props.peopleExpanded ? 'Hide' : 'Show'}</button>
      </div>
    </div>
    {props.peopleExpanded ? (
      <>
        <label className="relative block"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={props.userSearch} onChange={(event) => props.onUserSearchChange(event.target.value)} placeholder="Search users" className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-700 outline-none" /></label>
        {props.directoryError ? <p className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{props.directoryError}</p> : null}
        <div className="h-[420px] overflow-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-2 py-1.5">User</th><th className="px-2 py-1.5">Source</th><th className="px-2 py-1.5">Role</th><th className="px-2 py-1.5">License</th><th className="px-2 py-1.5">Actions</th></tr></thead>
            <tbody>
              {props.filteredRows.map((row) => (
                <tr key={row.key} className="border-t border-slate-200">
                  <td className="px-2 py-1.5"><p className="font-medium text-slate-900">{row.displayName}{row.source === 'workspace' && row.member.id === props.currentUserId ? ' (You)' : ''}</p><p className="text-[11px] text-slate-500">{row.email || '-'}</p></td>
                  <td className="px-2 py-1.5"><span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700">{row.source === 'workspace' ? 'Workspace' : row.provider === 'google' ? 'Google directory' : 'Microsoft directory'}</span></td>
                  <td className="px-2 py-1.5">
                    {row.source === 'workspace' ? (
                      <AppSelect
                        value={row.role}
                        onChange={(value) => props.onUpdateUserRole(row.member.id, value as 'admin' | 'member')}
                        disabled={row.member.id === props.currentUserId}
                        className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs"
                        options={[
                          { value: 'member', label: 'Member' },
                          { value: 'admin', label: 'Admin' }
                        ]}
                      />
                    ) : <span className="text-[11px] text-slate-400">-</span>}
                  </td>
                  <td className="px-2 py-1.5"><span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${row.licensed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{row.licensed ? 'Licensed' : 'Unlicensed'}</span></td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {row.licensed ? <button type="button" onClick={() => row.source === 'workspace' ? props.onUnlicense(row.member) : undefined} className="h-7 rounded-md border border-amber-200 bg-white px-2 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40" disabled={row.source !== 'workspace' || row.member.id === props.currentUserId}>Unlicense</button> : <button type="button" onClick={() => props.onLicenseRow(row)} className="h-7 rounded-md border border-slate-800 bg-slate-800 px-2 text-[11px] font-medium text-white hover:bg-slate-900">License</button>}
                      {row.source === 'workspace' && row.member.id !== props.currentUserId ? <button type="button" onClick={() => props.onRemoveUser(row.member.id)} className="h-7 rounded-md border border-rose-200 bg-white px-2 text-[11px] font-medium text-rose-700 hover:bg-rose-50">Remove</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ) : null}
  </div>
);

export default SettingsAdminUsersSection;
