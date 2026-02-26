import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { OrgInvite, Organization, User as UserType } from '../../types';
import { userService } from '../../services/userService';
import { UserSettings } from '../../services/settingsService';
import SettingsAdminHeaderCard from './SettingsAdminHeaderCard';
import SettingsAdminUsersSection from './SettingsAdminUsersSection';
import SettingsAdminInviteSection from './SettingsAdminInviteSection';
import SettingsAdminProvisionDrawer from './SettingsAdminProvisionDrawer';
import SettingsTicketNotificationPolicySection from './SettingsTicketNotificationPolicySection';

interface SettingsAdminTabProps {
  user: UserType; org: Organization | null; allUsers: UserType[]; isProvisioning: boolean; setIsProvisioning: (value: boolean) => void;
  newUserName: string; setNewUserName: (value: string) => void; newUserFirstName: string; setNewUserFirstName: (value: string) => void;
  newUserLastName: string; setNewUserLastName: (value: string) => void; newUserEmail: string; setNewUserEmail: (value: string) => void;
  newUserRole: 'member' | 'admin'; setNewUserRole: (value: 'member' | 'admin') => void; newUserTempPassword: string; setNewUserTempPassword: (value: string) => void;
  provisionError: string; handleProvision: (e: React.FormEvent) => void; seatPurchaseCount: number; setSeatPurchaseCount: (value: number) => void; handleBuyMoreSeats: () => void;
  editingUserId: string | null; editFirstNameValue: string; setEditFirstNameValue: (value: string) => void; editLastNameValue: string; setEditLastNameValue: (value: string) => void; editEmailValue: string; setEditEmailValue: (value: string) => void;
  handleCommitEdit: () => void; handleStartEdit: (targetUser: UserType) => void; handleUpdateUserRole: (userId: string, role: 'admin' | 'member') => void; handlePurgeUser: (userId: string) => void;
  invites: OrgInvite[]; newInviteIdentifier: string; setNewInviteIdentifier: (value: string) => void; newInviteRole: 'member' | 'admin'; setNewInviteRole: (value: 'member' | 'admin') => void;
  handleCreateInvite: () => void; handleRevokeInvite: (inviteId: string) => void; handleResendInvite: (inviteId: string) => void; onRefreshWorkspaceUsers: () => Promise<void>;
  aiUsageRows: Array<{ id: string; orgId: string; dayKey: string; requestsUsed: number; tokensUsed: number; warningIssuedAt?: string | null; blockedAt?: string | null }>;
  onRefreshAiUsage: () => Promise<void>;
  onUpdateOrganizationSettings: (patch: Partial<Pick<Organization, 'loginSubdomain' | 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected'>>) => Promise<void>;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
}

type DirectoryEntry = { externalId: string; email: string; displayName: string; provider: 'microsoft'; firstName?: string; lastName?: string };
type Row = { key: string; source: 'workspace'; displayName: string; email: string; role: 'admin' | 'member' | 'guest'; licensed: boolean; member: UserType } | { key: string; source: 'directory'; provider: 'microsoft'; displayName: string; email: string; licensed: false; entry: DirectoryEntry };

const SettingsAdminTab: React.FC<SettingsAdminTabProps> = (p) => {
  const [userSearch, setUserSearch] = useState(''); const [peopleExpanded, setPeopleExpanded] = useState(true); const [inviteExpanded, setInviteExpanded] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false); const [directoryUsers, setDirectoryUsers] = useState<DirectoryEntry[]>([]); const [directoryError, setDirectoryError] = useState('');
  const directoryCacheKey = p.org ? `velo_directory_cache_${p.org.id}` : 'velo_directory_cache';
  const isFreePlan = (p.org?.plan || 'basic') === 'free'; const planLabel = (p.org?.plan || 'basic').toUpperCase(); const seatLimit = Math.max(1, p.org?.totalSeats || 1);
  const usedSeats = p.allUsers.filter((member) => member.licenseActive !== false).length; const availableSeats = Math.max(0, seatLimit - usedSeats); const canShowUpgrade = (p.org?.plan || 'basic') !== 'pro';
  const usersByEmail = useMemo(() => p.allUsers.reduce<Record<string, UserType>>((acc, member) => { if (member.email) acc[member.email.toLowerCase()] = member; return acc; }, {}), [p.allUsers]);
  const rows = useMemo<Row[]>(() => ([...p.allUsers.map((member) => ({ key: `usr:${member.id}`, source: 'workspace' as const, displayName: member.displayName, email: member.email || '', role: (member.role || 'member') as 'admin' | 'member' | 'guest', licensed: member.licenseActive !== false, member })), ...directoryUsers.filter((entry) => !usersByEmail[entry.email.toLowerCase()]).map((entry) => ({ key: `dir:${entry.email.toLowerCase()}`, source: 'directory' as const, provider: entry.provider, displayName: entry.displayName, email: entry.email, licensed: false as const, entry }))]), [p.allUsers, directoryUsers, usersByEmail]);
  const filteredRows = useMemo(() => { const q = userSearch.trim().toLowerCase(); return q ? rows.filter((row) => `${row.displayName} ${row.email}`.toLowerCase().includes(q)) : rows; }, [rows, userSearch]);

