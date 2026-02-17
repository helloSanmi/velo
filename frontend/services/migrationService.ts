import { OrgInvite, Organization, Project, SecurityGroup, Task, Team, User } from '../types';
import { DEFAULT_PROJECT_STAGES } from './projectService';

const SCHEMA_VERSION_KEY = 'velo_schema_version';
const CURRENT_SCHEMA_VERSION = 8;
const TASKS_KEY = 'velo_data';
const PROJECTS_KEY = 'velo_projects';
const USERS_KEY = 'velo_users';
const ORGS_KEY = 'velo_orgs';
const INVITES_KEY = 'velo_org_invites';
const GROUPS_KEY = 'velo_security_groups';
const TEAMS_KEY = 'velo_teams';

const safeParse = <T>(raw: string | null, fallback: T): T => {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeLegacyAuditAction = (action: string): string => {
  if (!action) return 'updated task';
  if (action === 'Node initialized') return 'created this task';
  if (action.startsWith('Reconfigured ')) {
    const key = action.replace('Reconfigured ', '');
    const labels: Record<string, string> = {
      title: 'title',
      description: 'description',
      status: 'status',
      priority: 'priority',
      tags: 'tags',
      dueDate: 'due date',
      assigneeId: 'assignee',
      assigneeIds: 'assignees',
      comments: 'comments',
      subtasks: 'subtasks',
      blockedByIds: 'dependencies',
      securityGroupIds: 'security groups',
      timeLogged: 'time tracked'
    };
    return `updated ${labels[key] || key}`;
  }
  return action;
};

const normalizeTask = (task: Task): Task => ({
  ...task,
  assigneeIds: Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0 ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [],
  assigneeId: Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0 ? task.assigneeIds[0] : task.assigneeId,
  comments: task.comments || [],
  auditLog: (task.auditLog || []).map((entry) => ({
    ...entry,
    action: normalizeLegacyAuditAction(entry.action || ''),
    displayName: entry.displayName || 'Unknown user',
    timestamp: entry.timestamp || task.updatedAt || task.createdAt || Date.now()
  })),
  subtasks: task.subtasks || [],
  tags: task.tags || [],
  blockedByIds: task.blockedByIds || [],
  securityGroupIds: Array.isArray(task.securityGroupIds) ? Array.from(new Set(task.securityGroupIds.filter(Boolean))) : [],
  timeLogged: task.timeLogged || 0,
  estimateMinutes:
    typeof task.estimateMinutes === 'number' && Number.isFinite(task.estimateMinutes) && task.estimateMinutes > 0
      ? Math.round(task.estimateMinutes)
      : undefined,
  estimateProvidedBy: task.estimateProvidedBy || task.userId,
  estimateProvidedAt: task.estimateProvidedAt || task.createdAt || Date.now(),
  actualMinutes:
    typeof task.actualMinutes === 'number' && Number.isFinite(task.actualMinutes) && task.actualMinutes > 0
      ? Math.round(task.actualMinutes)
      : task.status === 'done' && task.timeLogged
        ? Math.max(1, Math.round((task.timeLogged || 0) / 60000))
        : undefined,
  updatedAt: task.updatedAt || task.createdAt || Date.now(),
  version: Number.isFinite(task.version as number) ? Math.max(1, Number(task.version)) : 1
});

const normalizeTaskWithGroups = (task: Task, groups: SecurityGroup[]): Task => {
  const normalizedTask = normalizeTask(task);
  const validGroupIds = new Set(
    groups
      .filter((group) => group.orgId === normalizedTask.orgId)
      .map((group) => group.id)
  );
  return {
    ...normalizedTask,
    securityGroupIds: (normalizedTask.securityGroupIds || []).filter((groupId) => validGroupIds.has(groupId))
  };
};

const normalizeProject = (project: Project, users: User[]): Project => ({
  ...project,
  createdBy:
    project.createdBy ||
    project.members?.[0] ||
    users.find((user) => user.orgId === project.orgId && user.role === 'admin')?.id,
  ownerIds: Array.from(
    new Set(
      [
        ...(Array.isArray(project.ownerIds) ? project.ownerIds : []),
        ...(project.createdBy ? [project.createdBy] : [])
      ].filter(Boolean)
    )
  ),
  members: project.members || [],
  stages: Array.isArray(project.stages) && project.stages.length > 0 ? project.stages : DEFAULT_PROJECT_STAGES,
  hourlyRate:
    typeof project.hourlyRate === 'number' && Number.isFinite(project.hourlyRate)
      ? Math.max(0, project.hourlyRate)
      : undefined,
  updatedAt: project.updatedAt || Date.now(),
  version: Number.isFinite(project.version as number) ? Math.max(1, Number(project.version)) : 1
});

const normalizeUser = (user: User): User => ({
  ...user,
  role: user.role || 'member'
});

const normalizeGroup = (group: SecurityGroup): SecurityGroup => ({
  ...group,
  name: (group.name || '').trim(),
  scope: group.scope === 'project' ? 'project' : 'global',
  projectId: group.scope === 'project' ? group.projectId : undefined,
  memberIds: Array.isArray(group.memberIds) ? Array.from(new Set(group.memberIds.filter(Boolean))) : [],
  createdAt: group.createdAt || Date.now(),
  updatedAt: group.updatedAt || Date.now()
});

const normalizeTeam = (team: Team): Team => ({
  ...team,
  name: (team.name || '').trim(),
  description: team.description?.trim() || undefined,
  memberIds: Array.isArray(team.memberIds) ? Array.from(new Set(team.memberIds.filter(Boolean))) : [],
  createdAt: team.createdAt || Date.now(),
  updatedAt: team.updatedAt || Date.now()
});

const normalizeOrg = (org: Organization): Organization => ({
  ...org,
  totalSeats: Number.isFinite(org.totalSeats) ? Math.max(1, Math.round(org.totalSeats)) : 3,
  plan: org.plan || 'basic',
  seatPrice: Number.isFinite(org.seatPrice as number) ? Math.max(0, Number(org.seatPrice)) : (org.plan === 'pro' ? 7 : org.plan === 'free' ? 0 : 5),
  billingCurrency: org.billingCurrency || 'USD'
});

const normalizeInvite = (invite: OrgInvite): OrgInvite => ({
  ...invite,
  role: invite.role === 'admin' ? 'admin' : 'member',
  createdAt: invite.createdAt || Date.now(),
  expiresAt: invite.expiresAt || (Date.now() + 14 * 24 * 60 * 60 * 1000),
  maxUses: Number.isFinite(invite.maxUses as number) ? Math.max(1, Math.round(Number(invite.maxUses))) : 1,
  usedCount: Number.isFinite(invite.usedCount as number) ? Math.max(0, Math.round(Number(invite.usedCount))) : 0,
  invitedIdentifier: invite.invitedIdentifier?.trim() || undefined
});

export const migrationService = {
  run: () => {
    const currentVersion = Number(localStorage.getItem(SCHEMA_VERSION_KEY) || '0');
    if (currentVersion >= CURRENT_SCHEMA_VERSION) return;

    const users = safeParse<User[]>(localStorage.getItem(USERS_KEY), []).map(normalizeUser);
    const orgs = safeParse<Organization[]>(localStorage.getItem(ORGS_KEY), []).map(normalizeOrg);
    const invites = safeParse<OrgInvite[]>(localStorage.getItem(INVITES_KEY), []).map(normalizeInvite);
    const rawTasks = safeParse<Task[]>(localStorage.getItem(TASKS_KEY), []);
    const projects = safeParse<Project[]>(localStorage.getItem(PROJECTS_KEY), []).map((project) =>
      normalizeProject(project, users)
    );
    const groups = safeParse<SecurityGroup[]>(localStorage.getItem(GROUPS_KEY), []).map(normalizeGroup);
    const tasks = rawTasks.map((task) => normalizeTaskWithGroups(task, groups));
    const teams = safeParse<Team[]>(localStorage.getItem(TEAMS_KEY), []).map(normalizeTeam);

    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(ORGS_KEY, JSON.stringify(orgs));
    localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
    localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  }
};
