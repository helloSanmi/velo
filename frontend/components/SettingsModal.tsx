import React, { useState, useEffect, useMemo } from 'react';
import { X, Settings } from 'lucide-react';
import { settingsService, UserSettings } from '../services/settingsService';
import { userService } from '../services/userService';
import { OrgInvite, Team, User as UserType, Organization, Project, Task } from '../types';
import { realtimeService } from '../services/realtimeService';
import { teamService } from '../services/teamService';
import { dialogService } from '../services/dialogService';
import { apiRequest } from '../services/apiClient';
import {
  canAccessWorkflowAutomation as canAccessWorkflowAutomationByRole,
  canManageWorkflowAutomation as canManageWorkflowAutomationByRole,
  getWorkflowOwnerProjectIds,
  getWorkflowVisibleProjects
} from '../services/settingsAccessService';
import SettingsModalContent from './settings/SettingsModalContent';
import { buildSettingsNavItems } from './settings/settingsModalNav';

export type SettingsTabType = 'profile' | 'general' | 'notifications' | 'security' | 'appearance' | 'teams' | 'licenses' | 'policy' | 'automation' | 'integrations' | 'projects' | 'danger';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabType;
  user?: UserType;
  projects?: Project[];
  projectTasks?: Task[];
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
}

interface AiUsageRow {
  id: string;
  orgId: string;
  dayKey: string;
  requestsUsed: number;
  tokensUsed: number;
  warningIssuedAt?: string | null;
  blockedAt?: string | null;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
  user,
  projects = [],
  projectTasks = [],
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
  onUserUpdated
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);
  const [settings, setSettings] = useState<UserSettings>(settingsService.getSettings());
  const [profileUser, setProfileUser] = useState<UserType | null>(user || null);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [aiUsageRows, setAiUsageRows] = useState<AiUsageRow[]>([]);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'member' | 'admin'>('member');
  const [newUserTempPassword, setNewUserTempPassword] = useState('TempPassword123');
  const [newInviteIdentifier, setNewInviteIdentifier] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<'member' | 'admin'>('member');
  const [seatPurchaseCount, setSeatPurchaseCount] = useState(5);
  const [provisionError, setProvisionError] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFirstNameValue, setEditFirstNameValue] = useState('');
  const [editLastNameValue, setEditLastNameValue] = useState('');
  const [editEmailValue, setEditEmailValue] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);


  useEffect(() => {
    if (isOpen && user) {
      const nextInitialTab = user.role !== 'admin' && initialTab === 'security' ? 'general' : initialTab;
      setActiveTab(nextInitialTab);
      setSettings(settingsService.getSettings());
      setProfileUser(user);
      userService.hydrateWorkspaceFromBackend(user.orgId).then(() => {
        setAllUsers(userService.getUsers(user.orgId));
        setOrg(userService.getOrganization(user.orgId));
      });
      teamService.fetchTeamsFromBackend(user.orgId).then(setTeams);
      userService.fetchInvitesFromBackend(user.orgId).then(setInvites);
      if (user.role === 'admin') {
        apiRequest<AiUsageRow[]>(`/orgs/${user.orgId}/usage/ai`)
          .then(setAiUsageRows)
          .catch(() => setAiUsageRows([]));
      } else {
        setAiUsageRows([]);
      }
      setEditingUserId(null);
      setNewUserTempPassword('TempPassword123');
    }
  }, [isOpen, initialTab, user]);

  useEffect(() => {
    if (!isOpen || !user) return undefined;
    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type !== 'TEAMS_UPDATED') return;
      if (event.orgId && event.orgId !== user.orgId) return;
      setTeams(teamService.getTeams(user.orgId));
    });
    return () => unsubscribe();
  }, [isOpen, user]);

  const filteredProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(q));
  }, [projects, projectQuery]);

  const activeProjects = filteredProjects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted);
  const archivedProjects = filteredProjects.filter((project) => project.isArchived && !project.isDeleted);
  const completedProjects = filteredProjects.filter((project) => project.isCompleted && !project.isDeleted);
  const deletedProjects = filteredProjects.filter((project) => project.isDeleted);
  const focusedProject = projects.find((project) => project.id === focusedProjectId) || null;
  const workflowOwnerProjectIds = useMemo(
    () => getWorkflowOwnerProjectIds(user, projects),
    [projects, user]
  );
  const workflowVisibleProjects = useMemo(
    () => getWorkflowVisibleProjects(user, projects, projectTasks),
    [projects, projectTasks, user]
  );
  const canAccessWorkflowAutomation = canAccessWorkflowAutomationByRole(user, workflowVisibleProjects);
  const canManageWorkflowAutomation = canManageWorkflowAutomationByRole(user, workflowOwnerProjectIds);
  const focusedProjectTasks = useMemo(
    () => (focusedProject ? projectTasks.filter((task) => task.projectId === focusedProject.id) : []),
    [projectTasks, focusedProject]
  );

  if (!isOpen || !user) return null;

  const handleToggle = (key: keyof UserSettings) => {
    const newVal = !settings[key as keyof UserSettings];
    const updated = settingsService.updateSettings({ [key]: newVal });
    setSettings(updated);
  };

  const handleThemeChange = (theme: UserSettings['theme']) => {
    const updated = settingsService.updateSettings({ theme });
    setSettings(updated);
  };

  const handleUpdateSettings = (updates: Partial<UserSettings>) => {
    const updated = settingsService.updateSettings(updates);
    setSettings(updated);
  };

  const refreshWorkspaceUsers = async () => {
    await userService.hydrateWorkspaceFromBackend(user.orgId);
    setAllUsers(userService.getUsers(user.orgId));
    setOrg(userService.getOrganization(user.orgId));
    setInvites(await userService.fetchInvitesFromBackend(user.orgId));
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError('');
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setProvisionError('Username and email are required.');
      return;
    }
    if ((newUserTempPassword || '').trim().length < 6) {
      setProvisionError('Temporary password must be at least 6 characters.');
      return;
    }

    const result = await userService.provisionUserRemote(user.orgId, newUserName, newUserRole, {
      firstName: newUserFirstName,
      lastName: newUserLastName,
      email: newUserEmail
    }, newUserTempPassword, true);
    if (result.success) {
      await refreshWorkspaceUsers();
      setNewUserName('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserEmail('');
      setNewUserRole('member');
      setNewUserTempPassword('TempPassword123');
      setIsProvisioning(false);
    } else {
      setProvisionError(result.error || 'Could not add seat.');
    }
  };

  const handleUpdateUserRole = async (userId: string, role: 'admin' | 'member') => {
    try {
      await apiRequest(`/orgs/${user.orgId}/users/role`, {
        method: 'PATCH',
        body: { userId, role }
      });
      await refreshWorkspaceUsers();
    } catch {
      const updatedAll = userService.updateUser(userId, { role });
      setAllUsers(updatedAll.filter(u => u.orgId === user.orgId));
    }
  };

  const handleStartEdit = (targetUser: UserType) => {
    const parts = (targetUser.displayName || '').trim().split(/\s+/).filter(Boolean);
    setEditingUserId(targetUser.id);
    setEditFirstNameValue(targetUser.firstName || parts[0] || '');
    setEditLastNameValue(targetUser.lastName || parts.slice(1).join(' '));
    setEditEmailValue(targetUser.email || '');
  };

  const handleCommitEdit = async () => {
    if (!editingUserId) return;
    const firstName = editFirstNameValue.trim();
    const lastName = editLastNameValue.trim();
    const email = editEmailValue.trim().toLowerCase();
    if (!firstName || !lastName || !email) return;
    const displayName = `${firstName} ${lastName}`.trim();
    const updatedAll = await userService.updateUserRemote(user.orgId, editingUserId, {
      firstName,
      lastName,
      email,
      displayName
    });
    if (updatedAll) {
      setAllUsers(updatedAll.filter(u => u.orgId === user.orgId));
    }
    setEditingUserId(null);
  };

  const handlePurgeUser = async (userId: string) => {
    if (userId === user.id) return;
    const confirmed = await dialogService.confirm('Remove this user permanently? This cannot be undone.', {
      title: 'Remove user',
      confirmText: 'Remove',
      danger: true
    });
    if (confirmed) {
      const allAfterDelete = await userService.deleteUserRemote(user.orgId, userId);
      if (allAfterDelete) {
        setAllUsers(allAfterDelete.filter(u => u.orgId === user.orgId));
      }
      await refreshWorkspaceUsers();
    }
  };

  const handleBuyMoreSeats = async () => {
    if (!org) return;
    const updatedOrg = await userService.addSeatsRemote(org.id, seatPurchaseCount);
    if (updatedOrg) setOrg(updatedOrg);
  };

  const handleCreateInvite = async () => {
    const cleanInviteEmail = newInviteIdentifier.trim().toLowerCase();
    if (!cleanInviteEmail) {
      await dialogService.notice('Enter the user work email before creating an invite.', { title: 'Invite required' });
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanInviteEmail);
    if (!emailOk) {
      await dialogService.notice('Enter a valid work email address.', { title: 'Invalid email' });
      return;
    }
    const result = await userService.createInviteRemote(user.orgId, {
      role: newInviteRole,
      invitedIdentifier: cleanInviteEmail,
      ttlDays: 14,
      maxUses: 1
    });
    if (!result.success || !result.invite) {
      await dialogService.notice(result.error || 'Could not create invite.', { title: 'Invite error' });
      return;
    }
    setInvites(await userService.fetchInvitesFromBackend(user.orgId));
    setNewInviteIdentifier('');
    const inviteLink = `${window.location.origin}/?invite=${encodeURIComponent(result.invite.token)}`;
    const deliveryStatus = (result.invite.deliveryStatus || 'pending').toLowerCase();
    try {
      await navigator.clipboard.writeText(inviteLink);
      if (deliveryStatus === 'sent') {
        await dialogService.notice(`Invite email sent and link copied:\n${inviteLink}`, { title: 'Invite created' });
      } else {
        await dialogService.notice(`Invite created, but email delivery is ${deliveryStatus.replace('_', ' ')}.\nLink copied:\n${inviteLink}`, { title: 'Invite created' });
      }
    } catch {
      await dialogService.notice(`Invite link:\n${inviteLink}`, { title: 'Invite created' });
    }
  };

  const handleAvatarUpdate = async (avatar: string) => {
    if (!user) return;
    const fallbackAvatar = (profileUser?.avatar || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`).trim();
    const nextAvatar = avatar.trim() || fallbackAvatar;
    const updatedAll = await userService.updateUserRemote(user.orgId, user.id, { avatar: nextAvatar });
    if (!updatedAll) return;
    const updatedCurrent = updatedAll.find((candidate) => candidate.id === user.id) || null;
    setAllUsers(updatedAll.filter((candidate) => candidate.orgId === user.orgId));
    if (updatedCurrent) {
      setProfileUser(updatedCurrent);
      onUserUpdated?.(updatedCurrent);
    }
    await dialogService.notice('Avatar updated.', { title: 'Profile' });
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    return userService.changePassword(currentPassword, newPassword, confirmPassword);
  };

  const handleUpdateProfileName = async (
    firstName: string,
    lastName: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Session unavailable.' };
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (!cleanFirst || !cleanLast) return { success: false, error: 'First and last name are required.' };
    const displayName = `${cleanFirst} ${cleanLast}`.trim();
    const updatedAll = await userService.updateUserRemote(user.orgId, user.id, {
      firstName: cleanFirst,
      lastName: cleanLast,
      displayName
    });
    if (!updatedAll) return { success: false, error: 'Could not update your profile.' };
    const updatedCurrent = updatedAll.find((candidate) => candidate.id === user.id) || null;
    setAllUsers(updatedAll.filter((candidate) => candidate.orgId === user.orgId));
    if (updatedCurrent) {
      setProfileUser(updatedCurrent);
      onUserUpdated?.(updatedCurrent);
    }
    return { success: true };
  };

  const refreshAiUsage = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const rows = await apiRequest<AiUsageRow[]>(`/orgs/${user.orgId}/usage/ai`);
      setAiUsageRows(rows);
    } catch {
      setAiUsageRows([]);
    }
  };

  const handleUpdateOrganizationSettings = async (
    patch: Partial<Pick<Organization, 'loginSubdomain' | 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected' | 'notificationSenderEmail'>>
  ) => {
    if (!user || user.role !== 'admin' || !org) return;
    const updated = await userService.updateOrganizationSettingsRemote(org.id, patch);
    if (updated) setOrg(updated);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const result = await userService.revokeInviteRemote(user.orgId, inviteId);
    if (!result.success) return;
    setInvites(await userService.fetchInvitesFromBackend(user.orgId));
  };

  const handleResendInvite = async (inviteId: string) => {
    const result = await userService.resendInviteRemote(user.orgId, inviteId);
    if (!result.success) {
      await dialogService.notice(result.error || 'Could not resend invite.', { title: 'Invite resend failed' });
      return;
    }
    setInvites(await userService.fetchInvitesFromBackend(user.orgId));
  };

  const submitProjectRename = () => {
    if (!editingProjectId || !onRenameProject) return;
    const trimmed = editingProjectName.trim();
    if (!trimmed) return;
    onRenameProject(editingProjectId, trimmed);
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const handleDeleteOrganization = async () => {
    if (!user || !onDeleteOrganization || user.role !== 'admin') return;
    const confirmed = await dialogService.confirm(
      'Delete this entire workspace and all related data? This action cannot be undone.',
      { title: 'Delete workspace', confirmText: 'Delete workspace', danger: true }
    );
    if (!confirmed) return;
    const result = await userService.deleteOrganizationRemote(user.orgId);
    if (!result.success) {
      await dialogService.notice(result.error || 'Could not delete workspace.', { title: 'Error' });
      return;
    }
    onDeleteOrganization?.();
    onClose();
  };

  const navItems = buildSettingsNavItems(user, canAccessWorkflowAutomation);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[60rem] rounded-none md:rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-200 h-[100dvh] md:h-[80vh] flex flex-col md:flex-row border-0 md:border border-slate-200">
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute right-3 top-3 md:right-4 md:top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex flex-col">
          <div className="p-3 md:p-4 md:pb-3">
            <h2 className="text-lg md:text-2xl font-black text-slate-900 flex items-center gap-2.5 md:gap-4 tracking-tighter">
              <div className="p-1.5 md:p-2.5 bg-indigo-600 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-200"><Settings className="w-4 h-4 md:w-6 md:h-6 text-white" /></div> Settings
            </h2>
          </div>
          <nav className="p-2.5 md:p-4 space-y-1.5 overflow-x-auto no-scrollbar md:overflow-y-auto md:flex-1">
            <div className="flex md:flex-col gap-2">
              {navItems.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as SettingsTabType)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-colors whitespace-nowrap min-w-max md:w-full ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'}`}>
                  <span className={`${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-400'}`}>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar scroll-smooth">
        <SettingsModalContent
          activeTab={activeTab}
          canAccessWorkflowAutomation={canAccessWorkflowAutomation}
          canManageWorkflowAutomation={canManageWorkflowAutomation}
              user={user}
              profileUser={profileUser}
              org={org}
              allUsers={allUsers}
              groups={[]}
              teams={teams}
              settings={settings}
              setTeams={setTeams}
              setGroups={() => undefined}
          projects={projects}
          workflowProjects={workflowVisibleProjects}
          projectTasks={projectTasks}
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
              onUpdateProject={onUpdateProject}
              onChangeProjectOwner={onChangeProjectOwner}
              onDeleteOrganization={handleDeleteOrganization}
              onToggle={handleToggle}
              onThemeChange={handleThemeChange}
              onUpdateSettings={handleUpdateSettings}
              onThresholdChange={(value) => {
                const updated = settingsService.updateSettings({ estimationApprovalThreshold: value });
                setSettings(updated);
              }}
              onAvatarUpdate={handleAvatarUpdate}
              onChangePassword={handleChangePassword}
              onUpdateProfileName={handleUpdateProfileName}
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
              newUserTempPassword={newUserTempPassword}
              setNewUserTempPassword={setNewUserTempPassword}
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
              handleResendInvite={handleResendInvite}
              refreshWorkspaceUsers={refreshWorkspaceUsers}
              aiUsageRows={aiUsageRows}
              refreshAiUsage={refreshAiUsage}
              onUpdateOrganizationSettings={handleUpdateOrganizationSettings}
            />
          </div>
          <div className="hidden md:flex px-4 py-3 md:px-6 md:py-4 border-t border-slate-200 bg-white flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
             <div className="flex flex-col text-center sm:text-left">
               <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">Version</p>
               <p className="text-[11px] font-medium text-slate-900 mt-0.5">Velo 3.0.1</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
