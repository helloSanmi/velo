import React from 'react';
import { OrgInvite, Organization, Project, SecurityGroup, Team, User as UserType } from '../../types';
import WorkflowBuilder from '../WorkflowBuilder';
import SettingsProjectsTab from './SettingsProjectsTab';
import SettingsTeamsTab from './SettingsTeamsTab';
import SettingsCoreTabs from './SettingsCoreTabs';
import { settingsService, UserSettings } from '../../services/settingsService';
import SettingsAdminTab from './SettingsAdminTab';
import SettingsDangerTab from './SettingsDangerTab';
import IntegrationHub from '../IntegrationHub';
import { SettingsTabType } from '../SettingsModal';

interface SettingsModalContentProps {
  activeTab: SettingsTabType;
  canManageWorkflowAutomation: boolean;
  user: UserType;
  profileUser: UserType | null;
  org: Organization | null;
  allUsers: UserType[];
  groups: SecurityGroup[];
  teams: Team[];
  settings: UserSettings;
  setTeams: (teams: Team[]) => void;
  setGroups: (groups: SecurityGroup[]) => void;
  projects: Project[];
  projectQuery: string;
  setProjectQuery: (value: string) => void;
  activeProjects: Project[];
  archivedProjects: Project[];
  completedProjects: Project[];
  deletedProjects: Project[];
  focusedProjectId: string | null;
  setFocusedProjectId: (id: string | null) => void;
  focusedProject: Project | null;
  focusedProjectTasks: Task[];
  editingProjectId: string | null;
  editingProjectName: string;
  setEditingProjectId: (id: string | null) => void;
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
  onDeleteOrganization: () => Promise<void>;
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
  provisionError: string;
  handleProvision: (e: React.FormEvent) => Promise<void>;
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
  aiUsageRows: Array<{
    id: string;
    orgId: string;
    dayKey: string;
    requestsUsed: number;
    tokensUsed: number;
    warningIssuedAt?: string | null;
    blockedAt?: string | null;
  }>;
  refreshAiUsage: () => Promise<void>;
}

