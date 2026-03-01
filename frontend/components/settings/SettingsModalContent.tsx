import React from 'react';
import WorkflowBuilder from '../WorkflowBuilder';
import SettingsProjectsTab from './SettingsProjectsTab';
import SettingsTeamsTab from './SettingsTeamsTab';
import SettingsCoreTabs from './SettingsCoreTabs';
import SettingsAdminTab from './SettingsAdminTab';
import SettingsDangerTab from './SettingsDangerTab';
import SettingsPolicyTab from './SettingsPolicyTab';
import IntegrationHub from '../IntegrationHub';
import { SettingsModalContentProps } from './SettingsModalContent.types';

const SettingsModalContent: React.FC<SettingsModalContentProps> = (props) => {
  const coreTabUser = props.profileUser || props.user;
  const coreTab = (activeTab: 'profile' | 'general' | 'notifications' | 'security' | 'appearance') => (
    <SettingsCoreTabs
      activeTab={activeTab}
      user={coreTabUser}
      org={props.org}
      allUsers={props.allUsers}
      projects={props.projects}
      teams={props.teams}
      settings={props.settings}
      onToggle={props.onToggle}
      onThemeChange={props.onThemeChange}
      onUpdateSettings={props.onUpdateSettings}
      onThresholdChange={props.onThresholdChange}
      onUpdateProject={props.onUpdateProject}
      onAvatarUpdate={props.onAvatarUpdate}
      onChangePassword={props.onChangePassword}
      onUpdateProfileName={props.onUpdateProfileName}
    />
  );

  switch (props.activeTab) {
    case 'automation':
      return props.canAccessWorkflowAutomation
        ? <WorkflowBuilder orgId={props.user.orgId} allUsers={props.allUsers} projects={props.workflowProjects} projectTasks={props.projectTasks} currentUser={props.user} />
        : <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">You can only view workflows for projects you are involved in.</div>;
    case 'integrations':
      return props.user.role === 'admin' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <IntegrationHub
            projects={props.projects}
            org={props.org}
            compact
            onUpdateProject={(id, updates) => props.onUpdateProject?.(id, updates)}
            onUpdateOrganizationSettings={props.onUpdateOrganizationSettings}
          />
        </div>
      ) : <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Only admins can manage workspace integrations.</div>;
    case 'projects':
      return (
        <SettingsProjectsTab
          currentUserRole={props.user.role}
          currentUserId={props.user.id}
          allUsers={props.allUsers}
          projectQuery={props.projectQuery}
          setProjectQuery={props.setProjectQuery}
          activeProjects={props.activeProjects}
          archivedProjects={props.archivedProjects}
          completedProjects={props.completedProjects}
          deletedProjects={props.deletedProjects}
          focusedProjectId={props.focusedProjectId}
          setFocusedProjectId={props.setFocusedProjectId}
          focusedProject={props.focusedProject}
          focusedProjectTasks={props.focusedProjectTasks}
          editingProjectId={props.editingProjectId}
          editingProjectName={props.editingProjectName}
          setEditingProjectId={props.setEditingProjectId}
          setEditingProjectName={props.setEditingProjectName}
          submitProjectRename={props.submitProjectRename}
          onCompleteProject={props.onCompleteProject}
          onReopenProject={props.onReopenProject}
          onArchiveProject={props.onArchiveProject}
          onRestoreProject={props.onRestoreProject}
          onDeleteProject={props.onDeleteProject}
          onPurgeProject={props.onPurgeProject}
          onChangeProjectOwner={props.onChangeProjectOwner}
        />
      );
    case 'teams':
      return <SettingsTeamsTab currentUser={props.user} allUsers={props.allUsers} teams={props.teams} groups={props.groups} projects={props.projects} onTeamsChanged={props.setTeams} onGroupsChanged={props.setGroups} />;
    case 'profile':
    case 'general':
    case 'notifications':
    case 'security':
    case 'appearance':
      return coreTab(props.activeTab);
    case 'licenses':
      return (
        <SettingsAdminTab
          user={props.user}
          org={props.org}
          allUsers={props.allUsers}
          isProvisioning={props.isProvisioning}
          setIsProvisioning={props.setIsProvisioning}
          newUserName={props.newUserName}
          setNewUserName={props.setNewUserName}
          newUserFirstName={props.newUserFirstName}
          setNewUserFirstName={props.setNewUserFirstName}
          newUserLastName={props.newUserLastName}
          setNewUserLastName={props.setNewUserLastName}
          newUserEmail={props.newUserEmail}
          setNewUserEmail={props.setNewUserEmail}
          newUserRole={props.newUserRole}
          setNewUserRole={props.setNewUserRole}
          newUserTempPassword={props.newUserTempPassword}
          setNewUserTempPassword={props.setNewUserTempPassword}
          provisionError={props.provisionError}
          handleProvision={props.handleProvision}
          seatPurchaseCount={props.seatPurchaseCount}
          setSeatPurchaseCount={props.setSeatPurchaseCount}
          handleBuyMoreSeats={props.handleBuyMoreSeats}
          editingUserId={props.editingUserId}
          editFirstNameValue={props.editFirstNameValue}
          setEditFirstNameValue={props.setEditFirstNameValue}
          editLastNameValue={props.editLastNameValue}
          setEditLastNameValue={props.setEditLastNameValue}
          editEmailValue={props.editEmailValue}
          setEditEmailValue={props.setEditEmailValue}
          handleCommitEdit={props.handleCommitEdit}
          handleStartEdit={props.handleStartEdit}
          handleUpdateUserRole={props.handleUpdateUserRole}
          handlePurgeUser={props.handlePurgeUser}
          onRefreshWorkspaceUsers={props.refreshWorkspaceUsers}
          aiUsageRows={props.aiUsageRows}
          onRefreshAiUsage={props.refreshAiUsage}
          onUpdateOrganizationSettings={props.onUpdateOrganizationSettings}
        />
      );
    case 'policy':
      return (
        <SettingsPolicyTab
          user={props.user}
          org={props.org}
          settings={props.settings}
          onUpdateSettings={props.onUpdateSettings}
          invites={props.invites}
          newInviteIdentifier={props.newInviteIdentifier}
          newInviteRole={props.newInviteRole}
          setNewInviteIdentifier={props.setNewInviteIdentifier}
          setNewInviteRole={props.setNewInviteRole}
          handleCreateInvite={props.handleCreateInvite}
          handleRevokeInvite={props.handleRevokeInvite}
          handleResendInvite={props.handleResendInvite}
          onUpdateOrganizationSettings={props.onUpdateOrganizationSettings}
        />
      );
    case 'danger':
      return <SettingsDangerTab user={props.user} org={props.org} onDeleteOrganization={props.onDeleteOrganization} />;
    default:
      return coreTab('general');
  }
};

export default SettingsModalContent;