  const mergeDirectoryUsers = useCallback((provider: 'microsoft', entries: DirectoryEntry[]) => {
    setDirectoryUsers((prev) => {
      const next = [...prev]; const indexByEmail = new Map(next.map((entry, index) => [entry.email.toLowerCase(), index]));
      for (const entry of entries) { const key = entry.email.toLowerCase(); const index = indexByEmail.get(key); if (index === undefined) { indexByEmail.set(key, next.length); next.push(entry); } else next[index] = entry; }
      try { localStorage.setItem(directoryCacheKey, JSON.stringify({ provider, users: next, updatedAt: Date.now() })); } catch {}
      return next;
    });
  }, [directoryCacheKey]);

  const handleSyncDirectory = useCallback(async (provider: 'microsoft') => {
    if (provider === 'microsoft' && !p.org?.microsoftWorkspaceConnected) return setDirectoryError('Microsoft is not connected in Integrations.');
    setDirectoryLoading(true); setDirectoryError('');
    try {
      let result = await userService.startDirectoryImport(provider);
      if (!result.success && result.code === 'SSO_RECONNECT_REQUIRED' && p.org?.loginSubdomain) {
        const reconnect = await userService.connectWorkspaceProvider(provider, `${p.org.loginSubdomain}.velo.ai`);
        if (!reconnect.success) return setDirectoryError(reconnect.error || 'Could not reconnect Microsoft directory access.');
        await p.onUpdateOrganizationSettings({ microsoftWorkspaceConnected: reconnect.microsoftConnected, allowMicrosoftAuth: reconnect.microsoftAllowed });
        result = await userService.startDirectoryImport(provider);
      }
      if (!result.success || !result.users) return setDirectoryError(result.error || 'Could not sync directory.');
      const seen = new Set<string>();
      const unique = result.users.filter((entry) => (seen.has(entry.email.toLowerCase()) ? false : (seen.add(entry.email.toLowerCase()), true))).map((entry) => ({ ...entry, provider }));
      mergeDirectoryUsers(provider, unique);
    } finally { setDirectoryLoading(false); }
  }, [mergeDirectoryUsers, p]);

  useEffect(() => {
    if (!p.org) return;
    try { const raw = localStorage.getItem(directoryCacheKey); if (!raw) return; const parsed = JSON.parse(raw) as { users?: DirectoryEntry[] }; if (Array.isArray(parsed.users)) setDirectoryUsers(parsed.users); } catch {}
  }, [directoryCacheKey, p.org]);

