import { FormEvent } from 'react';
import { SettingsTabType } from './settingsModal.types';
import { UserSettings } from '../../services/settingsService';
import { OrgInvite, Organization, Project, Task, Team, User as UserType } from '../../types';

interface BuildSettingsModalContentPropsArgs {
  activeTab: SettingsTabType;
  workflowPlanEnabled: boolean;
  integrationsPlanEnabled: boolean;
  canAccessWorkflowAutomation: boolean;
  canManageWorkflowAutomation: boolean;
  user?: UserType;
  profileUser: UserType | null;
  org: Organization | null;
  allUsers: UserType[];
  teams: Team[];
  setTeams: (value: Team[]) => void;
  settings: UserSettings;
  projects: Project[];
  workflowProjects: Project[];
  projectTasks: Task[];
  projectQuery: string;
  setProjectQuery: (value: string) => void;
  activeProjects: Project[];
  archivedProjects: Project[];
  completedProjects: Project[];
  deletedProjects: Project[];
  focusedProjectId: string | null;
  setFocusedProjectId: (value: string | null) => void;
  focusedProject: Project | null;
  focusedProjectTasks: Task[];
  editingProjectId: string | null;
  editingProjectName: string;
  setEditingProjectId: (value: string | null) => void;
  setEditingProjectName: (value: string) => void;
  submitProjectRename: () => void;
  onCompleteProject?: (id: string) => void;
  onReopenProject?: (id: string) => void;
  onArchiveProject?: (id: string) => void;
  onRestoreProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onPurgeProject?: (id: string) => void;
  onUpdateProject?: (id: string, updates: Partial<Project>) => void;
  onChangeProjectOwner?: (id: string, ownerId: string) => void;
  onDeleteOrganization: () => void;
  onToggle: (key: keyof UserSettings) => void;
  onThemeChange: (theme: UserSettings['theme']) => void;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onThresholdChange: (value: number) => void;
  onAvatarUpdate: (avatar: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateProfileName: (firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
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
  newUserTempPassword: string;
  setNewUserTempPassword: (value: string) => void;
  provisionError: string;
  handleProvision: (e: FormEvent) => Promise<void>;
  seatPurchaseCount: number;
  setSeatPurchaseCount: (value: number) => void;
  handleBuyMoreSeats: () => Promise<void>;
  editingUserId: string | null;
  editFirstNameValue: string;
  setEditFirstNameValue: (value: string) => void;
  editLastNameValue: string;
  setEditLastNameValue: (value: string) => void;
  editEmailValue: string;
  setEditEmailValue: (value: string) => void;
  handleCommitEdit: () => Promise<void>;
  handleStartEdit: (targetUser: UserType) => void;
  handleUpdateUserRole: (userId: string, role: 'admin' | 'member') => Promise<void>;
  handlePurgeUser: (userId: string) => Promise<void>;
  invites: OrgInvite[];
  newInviteIdentifier: string;
  setNewInviteIdentifier: (value: string) => void;
  newInviteRole: 'member' | 'admin';
  setNewInviteRole: (value: 'member' | 'admin') => void;
  handleCreateInvite: () => Promise<void>;
  handleRevokeInvite: (inviteId: string) => Promise<void>;
  handleResendInvite: (inviteId: string) => Promise<void>;
  refreshWorkspaceUsers: () => Promise<void>;
  aiUsageRows: Array<{ id: string; orgId: string; dayKey: string; requestsUsed: number; tokensUsed: number; warningIssuedAt?: string | null; blockedAt?: string | null }>;
  refreshAiUsage: () => Promise<void>;
  onUpdateOrganizationSettings: (
    patch: Partial<
      Pick<
        Organization,
        | 'loginSubdomain'
        | 'allowMicrosoftAuth'
        | 'microsoftWorkspaceConnected'
        | 'notificationSenderEmail'
        | 'plan'
        | 'totalSeats'
        | 'seatPrice'
        | 'billingCurrency'
      >
    >
  ) => Promise<Organization | null>;
}

export const buildSettingsModalContentProps = (args: BuildSettingsModalContentPropsArgs) => ({
  activeTab: args.activeTab,
  workflowPlanEnabled: args.workflowPlanEnabled,
  integrationsPlanEnabled: args.integrationsPlanEnabled,
  canAccessWorkflowAutomation: args.canAccessWorkflowAutomation,
  canManageWorkflowAutomation: args.canManageWorkflowAutomation,
  user: args.user,
  profileUser: args.profileUser,
  org: args.org,
  allUsers: args.allUsers,
  groups: [],
  teams: args.teams,
  settings: args.settings,
  setTeams: args.setTeams,
  setGroups: () => undefined,
  projects: args.projects,
  workflowProjects: args.workflowProjects,
  projectTasks: args.projectTasks,
  projectQuery: args.projectQuery,
  setProjectQuery: args.setProjectQuery,
  activeProjects: args.activeProjects,
  archivedProjects: args.archivedProjects,
  completedProjects: args.completedProjects,
  deletedProjects: args.deletedProjects,
  focusedProjectId: args.focusedProjectId,
  setFocusedProjectId: args.setFocusedProjectId,
  focusedProject: args.focusedProject,
  focusedProjectTasks: args.focusedProjectTasks,
  editingProjectId: args.editingProjectId,
  editingProjectName: args.editingProjectName,
  setEditingProjectId: args.setEditingProjectId,
  setEditingProjectName: args.setEditingProjectName,
  submitProjectRename: args.submitProjectRename,
  onCompleteProject: args.onCompleteProject,
  onReopenProject: args.onReopenProject,
  onArchiveProject: args.onArchiveProject,
  onRestoreProject: args.onRestoreProject,
  onDeleteProject: args.onDeleteProject,
  onPurgeProject: args.onPurgeProject,
  onUpdateProject: args.onUpdateProject,
  onChangeProjectOwner: args.onChangeProjectOwner,
  onDeleteOrganization: args.onDeleteOrganization,
  onToggle: args.onToggle,
  onThemeChange: args.onThemeChange,
  onUpdateSettings: args.onUpdateSettings,
  onThresholdChange: args.onThresholdChange,
  onAvatarUpdate: args.onAvatarUpdate,
  onChangePassword: args.onChangePassword,
  onUpdateProfileName: args.onUpdateProfileName,
  isProvisioning: args.isProvisioning,
  setIsProvisioning: args.setIsProvisioning,
  newUserName: args.newUserName,
  setNewUserName: args.setNewUserName,
  newUserFirstName: args.newUserFirstName,
  setNewUserFirstName: args.setNewUserFirstName,
  newUserLastName: args.newUserLastName,
  setNewUserLastName: args.setNewUserLastName,
  newUserEmail: args.newUserEmail,
  setNewUserEmail: args.setNewUserEmail,
  newUserRole: args.newUserRole,
  setNewUserRole: args.setNewUserRole,
  newUserTempPassword: args.newUserTempPassword,
  setNewUserTempPassword: args.setNewUserTempPassword,
  provisionError: args.provisionError,
  handleProvision: args.handleProvision,
  seatPurchaseCount: args.seatPurchaseCount,
  setSeatPurchaseCount: args.setSeatPurchaseCount,
  handleBuyMoreSeats: args.handleBuyMoreSeats,
  editingUserId: args.editingUserId,
  editFirstNameValue: args.editFirstNameValue,
  setEditFirstNameValue: args.setEditFirstNameValue,
  editLastNameValue: args.editLastNameValue,
  setEditLastNameValue: args.setEditLastNameValue,
  editEmailValue: args.editEmailValue,
  setEditEmailValue: args.setEditEmailValue,
  handleCommitEdit: args.handleCommitEdit,
  handleStartEdit: args.handleStartEdit,
  handleUpdateUserRole: args.handleUpdateUserRole,
  handlePurgeUser: args.handlePurgeUser,
  invites: args.invites,
  newInviteIdentifier: args.newInviteIdentifier,
  setNewInviteIdentifier: args.setNewInviteIdentifier,
  newInviteRole: args.newInviteRole,
  setNewInviteRole: args.setNewInviteRole,
  handleCreateInvite: args.handleCreateInvite,
  handleRevokeInvite: args.handleRevokeInvite,
  handleResendInvite: args.handleResendInvite,
  refreshWorkspaceUsers: args.refreshWorkspaceUsers,
  aiUsageRows: args.aiUsageRows,
  refreshAiUsage: args.refreshAiUsage,
  onUpdateOrganizationSettings: args.onUpdateOrganizationSettings
});
