import React, { useMemo, useState } from 'react';
import { OrgInvite, Organization, User as UserType } from '../../types';
import { UserSettings } from '../../services/settingsService';
import SettingsAdminInviteSection from './SettingsAdminInviteSection';
import SettingsTicketNotificationPolicySection from './SettingsTicketNotificationPolicySection';

interface SettingsPolicyTabProps {
  user: UserType;
  org: Organization | null;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  invites: OrgInvite[];
  newInviteIdentifier: string;
  newInviteRole: 'member' | 'admin';
  setNewInviteIdentifier: (value: string) => void;
  setNewInviteRole: (value: 'member' | 'admin') => void;
  handleCreateInvite: () => void;
  handleRevokeInvite: (inviteId: string) => void;
  handleResendInvite: (inviteId: string) => void;
  onUpdateOrganizationSettings: (
    patch: Partial<Pick<Organization, 'notificationSenderEmail'>>
  ) => Promise<void>;
}

const SettingsPolicyTab: React.FC<SettingsPolicyTabProps> = ({
  user,
  org,
  settings,
  onUpdateSettings,
  invites,
  newInviteIdentifier,
  newInviteRole,
  setNewInviteIdentifier,
  setNewInviteRole,
  handleCreateInvite,
  handleRevokeInvite,
  handleResendInvite,
  onUpdateOrganizationSettings
}) => {
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const activeInvites = useMemo(
    () => invites.filter((invite) => !invite.revoked && invite.expiresAt > Date.now() && (invite.maxUses || 1) > invite.usedCount),
    [invites]
  );

  if (user.role !== 'admin') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Only admins can manage workspace policies.
      </div>
    );
  }

  if (!org) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Workspace policy data is unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SettingsAdminInviteSection
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        inviteExpanded={inviteExpanded}
        activeInvites={activeInvites}
        newInviteIdentifier={newInviteIdentifier}
        newInviteRole={newInviteRole}
        setInviteExpanded={setInviteExpanded}
        setNewInviteIdentifier={setNewInviteIdentifier}
        setNewInviteRole={setNewInviteRole}
        handleCreateInvite={handleCreateInvite}
        handleRevokeInvite={handleRevokeInvite}
        handleResendInvite={handleResendInvite}
      />
      <SettingsTicketNotificationPolicySection
        org={org}
        onUpdateOrganizationSettings={onUpdateOrganizationSettings}
      />
    </div>
  );
};

export default SettingsPolicyTab;