  const handleLicenseRow = async (row: Row) => {
    if (!p.org) return; setDirectoryError('');
    if (row.source === 'workspace') { const result = await userService.updateUserLicenseRemote(p.org.id, row.member.id, true); if (!result.success) return setDirectoryError(result.error || 'Could not assign license.'); return p.onRefreshWorkspaceUsers(); }
    const result = await userService.importDirectoryUsers(p.org.id, row.provider, [{ email: row.entry.email, displayName: row.entry.displayName, firstName: row.entry.firstName, lastName: row.entry.lastName }]);
    if (!result.success) return setDirectoryError(result.error || 'Could not assign license.');
    await p.onRefreshWorkspaceUsers();
  };
  const handleUnlicenseUser = async (member: UserType) => { if (!p.org) return; const result = await userService.updateUserLicenseRemote(p.org.id, member.id, false); if (!result.success) return setDirectoryError(result.error || 'Could not remove license.'); await p.onRefreshWorkspaceUsers(); };
  const activeInvites = useMemo(() => p.invites.filter((invite) => !invite.revoked && invite.expiresAt > Date.now() && (invite.maxUses || 1) > invite.usedCount), [p.invites]);
  const closeProvision = () => { p.setIsProvisioning(false); p.setNewUserName(''); p.setNewUserFirstName(''); p.setNewUserLastName(''); p.setNewUserEmail(''); p.setNewUserRole('member'); };

  const _unused = { editingUserId: p.editingUserId, editFirstNameValue: p.editFirstNameValue, setEditFirstNameValue: p.setEditFirstNameValue, editLastNameValue: p.editLastNameValue, setEditLastNameValue: p.setEditLastNameValue, editEmailValue: p.editEmailValue, setEditEmailValue: p.setEditEmailValue, handleCommitEdit: p.handleCommitEdit, handleStartEdit: p.handleStartEdit, aiUsageRows: p.aiUsageRows, onRefreshAiUsage: p.onRefreshAiUsage };
  void _unused;

  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
      <SettingsAdminHeaderCard planLabel={planLabel} isFreePlan={isFreePlan} seatLimit={seatLimit} usedSeats={usedSeats} availableSeats={availableSeats} canShowUpgrade={canShowUpgrade} seatPurchaseCount={p.seatPurchaseCount} setSeatPurchaseCount={p.setSeatPurchaseCount} handleBuyMoreSeats={p.handleBuyMoreSeats} onOpenProvisionPanel={() => p.setIsProvisioning(true)} />
      <SettingsAdminUsersSection
        org={p.org}
        directoryLoading={directoryLoading}
        directoryError={directoryError}
        peopleExpanded={peopleExpanded}
        userSearch={userSearch}
        filteredRows={filteredRows}
        currentUserId={p.user.id}
        onTogglePeopleExpanded={() => setPeopleExpanded((prev) => !prev)}
        onUserSearchChange={setUserSearch}
        onSyncDirectory={handleSyncDirectory}
        onUpdateUserRole={p.handleUpdateUserRole}
        onUnlicense={handleUnlicenseUser}
        onLicenseRow={handleLicenseRow}
        onRemoveUser={p.handlePurgeUser}
      />
      {p.org ? <SettingsTicketNotificationPolicySection orgId={p.org.id} /> : null}
      <SettingsAdminInviteSection
        settings={p.settings}
        onUpdateSettings={p.onUpdateSettings}
        inviteExpanded={inviteExpanded}
        activeInvites={activeInvites}
        newInviteIdentifier={p.newInviteIdentifier}
        newInviteRole={p.newInviteRole}
        setInviteExpanded={setInviteExpanded}
        setNewInviteIdentifier={p.setNewInviteIdentifier}
        setNewInviteRole={p.setNewInviteRole}
        handleCreateInvite={p.handleCreateInvite}
        handleRevokeInvite={p.handleRevokeInvite}
        handleResendInvite={p.handleResendInvite}
      />
      <SettingsAdminProvisionDrawer
        open={p.isProvisioning}
        newUserFirstName={p.newUserFirstName}
        newUserLastName={p.newUserLastName}
        newUserName={p.newUserName}
        newUserEmail={p.newUserEmail}
        newUserRole={p.newUserRole}
        newUserTempPassword={p.newUserTempPassword}
        provisionError={p.provisionError}
        onClose={closeProvision}
        onSubmit={p.handleProvision}
        setNewUserFirstName={p.setNewUserFirstName}
        setNewUserLastName={p.setNewUserLastName}
        setNewUserName={p.setNewUserName}
        setNewUserEmail={p.setNewUserEmail}
        setNewUserRole={p.setNewUserRole}
        setNewUserTempPassword={p.setNewUserTempPassword}
      />
    </div>
  );
};

export default SettingsAdminTab;