const SettingsModalContent: React.FC<SettingsModalContentProps> = (props) => {
  const {
    activeTab,
    canManageWorkflowAutomation,
    user,
    profileUser,
    org,
    allUsers,
    groups,
    teams,
    setTeams,
    setGroups,
    settings,
    projects,
    projectQuery,
    setProjectQuery,
    activeProjects,
    archivedProjects,
    completedProjects,
    deletedProjects,
    focusedProjectId,
    setFocusedProjectId,
    focusedProject,
    focusedProjectTasks,
    editingProjectId,
    editingProjectName,
    setEditingProjectId,
    setEditingProjectName,
    submitProjectRename,
    onCompleteProject,
    onReopenProject,
    onArchiveProject,
    onRestoreProject,
    onDeleteProject,
    onPurgeProject,
    onUpdateProject,
    onChangeProjectOwner,
    onDeleteOrganization,
    onToggle,
    onThemeChange,
    onUpdateSettings,
    onThresholdChange,
    onAvatarUpdate,
    onChangePassword,
    onUpdateProfileName,
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
    refreshAiUsage
  } = props;

  switch (activeTab) {
    case 'automation':
      if (!canManageWorkflowAutomation) {
        return <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">Only admins and project owners can access workflow automation.</div>;
      }
      return <WorkflowBuilder orgId={user.orgId} allUsers={allUsers} projects={projects} currentUser={user} />;
    case 'integrations':
      if (user.role !== 'admin') {
        return <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">Only admins can manage workspace integrations.</div>;
      }
      return (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <IntegrationHub projects={projects} compact onUpdateProject={(id, updates) => onUpdateProject?.(id, updates)} />
        </div>
      );
    case 'projects':
      return (
        <SettingsProjectsTab
          currentUserRole={user.role}
          currentUserId={user.id}
          allUsers={allUsers}
          projectQuery={projectQuery}
          setProjectQuery={setProjectQuery}
          activeProjects={activeProjects}
          archivedProjects={archivedProjects}
          completedProjects={completedProjects}
          deletedProjects={deletedProjects}
          focusedProjectId={focusedProjectId}
          setFocusedProjectId={setFocusedProjectId}
          focusedProject={focusedProject}
          focusedProjectTasks={focusedProjectTasks}
          editingProjectId={editingProjectId}
          editingProjectName={editingProjectName}
          setEditingProjectId={setEditingProjectId}
          setEditingProjectName={setEditingProjectName}
          submitProjectRename={submitProjectRename}
          onCompleteProject={onCompleteProject}
          onReopenProject={onReopenProject}
          onArchiveProject={onArchiveProject}
          onRestoreProject={onRestoreProject}
          onDeleteProject={onDeleteProject}
          onPurgeProject={onPurgeProject}
          onChangeProjectOwner={onChangeProjectOwner}
        />
      );
    case 'teams':
    case 'groups':
      return <SettingsTeamsTab currentUser={user} allUsers={allUsers} teams={teams} groups={groups} projects={projects} onTeamsChanged={setTeams} onGroupsChanged={setGroups} />;
    case 'profile':
    case 'general':
    case 'notifications':
    case 'security':
    case 'appearance':
      return (
        <SettingsCoreTabs
          activeTab={activeTab}
          user={profileUser || user}
          org={org}
          teams={teams}
          groups={groups}
          settings={settings}
          onToggle={onToggle}
          onThemeChange={onThemeChange}
          onUpdateSettings={onUpdateSettings}
          onThresholdChange={onThresholdChange}
          onAvatarUpdate={onAvatarUpdate}
          onChangePassword={onChangePassword}
          onUpdateProfileName={onUpdateProfileName}
        />
      );
    case 'licenses':
      return (
        <SettingsAdminTab
          user={user}
          org={org}
          allUsers={allUsers}
          isProvisioning={isProvisioning}
          setIsProvisioning={setIsProvisioning}
          newUserName={newUserName}
          setNewUserName={setNewUserName}
          newUserFirstName={newUserFirstName}
          setNewUserFirstName={setNewUserFirstName}
          newUserLastName={newUserLastName}
          setNewUserLastName={setNewUserLastName}
          newUserEmail={newUserEmail}
          setNewUserEmail={setNewUserEmail}
          newUserRole={newUserRole}
          setNewUserRole={setNewUserRole}
          provisionError={provisionError}
          handleProvision={handleProvision}
          seatPurchaseCount={seatPurchaseCount}
          setSeatPurchaseCount={setSeatPurchaseCount}
          handleBuyMoreSeats={handleBuyMoreSeats}
          editingUserId={editingUserId}
          editFirstNameValue={editFirstNameValue}
          setEditFirstNameValue={setEditFirstNameValue}
          editLastNameValue={editLastNameValue}
          setEditLastNameValue={setEditLastNameValue}
          editEmailValue={editEmailValue}
          setEditEmailValue={setEditEmailValue}
          handleCommitEdit={handleCommitEdit}
          handleStartEdit={handleStartEdit}
          handleUpdateUserRole={handleUpdateUserRole}
          handlePurgeUser={handlePurgeUser}
          invites={invites}
          newInviteIdentifier={newInviteIdentifier}
          setNewInviteIdentifier={setNewInviteIdentifier}
          newInviteRole={newInviteRole}
          setNewInviteRole={setNewInviteRole}
          handleCreateInvite={handleCreateInvite}
          handleRevokeInvite={handleRevokeInvite}
          aiUsageRows={aiUsageRows}
          onRefreshAiUsage={refreshAiUsage}
        />
      );
    case 'danger':
      return <SettingsDangerTab user={user} org={org} onDeleteOrganization={onDeleteOrganization} />;
    default:
      return (
        <SettingsCoreTabs
          activeTab="general"
          user={profileUser || user}
          org={org}
          teams={teams}
          groups={groups}
          settings={settings}
          onToggle={onToggle}
          onThemeChange={onThemeChange}
          onUpdateSettings={onUpdateSettings}
          onThresholdChange={onThresholdChange}
          onAvatarUpdate={onAvatarUpdate}
          onChangePassword={onChangePassword}
          onUpdateProfileName={onUpdateProfileName}
        />
      );
  }
};

export default SettingsModalContent;
