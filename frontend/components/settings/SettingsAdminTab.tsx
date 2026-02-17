import React, { useMemo, useState } from 'react';
import { MailPlus, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import Button from '../ui/Button';
import { OrgInvite, Organization, User as UserType } from '../../types';
import { dialogService } from '../../services/dialogService';

interface SettingsAdminTabProps {
  user: UserType;
  org: Organization | null;
  allUsers: UserType[];
  isProvisioning: boolean;
  setIsProvisioning: (value: boolean) => void;
  newUserName: string;
  setNewUserName: (value: string) => void;
  newUserFirstName: string;
  setNewUserFirstName: (value: string) => void;
  newUserLastName: string;
  setNewUserLastName: (value: string) => void;
  newUserEmail: string;
  setNewUserEmail: (value: string) => void;
  newUserRole: 'member' | 'admin';
  setNewUserRole: (value: 'member' | 'admin') => void;
  provisionError: string;
  handleProvision: (e: React.FormEvent) => void;
  seatPurchaseCount: number;
  setSeatPurchaseCount: (value: number) => void;
  handleBuyMoreSeats: () => void;
  editingUserId: string | null;
  editFirstNameValue: string;
  setEditFirstNameValue: (value: string) => void;
  editLastNameValue: string;
  setEditLastNameValue: (value: string) => void;
  editEmailValue: string;
  setEditEmailValue: (value: string) => void;
  handleCommitEdit: () => void;
  handleStartEdit: (targetUser: UserType) => void;
  handleUpdateUserRole: (userId: string, role: 'admin' | 'member') => void;
  handlePurgeUser: (userId: string) => void;
  invites: OrgInvite[];
  newInviteIdentifier: string;
  setNewInviteIdentifier: (value: string) => void;
  newInviteRole: 'member' | 'admin';
  setNewInviteRole: (value: 'member' | 'admin') => void;
  handleCreateInvite: () => void;
  handleRevokeInvite: (inviteId: string) => void;
  aiUsageRows: Array<{
    id: string;
    orgId: string;
    dayKey: string;
    requestsUsed: number;
    tokensUsed: number;
    warningIssuedAt?: string | null;
    blockedAt?: string | null;
  }>;
  onRefreshAiUsage: () => Promise<void>;
}

const SettingsAdminTab: React.FC<SettingsAdminTabProps> = ({
  user,
  org,
  allUsers,
  isProvisioning,
  setIsProvisioning,
  newUserName,
  setNewUserName,
  newUserFirstName,
  setNewUserFirstName,
  newUserLastName,
  setNewUserLastName,
  newUserEmail,
  setNewUserEmail,
  newUserRole,
  setNewUserRole,
  provisionError,
  handleProvision,
  seatPurchaseCount,
  setSeatPurchaseCount,
  handleBuyMoreSeats,
  editingUserId,
  editFirstNameValue,
  setEditFirstNameValue,
  editLastNameValue,
  setEditLastNameValue,
  editEmailValue,
  setEditEmailValue,
  handleCommitEdit,
  handleStartEdit,
  handleUpdateUserRole,
  handlePurgeUser,
  invites,
  newInviteIdentifier,
  setNewInviteIdentifier,
  newInviteRole,
  setNewInviteRole,
  handleCreateInvite,
  handleRevokeInvite,
  aiUsageRows,
  onRefreshAiUsage
}) => {
  const [userSearch, setUserSearch] = useState('');
  const isFreePlan = (org?.plan || 'basic') === 'free';
  const seatLimit = Math.max(1, org?.totalSeats || 1);
  const usedSeats = allUsers.length;
  const planLabel = (org?.plan || 'basic').toUpperCase();
  const canShowUpgrade = (org?.plan || 'basic') !== 'pro';
  const seatLabel = org?.seatPrice ? `$${org.seatPrice} per seat / month` : 'Free plan';

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((member) =>
      `${member.firstName || ''} ${member.lastName || ''} ${member.displayName} ${member.email || ''} ${member.username}`.toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  const activeInvites = useMemo(
    () => invites.filter((invite) => !invite.revoked && invite.expiresAt > Date.now() && (invite.maxUses || 1) > invite.usedCount),
    [invites]
  );

  const getNameParts = (member: UserType) => {
    const displayParts = (member.displayName || '').trim().split(/\s+/).filter(Boolean);
    return {
      firstName: member.firstName || displayParts[0] || '-',
      lastName: member.lastName || displayParts.slice(1).join(' ') || '-'
    };
  };

  const handleOpenProvisionPanel = () => setIsProvisioning(true);

  const handleCloseProvisionPanel = () => {
    setIsProvisioning(false);
    setNewUserName('');
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserEmail('');
    setNewUserRole('member');
  };

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayUsage = aiUsageRows.find((row) => row.dayKey === todayKey) || null;
  const requestLimit = Math.max(1, org?.aiDailyRequestLimit || 10);
  const tokenLimit = Math.max(1, org?.aiDailyTokenLimit || 4000);
  const requestUsed = todayUsage?.requestsUsed || 0;
  const tokenUsed = todayUsage?.tokensUsed || 0;
  const requestPercent = Math.min(100, Math.round((requestUsed / requestLimit) * 100));
  const tokenPercent = Math.min(100, Math.round((tokenUsed / tokenLimit) * 100));
  const requestTone = requestPercent >= 100 ? 'bg-rose-500' : requestPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  const tokenTone = tokenPercent >= 100 ? 'bg-rose-500' : tokenPercent >= 80 ? 'bg-amber-500' : 'bg-indigo-500';

  return (
    <div className="relative space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Licensed users for {org?.name || 'this workspace'}.</p>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-2">
              <p className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4" /> {planLabel}
              </p>
              {canShowUpgrade ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dialogService.notice('Contact sales to upgrade plan and increase default license capacity.', { title: 'Upgrade plan' })}
                >
                  Upgrade
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <p className="text-xs text-slate-700">
            {isFreePlan ? (
              <>
                <span className="font-semibold text-slate-900">{usedSeats}</span> / <span className="font-semibold text-slate-900">{seatLimit}</span> seats used
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-900">{usedSeats}</span> active licensed users
              </>
            )}
          </p>
          <span className="inline-flex h-7.5 items-center rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600">
            {isFreePlan ? seatLabel : 'Unlimited seats on this plan'}
          </span>
          <Button size="sm" variant="outline" onClick={handleOpenProvisionPanel}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add user
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold tracking-tight text-slate-900">AI usage</p>
          <Button size="sm" variant="outline" onClick={onRefreshAiUsage}>Refresh</Button>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">Daily quota for this workspace.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] font-medium text-slate-500">Requests</p>
            <p className="text-sm font-semibold text-slate-900">{requestUsed} / {requestLimit}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full ${requestTone}`} style={{ width: `${requestPercent}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] font-medium text-slate-500">Tokens</p>
            <p className="text-sm font-semibold text-slate-900">{tokenUsed} / {tokenLimit}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full ${tokenTone}`} style={{ width: `${tokenPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          {todayUsage?.warningIssuedAt ? (
            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">Warning issued</span>
          ) : null}
          {todayUsage?.blockedAt ? (
            <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-rose-700">Blocked until daily reset</span>
          ) : (
            <span>Resets daily at 00:00 UTC.</span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold tracking-tight text-slate-900">Licensed users</p>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="relative w-full sm:w-[280px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search first/last/email/username"
                className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>
            <Button size="sm" variant="outline" onClick={handleOpenProvisionPanel}>
              <Users className="mr-1.5 h-3.5 w-3.5" /> Add user
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[560px] md:min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Licensed</th>
                <th className="px-2 py-1.5">User</th>
                <th className="px-2 py-1.5">Role</th>
                <th className="px-2 py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((member) => {
                const { firstName, lastName } = getNameParts(member);
                const isEditing = editingUserId === member.id;
                return (
                  <tr key={member.id} className="border-t border-slate-200 align-top">
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Yes</span>
                        <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">Active</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <div className="grid gap-1.5 sm:grid-cols-3">
                          <input
                            autoFocus
                            value={editFirstNameValue}
                            onChange={(event) => setEditFirstNameValue(event.target.value)}
                            placeholder="First"
                            className="h-7 w-full rounded-md border border-slate-300 px-2 text-xs outline-none"
                          />
                          <input
                            value={editLastNameValue}
                            onChange={(event) => setEditLastNameValue(event.target.value)}
                            placeholder="Last"
                            className="h-7 w-full rounded-md border border-slate-300 px-2 text-xs outline-none"
                          />
                          <input
                            value={editEmailValue}
                            onChange={(event) => setEditEmailValue(event.target.value)}
                            placeholder="Email"
                            onKeyDown={(event) => event.key === 'Enter' && handleCommitEdit()}
                            className="h-7 w-full rounded-md border border-slate-300 px-2 text-xs outline-none"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-slate-900">{firstName} {lastName}{member.id === user.id ? ' (You)' : ''}</p>
                          <p className="text-[11px] text-slate-500">{member.email || '-'}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={member.role || 'member'}
                        onChange={(event) => handleUpdateUserRole(member.id, event.target.value as 'admin' | 'member')}
                        disabled={member.id === user.id}
                        className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none disabled:opacity-40"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        {member.id === user.id ? (
                          <span className="text-[11px] text-slate-400">Current user</span>
                        ) : (
                          <>
                            {!isEditing ? (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(member)}
                                className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleCommitEdit}
                                className="inline-flex h-7 items-center rounded-md border border-slate-800 bg-slate-800 px-2.5 text-[11px] font-medium text-white hover:bg-slate-900"
                              >
                                Save
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handlePurgeUser(member.id)}
                              className="inline-flex h-7 items-center rounded-md border border-rose-200 bg-white px-2.5 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="flex items-center gap-1.5">
          <MailPlus className="h-3.5 w-3.5 text-slate-500" />
          <p className="text-sm font-semibold tracking-tight text-slate-900">Invite others</p>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">Create single-use tokens to join this workspace.</p>

        <div className="mt-2 grid gap-1.5 md:grid-cols-[1fr_140px_auto]">
          <input
            placeholder="Emails (comma-separated)"
            value={newInviteIdentifier}
            onChange={(event) => setNewInviteIdentifier(event.target.value)}
            className="h-7.5 rounded-md border border-slate-300 px-2 text-xs outline-none"
          />
          <select
            value={newInviteRole}
            onChange={(event) => setNewInviteRole(event.target.value as 'member' | 'admin')}
            className="h-7.5 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <Button size="sm" onClick={handleCreateInvite}>Create invite</Button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs font-semibold tracking-tight text-slate-900">Pending invites</p>
          <p className="text-[11px] text-slate-500">{activeInvites.length}</p>
        </div>
        <div className="mt-1 max-h-28 overflow-x-auto overflow-y-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[560px] md:min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Identifier</th>
                <th className="px-2 py-1.5">Role</th>
                <th className="px-2 py-1.5">Expiry Date</th>
                <th className="px-2 py-1.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeInvites.length === 0 ? (
                <tr>
                  <td className="px-2 py-2 text-xs text-slate-500" colSpan={4}>No pending invites.</td>
                </tr>
              ) : activeInvites.map((invite) => (
                <tr key={invite.id} className="border-t border-slate-200">
                  <td className="px-2 py-1.5 text-xs">{invite.invitedIdentifier || invite.token}</td>
                  <td className="px-2 py-1.5 text-xs capitalize">{invite.role}</td>
                  <td className="px-2 py-1.5 text-xs">{new Date(invite.expiresAt).toLocaleDateString()}</td>
                  <td className="px-2 py-1.5">
                    <Button size="sm" variant="outline" onClick={() => handleRevokeInvite(invite.id)}>Cancel</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isProvisioning ? (
        <div className="absolute inset-0 z-10 rounded-xl bg-slate-900/10 backdrop-blur-[1px]">
          <aside className="ml-auto flex h-full w-full max-w-md flex-col rounded-l-xl border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Add user</p>
                <p className="text-xs text-slate-500">Create a licensed user in this workspace.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseProvisionPanel}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProvision} className="flex-1 space-y-4 overflow-y-auto p-4">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Details</p>
                <p className="mt-1 text-xs text-slate-500">Set identity, access level, and license source.</p>
              </section>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">First name</span>
                <input
                  autoFocus
                  placeholder="e.g. John"
                  value={newUserFirstName}
                  onChange={(event) => setNewUserFirstName(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last name</span>
                <input
                  placeholder="e.g. Doe"
                  value={newUserLastName}
                  onChange={(event) => setNewUserLastName(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Username</span>
                <input
                  placeholder="e.g. john"
                  value={newUserName}
                  onChange={(event) => setNewUserName(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</span>
                <input
                  type="email"
                  placeholder="e.g. john@company.com"
                  value={newUserEmail}
                  onChange={(event) => setNewUserEmail(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Role</span>
                <select
                  value={newUserRole}
                  onChange={(event) => setNewUserRole(event.target.value as 'member' | 'admin')}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">License</span>
                <input
                  value={`${planLabel} (workspace plan)`}
                  readOnly
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600"
                />
              </label>

              {provisionError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{provisionError}</p> : null}

              <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white pt-3">
                <Button type="button" size="sm" variant="outline" onClick={handleCloseProvisionPanel}>Cancel</Button>
                <Button type="submit" size="sm">Create user</Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default SettingsAdminTab;
