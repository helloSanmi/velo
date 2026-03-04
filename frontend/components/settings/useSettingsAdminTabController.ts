import { useMemo, useState } from 'react';
import { Organization, User as UserType } from '../../types';
import { userService } from '../../services/userService';
import { dialogService } from '../../services/dialogService';
import { buildSettingsAdminRows, filterSettingsAdminRows, SettingsAdminRow } from './settingsAdminRows';
import { useSettingsDirectoryState } from './useSettingsDirectoryState';

interface UseSettingsAdminTabControllerArgs {
  org: Organization | null;
  allUsers: UserType[];
  onRefreshWorkspaceUsers: () => Promise<void>;
  onUpdateOrganizationSettings: (
    patch: Partial<Pick<Organization, 'loginSubdomain' | 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected' | 'notificationSenderEmail'>>
  ) => Promise<void>;
  setIsProvisioning: (value: boolean) => void;
  setNewUserName: (value: string) => void;
  setNewUserFirstName: (value: string) => void;
  setNewUserLastName: (value: string) => void;
  setNewUserEmail: (value: string) => void;
  setNewUserRole: (value: 'member' | 'admin') => void;
  handleUpdateUserRole: (userId: string, role: 'admin' | 'member') => void;
  handlePurgeUser: (userId: string) => void;
}

export const useSettingsAdminTabController = ({
  org,
  allUsers,
  onRefreshWorkspaceUsers,
  onUpdateOrganizationSettings,
  setIsProvisioning,
  setNewUserName,
  setNewUserFirstName,
  setNewUserLastName,
  setNewUserEmail,
  setNewUserRole,
  handleUpdateUserRole,
  handlePurgeUser
}: UseSettingsAdminTabControllerArgs) => {
  const [userSearch, setUserSearch] = useState('');
  const [peopleExpanded, setPeopleExpanded] = useState(true);
  const { directoryLoading, directoryUsers, directoryError, setDirectoryError, handleSyncDirectory } = useSettingsDirectoryState({
    org,
    onUpdateOrganizationSettings
  });
  const isFreePlan = (org?.plan || 'basic') === 'free';
  const planLabel = (org?.plan || 'basic').toUpperCase();
  const seatLimit = Math.max(1, org?.totalSeats || 1);
  const usedSeats = allUsers.filter((member) => member.licenseActive !== false).length;
  const availableSeats = Math.max(0, seatLimit - usedSeats);
  const canShowUpgrade = (org?.plan || 'basic') !== 'pro';

  const rows = useMemo<SettingsAdminRow[]>(() => buildSettingsAdminRows(allUsers, directoryUsers), [allUsers, directoryUsers]);

  const filteredRows = useMemo(() => filterSettingsAdminRows(rows, userSearch), [rows, userSearch]);

  const handleLicenseRow = async (row: SettingsAdminRow) => {
    if (!org) return;
    setDirectoryError('');
    const targetLabel = row.displayName || row.email;
    const confirmed = await dialogService.confirm(`Assign a paid license to ${targetLabel}?`, {
      title: 'Assign license',
      confirmText: 'Assign',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    if (row.source === 'workspace') {
      const result = await userService.updateUserLicenseRemote(org.id, row.member.id, true);
      if (!result.success) {
        setDirectoryError(result.error || 'Could not assign license.');
        return;
      }
      await onRefreshWorkspaceUsers();
      return;
    }
    const result = await userService.importDirectoryUsers(org.id, row.provider, [
      {
        externalId: row.entry.externalId,
        email: row.entry.email,
        displayName: row.entry.displayName,
        firstName: row.entry.firstName,
        lastName: row.entry.lastName
      }
    ]);
    if (!result.success) {
      setDirectoryError(result.error || 'Could not assign license.');
      return;
    }
    await onRefreshWorkspaceUsers();
  };

  const handleUnlicenseUser = async (member: UserType) => {
    if (!org) return;
    const targetLabel = member.displayName || member.email || 'this user';
    const confirmed = await dialogService.confirm(`Remove license from ${targetLabel}?`, {
      title: 'Remove license',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      danger: true
    });
    if (!confirmed) return;
    const result = await userService.updateUserLicenseRemote(org.id, member.id, false);
    if (!result.success) {
      setDirectoryError(result.error || 'Could not remove license.');
      return;
    }
    await onRefreshWorkspaceUsers();
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    const target = allUsers.find((member) => member.id === userId);
    if (!target) return;
    const roleLabel = role === 'admin' ? 'Admin' : 'Member';
    const targetLabel = target.displayName || target.email || 'this user';
    const confirmed = await dialogService.confirm(`Change ${targetLabel} to ${roleLabel}?`, {
      title: 'Change role',
      confirmText: 'Update role',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    handleUpdateUserRole(userId, role);
  };

  const handleRemoveUser = async (userId: string) => {
    const target = allUsers.find((member) => member.id === userId);
    if (!target) return;
    const targetLabel = target.displayName || target.email || 'this user';
    const confirmed = await dialogService.confirm(`Remove ${targetLabel} from this workspace?`, {
      title: 'Remove user',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      danger: true
    });
    if (!confirmed) return;
    handlePurgeUser(userId);
  };

  const closeProvision = () => {
    setIsProvisioning(false);
    setNewUserName('');
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserEmail('');
    setNewUserRole('member');
  };

  return {
    userSearch,
    setUserSearch,
    peopleExpanded,
    setPeopleExpanded,
    directoryLoading,
    directoryError,
    planLabel,
    isFreePlan,
    seatLimit,
    usedSeats,
    availableSeats,
    canShowUpgrade,
    filteredRows,
    handleSyncDirectory,
    handleRoleChange,
    handleUnlicenseUser,
    handleLicenseRow,
    handleRemoveUser,
    closeProvision
  };
};
