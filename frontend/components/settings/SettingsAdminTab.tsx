import React from 'react';
import { Organization, User as UserType } from '../../types';
import SettingsAdminHeaderCard from './SettingsAdminHeaderCard';
import SettingsAdminUsersSection from './SettingsAdminUsersSection';
import SettingsAdminProvisionDrawer from './SettingsAdminProvisionDrawer';
import { useSettingsAdminTabController } from './useSettingsAdminTabController';

interface SettingsAdminTabProps {
  user: UserType; org: Organization | null; allUsers: UserType[]; isProvisioning: boolean; setIsProvisioning: (value: boolean) => void;
  newUserName: string; setNewUserName: (value: string) => void; newUserFirstName: string; setNewUserFirstName: (value: string) => void;
  newUserLastName: string; setNewUserLastName: (value: string) => void; newUserEmail: string; setNewUserEmail: (value: string) => void;
  newUserRole: 'member' | 'admin'; setNewUserRole: (value: 'member' | 'admin') => void; newUserTempPassword: string; setNewUserTempPassword: (value: string) => void;
  provisionError: string; handleProvision: (e: React.FormEvent) => void; seatPurchaseCount: number; setSeatPurchaseCount: (value: number) => void; handleBuyMoreSeats: () => void;
  editingUserId: string | null; editFirstNameValue: string; setEditFirstNameValue: (value: string) => void; editLastNameValue: string; setEditLastNameValue: (value: string) => void; editEmailValue: string; setEditEmailValue: (value: string) => void;
  handleCommitEdit: () => void; handleStartEdit: (targetUser: UserType) => void; handleUpdateUserRole: (userId: string, role: 'admin' | 'member') => void; handlePurgeUser: (userId: string) => void;
  onRefreshWorkspaceUsers: () => Promise<void>;
  aiUsageRows: Array<{ id: string; orgId: string; dayKey: string; requestsUsed: number; tokensUsed: number; warningIssuedAt?: string | null; blockedAt?: string | null }>;
  onRefreshAiUsage: () => Promise<void>;
  onUpdateOrganizationSettings: (patch: Partial<Pick<Organization, 'loginSubdomain' | 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected' | 'notificationSenderEmail'>>) => Promise<void>;
}

const SettingsAdminTab: React.FC<SettingsAdminTabProps> = (p) => {
  const controller = useSettingsAdminTabController({
    org: p.org,
    allUsers: p.allUsers,
    onRefreshWorkspaceUsers: p.onRefreshWorkspaceUsers,
    onUpdateOrganizationSettings: p.onUpdateOrganizationSettings,
    setIsProvisioning: p.setIsProvisioning,
    setNewUserName: p.setNewUserName,
    setNewUserFirstName: p.setNewUserFirstName,
    setNewUserLastName: p.setNewUserLastName,
    setNewUserEmail: p.setNewUserEmail,
    setNewUserRole: p.setNewUserRole,
    handleUpdateUserRole: p.handleUpdateUserRole,
    handlePurgeUser: p.handlePurgeUser
  });

  const _unused = { editingUserId: p.editingUserId, editFirstNameValue: p.editFirstNameValue, setEditFirstNameValue: p.setEditFirstNameValue, editLastNameValue: p.editLastNameValue, setEditLastNameValue: p.setEditLastNameValue, editEmailValue: p.editEmailValue, setEditEmailValue: p.setEditEmailValue, handleCommitEdit: p.handleCommitEdit, handleStartEdit: p.handleStartEdit, aiUsageRows: p.aiUsageRows, onRefreshAiUsage: p.onRefreshAiUsage };
  void _unused;

  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
      <SettingsAdminHeaderCard planLabel={controller.planLabel} isFreePlan={controller.isFreePlan} seatLimit={controller.seatLimit} usedSeats={controller.usedSeats} availableSeats={controller.availableSeats} canShowUpgrade={controller.canShowUpgrade} seatPurchaseCount={p.seatPurchaseCount} setSeatPurchaseCount={p.setSeatPurchaseCount} handleBuyMoreSeats={p.handleBuyMoreSeats} onOpenProvisionPanel={() => p.setIsProvisioning(true)} />
      <SettingsAdminUsersSection
        org={p.org}
        directoryLoading={controller.directoryLoading}
        directoryError={controller.directoryError}
        peopleExpanded={controller.peopleExpanded}
        userSearch={controller.userSearch}
        filteredRows={controller.filteredRows}
        currentUserId={p.user.id}
        onTogglePeopleExpanded={() => controller.setPeopleExpanded(!controller.peopleExpanded)}
        onUserSearchChange={controller.setUserSearch}
        onSyncDirectory={controller.handleSyncDirectory}
        onUpdateUserRole={controller.handleRoleChange}
        onUnlicense={controller.handleUnlicenseUser}
        onLicenseRow={controller.handleLicenseRow}
        onRemoveUser={controller.handleRemoveUser}
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
        onClose={controller.closeProvision}
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
