import { useEffect, useMemo, useState } from 'react';
import { settingsService, UserSettings } from '../../services/settingsService';
import { userService } from '../../services/userService';
import { teamService } from '../../services/teamService';
import { realtimeService } from '../../services/realtimeService';
import { apiRequest } from '../../services/apiClient';
import { OrgInvite, Team, User as UserType, Organization, Project, Task } from '../../types';
import {
  canAccessWorkflowAutomation as canAccessWorkflowAutomationByRole,
  canManageWorkflowAutomation as canManageWorkflowAutomationByRole,
  getWorkflowOwnerProjectIds,
  getWorkflowVisibleProjects
} from '../../services/settingsAccessService';
import { getPlanFeatures, normalizeWorkspacePlan } from '../../services/planFeatureService';
import { SettingsTabType } from './settingsModal.types';

interface AiUsageRow {
  id: string;
  orgId: string;
  dayKey: string;
  requestsUsed: number;
  tokensUsed: number;
  warningIssuedAt?: string | null;
  blockedAt?: string | null;
}

interface UseSettingsModalDataArgs {
  isOpen: boolean;
  initialTab: SettingsTabType;
  user?: UserType;
  projects: Project[];
  projectTasks: Task[];
}

export const useSettingsModalData = ({ isOpen, initialTab, user, projects, projectTasks }: UseSettingsModalDataArgs) => {
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
    if (!isOpen || !user) return;
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
      apiRequest<AiUsageRow[]>(`/orgs/${user.orgId}/usage/ai`).then(setAiUsageRows).catch(() => setAiUsageRows([]));
    } else {
      setAiUsageRows([]);
    }
    setEditingUserId(null);
    setNewUserTempPassword('TempPassword123');
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
    return q ? projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(q)) : projects;
  }, [projects, projectQuery]);

  const activeProjects = filteredProjects.filter((project) => !project.isArchived && !project.isCompleted && !project.isDeleted);
  const archivedProjects = filteredProjects.filter((project) => project.isArchived && !project.isDeleted);
  const completedProjects = filteredProjects.filter((project) => project.isCompleted && !project.isDeleted);
  const deletedProjects = filteredProjects.filter((project) => project.isDeleted);

  const focusedProject = projects.find((project) => project.id === focusedProjectId) || null;
  const focusedProjectTasks = useMemo(
    () => (focusedProject ? projectTasks.filter((task) => task.projectId === focusedProject.id) : []),
    [projectTasks, focusedProject]
  );

  const workflowOwnerProjectIds = useMemo(() => getWorkflowOwnerProjectIds(user, projects), [projects, user]);
  const workflowVisibleProjects = useMemo(() => getWorkflowVisibleProjects(user, projects, projectTasks), [projects, projectTasks, user]);
  const planFeatures = useMemo(() => getPlanFeatures(normalizeWorkspacePlan(org?.plan)), [org?.plan]);
  const workflowPlanEnabled = planFeatures.workflows;
  const integrationsPlanEnabled = planFeatures.integrations;
  const workflowAccessByRole = canAccessWorkflowAutomationByRole(user, workflowVisibleProjects);
  const canAccessWorkflowAutomation = workflowPlanEnabled && workflowAccessByRole;
  const canManageWorkflowAutomation = workflowPlanEnabled && canManageWorkflowAutomationByRole(user, workflowOwnerProjectIds);

  return {
    activeTab,
    setActiveTab,
    settings,
    setSettings,
    profileUser,
    setProfileUser,
    allUsers,
    setAllUsers,
    teams,
    setTeams,
    invites,
    setInvites,
    org,
    setOrg,
    aiUsageRows,
    setAiUsageRows,
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
    newUserTempPassword,
    setNewUserTempPassword,
    newInviteIdentifier,
    setNewInviteIdentifier,
    newInviteRole,
    setNewInviteRole,
    seatPurchaseCount,
    setSeatPurchaseCount,
    provisionError,
    setProvisionError,
    isProvisioning,
    setIsProvisioning,
    editingUserId,
    setEditingUserId,
    editFirstNameValue,
    setEditFirstNameValue,
    editLastNameValue,
    setEditLastNameValue,
    editEmailValue,
    setEditEmailValue,
    projectQuery,
    setProjectQuery,
    editingProjectId,
    setEditingProjectId,
    editingProjectName,
    setEditingProjectName,
    focusedProjectId,
    setFocusedProjectId,
    activeProjects,
    archivedProjects,
    completedProjects,
    deletedProjects,
    focusedProject,
    focusedProjectTasks,
    workflowVisibleProjects,
    workflowAccessByRole,
    workflowPlanEnabled,
    integrationsPlanEnabled,
    canAccessWorkflowAutomation,
    canManageWorkflowAutomation
  };
};
