import { settingsService } from '../../services/settingsService';
import { Project, Task, User as UserType } from '../../types';
import { buildSettingsNavItems } from './settingsModalNav';
import { SettingsTabType } from './settingsModal.types';
import { useSettingsModalActions } from './useSettingsModalActions';
import { buildSettingsModalContentProps } from './settingsModalContentProps';
import { useSettingsModalData } from './useSettingsModalData';

interface UseSettingsModalControllerArgs {
  isOpen: boolean;
  initialTab: SettingsTabType;
  user?: UserType;
  projects: Project[];
  projectTasks: Task[];
  onRenameProject?: (id: string, name: string) => void;
  onCompleteProject?: (id: string) => void;
  onReopenProject?: (id: string) => void;
  onArchiveProject?: (id: string) => void;
  onRestoreProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onPurgeProject?: (id: string) => void;
  onUpdateProject?: (id: string, updates: Partial<Project>) => void;
  onChangeProjectOwner?: (id: string, ownerId: string) => void;
  onDeleteOrganization?: () => void;
  onUserUpdated?: (user: UserType) => void;
  onClose: () => void;
}

export const useSettingsModalController = ({
  isOpen,
  initialTab,
  user,
  projects,
  projectTasks,
  onRenameProject,
  onCompleteProject,
  onReopenProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onPurgeProject,
  onUpdateProject,
  onChangeProjectOwner,
  onDeleteOrganization,
  onUserUpdated,
  onClose
}: UseSettingsModalControllerArgs) => {
  const data = useSettingsModalData({ isOpen, initialTab, user, projects, projectTasks });

  const actions = useSettingsModalActions({
    user,
    org: data.org,
    profileUser: data.profileUser,
    editingProjectId: data.editingProjectId,
    editingProjectName: data.editingProjectName,
    newUserName: data.newUserName,
    newUserFirstName: data.newUserFirstName,
    newUserLastName: data.newUserLastName,
    newUserEmail: data.newUserEmail,
    newUserRole: data.newUserRole,
    newUserTempPassword: data.newUserTempPassword,
    newInviteIdentifier: data.newInviteIdentifier,
    newInviteRole: data.newInviteRole,
    seatPurchaseCount: data.seatPurchaseCount,
    editingUserId: data.editingUserId,
    editFirstNameValue: data.editFirstNameValue,
    editLastNameValue: data.editLastNameValue,
    editEmailValue: data.editEmailValue,
    setSettings: data.setSettings,
    setAllUsers: data.setAllUsers,
    setOrg: data.setOrg,
    setInvites: data.setInvites,
    setAiUsageRows: data.setAiUsageRows,
    setProfileUser: data.setProfileUser,
    setProvisionError: data.setProvisionError,
    setNewUserName: data.setNewUserName,
    setNewUserFirstName: data.setNewUserFirstName,
    setNewUserLastName: data.setNewUserLastName,
    setNewUserEmail: data.setNewUserEmail,
    setNewUserRole: data.setNewUserRole,
    setNewUserTempPassword: data.setNewUserTempPassword,
    setIsProvisioning: data.setIsProvisioning,
    setEditingUserId: data.setEditingUserId,
    setEditFirstNameValue: data.setEditFirstNameValue,
    setEditLastNameValue: data.setEditLastNameValue,
    setEditEmailValue: data.setEditEmailValue,
    setNewInviteIdentifier: data.setNewInviteIdentifier,
    setEditingProjectId: data.setEditingProjectId,
    setEditingProjectName: data.setEditingProjectName,
    onUserUpdated,
    onRenameProject,
    onDeleteOrganization,
    onClose
  });

  const navItems = buildSettingsNavItems(user, data.canAccessWorkflowAutomation);
  const contentProps = buildSettingsModalContentProps({
    activeTab: data.activeTab,
    canAccessWorkflowAutomation: data.canAccessWorkflowAutomation,
    canManageWorkflowAutomation: data.canManageWorkflowAutomation,
    user,
    profileUser: data.profileUser,
    org: data.org,
    allUsers: data.allUsers,
    teams: data.teams,
    setTeams: data.setTeams,
    settings: data.settings,
    projects,
    workflowProjects: data.workflowVisibleProjects,
    projectTasks,
    projectQuery: data.projectQuery,
    setProjectQuery: data.setProjectQuery,
    activeProjects: data.activeProjects,
    archivedProjects: data.archivedProjects,
    completedProjects: data.completedProjects,
    deletedProjects: data.deletedProjects,
    focusedProjectId: data.focusedProjectId,
    setFocusedProjectId: data.setFocusedProjectId,
    focusedProject: data.focusedProject,
    focusedProjectTasks: data.focusedProjectTasks,
    editingProjectId: data.editingProjectId,
    editingProjectName: data.editingProjectName,
    setEditingProjectId: data.setEditingProjectId,
    setEditingProjectName: data.setEditingProjectName,
    submitProjectRename: actions.submitProjectRename,
    onCompleteProject,
    onReopenProject,
    onArchiveProject,
    onRestoreProject,
    onDeleteProject,
    onPurgeProject,
    onUpdateProject,
    onChangeProjectOwner,
    onDeleteOrganization: actions.handleDeleteOrganization,
    onToggle: (key) => actions.handleToggle(data.settings, key),
    onThemeChange: actions.handleThemeChange,
    onUpdateSettings: actions.handleUpdateSettings,
    onThresholdChange: (value: number) => {
      const updated = settingsService.updateSettings({ estimationApprovalThreshold: value });
      data.setSettings(updated);
    },
    onAvatarUpdate: actions.handleAvatarUpdate,
    onChangePassword: actions.handleChangePassword,
    onUpdateProfileName: actions.handleUpdateProfileName,
    isProvisioning: data.isProvisioning,
    setIsProvisioning: data.setIsProvisioning,
    newUserName: data.newUserName,
    setNewUserName: data.setNewUserName,
    newUserFirstName: data.newUserFirstName,
    setNewUserFirstName: data.setNewUserFirstName,
    newUserLastName: data.newUserLastName,
    setNewUserLastName: data.setNewUserLastName,
    newUserEmail: data.newUserEmail,
    setNewUserEmail: data.setNewUserEmail,
    newUserRole: data.newUserRole,
    setNewUserRole: data.setNewUserRole,
    newUserTempPassword: data.newUserTempPassword,
    setNewUserTempPassword: data.setNewUserTempPassword,
    provisionError: data.provisionError,
    handleProvision: actions.handleProvision,
    seatPurchaseCount: data.seatPurchaseCount,
    setSeatPurchaseCount: data.setSeatPurchaseCount,
    handleBuyMoreSeats: actions.handleBuyMoreSeats,
    editingUserId: data.editingUserId,
    editFirstNameValue: data.editFirstNameValue,
    setEditFirstNameValue: data.setEditFirstNameValue,
    editLastNameValue: data.editLastNameValue,
    setEditLastNameValue: data.setEditLastNameValue,
    editEmailValue: data.editEmailValue,
    setEditEmailValue: data.setEditEmailValue,
    handleCommitEdit: actions.handleCommitEdit,
    handleStartEdit: actions.handleStartEdit,
    handleUpdateUserRole: actions.handleUpdateUserRole,
    handlePurgeUser: actions.handlePurgeUser,
    invites: data.invites,
    newInviteIdentifier: data.newInviteIdentifier,
    setNewInviteIdentifier: data.setNewInviteIdentifier,
    newInviteRole: data.newInviteRole,
    setNewInviteRole: data.setNewInviteRole,
    handleCreateInvite: actions.handleCreateInvite,
    handleRevokeInvite: actions.handleRevokeInvite,
    handleResendInvite: actions.handleResendInvite,
    refreshWorkspaceUsers: actions.refreshWorkspaceUsers,
    aiUsageRows: data.aiUsageRows,
    refreshAiUsage: actions.refreshAiUsage,
    onUpdateOrganizationSettings: actions.handleUpdateOrganizationSettings
  });

  return { activeTab: data.activeTab, setActiveTab: data.setActiveTab, navItems, contentProps };
};
