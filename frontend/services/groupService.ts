import { Project, SecurityGroup, User } from '../types';
import { createId } from '../utils/id';
import { realtimeService } from './realtimeService';
import { apiRequest } from './apiClient';

const GROUPS_KEY = 'velo_security_groups';

const normalizeGroup = (group: SecurityGroup): SecurityGroup => ({
  ...group,
  name: (group.name || '').trim(),
  scope: group.scope === 'project' ? 'project' : 'global',
  projectId: group.scope === 'project' ? group.projectId : undefined,
  memberIds: Array.from(new Set((group.memberIds || []).filter(Boolean))),
  createdAt: group.createdAt || Date.now(),
  updatedAt: group.updatedAt || Date.now()
});

const readGroups = (): SecurityGroup[] => {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    const parsed = raw ? (JSON.parse(raw) as SecurityGroup[]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeGroup).filter((group) => Boolean(group.id && group.orgId && group.name));
  } catch {
    return [];
  }
};

const writeGroups = (groups: SecurityGroup[]) => {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups.map(normalizeGroup)));
};

const emitGroupsUpdated = (orgId?: string, actorId?: string, groupId?: string) => {
  realtimeService.publish({
    type: 'GROUPS_UPDATED',
    orgId,
    actorId,
    payload: groupId ? { groupId } : undefined
  });
};

const getProjectOwnerIds = (project?: Project): string[] => {
  if (!project) return [];
  const fromOwnerIds = Array.isArray(project.ownerIds) ? project.ownerIds.filter(Boolean) : [];
  const primary = project.createdBy;
  return Array.from(new Set([...(primary ? [primary] : []), ...fromOwnerIds]));
};

const canManageProjectGroup = (user: User, project?: Project) => {
  if (user.role === 'admin') return true;
  if (!project) return false;
  return getProjectOwnerIds(project).includes(user.id);
};

const filterMemberIdsForProject = (memberIds: string[], project?: Project) => {
  const unique = Array.from(new Set(memberIds.filter(Boolean)));
  if (!project) return unique;
  const members = new Set(project.members || []);
  return unique.filter((id) => members.has(id));
};

export const groupService = {
  fetchGroupsFromBackend: async (orgId: string): Promise<SecurityGroup[]> => {
    try {
      const rows = await apiRequest<any[]>(`/orgs/${orgId}/groups`);
      const mapped = rows.map((row) =>
        normalizeGroup({
          id: row.id,
          orgId: row.orgId,
          name: row.name,
          scope: row.scope,
          projectId: row.projectId || undefined,
          memberIds: Array.isArray(row.memberIds) ? row.memberIds : [],
          createdBy: row.createdBy,
          createdAt: new Date(row.createdAt).getTime(),
          updatedAt: new Date(row.updatedAt).getTime()
        })
      );
      writeGroups(mapped);
      return mapped;
    } catch {
      return groupService.getGroups(orgId);
    }
  },

  createGroupRemote: async (
    user: User,
    orgId: string,
    payload: { name: string; scope: 'global' | 'project'; projectId?: string; memberIds: string[] }
  ): Promise<{ group?: SecurityGroup; error?: string }> => {
    try {
      const row = await apiRequest<any>(`/orgs/${orgId}/groups`, {
        method: 'POST',
        body: payload
      });
      const group = normalizeGroup({
        id: row.id,
        orgId: row.orgId,
        name: row.name,
        scope: row.scope,
        projectId: row.projectId || undefined,
        memberIds: Array.isArray(row.memberIds) ? row.memberIds : [],
        createdBy: row.createdBy,
        createdAt: new Date(row.createdAt).getTime(),
        updatedAt: new Date(row.updatedAt).getTime()
      });
      writeGroups([...readGroups().filter((item) => item.id !== group.id), group]);
      emitGroupsUpdated(orgId, user.id, group.id);
      return { group };
    } catch (error: any) {
      return { error: error?.message || 'Could not create group.' };
    }
  },

  updateGroupRemote: async (
    user: User,
    orgId: string,
    groupId: string,
    updates: Partial<Pick<SecurityGroup, 'name' | 'memberIds'>>
  ): Promise<{ group?: SecurityGroup; error?: string }> => {
    try {
      const row = await apiRequest<any>(`/orgs/${orgId}/groups/${groupId}`, {
        method: 'PATCH',
        body: updates
      });
      const group = normalizeGroup({
        id: row.id,
        orgId: row.orgId,
        name: row.name,
        scope: row.scope,
        projectId: row.projectId || undefined,
        memberIds: Array.isArray(row.memberIds) ? row.memberIds : [],
        createdBy: row.createdBy,
        createdAt: new Date(row.createdAt).getTime(),
        updatedAt: new Date(row.updatedAt).getTime()
      });
      writeGroups(readGroups().map((item) => (item.id === group.id ? group : item)));
      emitGroupsUpdated(orgId, user.id, group.id);
      return { group };
    } catch (error: any) {
      return { error: error?.message || 'Could not update group.' };
    }
  },

  deleteGroupRemote: async (user: User, orgId: string, groupId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiRequest(`/orgs/${orgId}/groups/${groupId}`, { method: 'DELETE' });
      writeGroups(readGroups().filter((item) => item.id !== groupId));
      emitGroupsUpdated(orgId, user.id, groupId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Could not delete group.' };
    }
  },

  getGroups: (orgId?: string): SecurityGroup[] => {
    const all = readGroups();
    if (!orgId) return all;
    return all.filter((group) => group.orgId === orgId);
  },

  getAssignableGroupsForProject: (orgId: string, projectId?: string): SecurityGroup[] => {
    return groupService
      .getGroups(orgId)
      .filter((group) => group.scope === 'global' || (group.scope === 'project' && group.projectId === projectId))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  resolveAssigneeIdsFromGroups: (
    orgId: string,
    projectId: string | undefined,
    directAssigneeIds: string[] = [],
    securityGroupIds: string[] = [],
    users: User[] = [],
    _projects: Project[] = []
  ): { assigneeIds: string[]; securityGroupIds: string[] } => {
    const available = groupService.getAssignableGroupsForProject(orgId, projectId);
    const availableIds = new Set(available.map((group) => group.id));
    const validGroupIds = Array.from(new Set(securityGroupIds.filter((id) => availableIds.has(id))));
    const byId = new Map(available.map((group) => [group.id, group]));
    const allowedUserIds = new Set(users.map((user) => user.id));
    // Assignment should allow any organization user; project membership is for visibility, not assignment eligibility.
    const resolved = new Set<string>();

    directAssigneeIds.filter(Boolean).forEach((id) => {
      if (!allowedUserIds.has(id)) return;
      resolved.add(id);
    });

    validGroupIds.forEach((groupId) => {
      const group = byId.get(groupId);
      if (!group) return;
      group.memberIds.forEach((id) => {
        if (!allowedUserIds.has(id)) return;
        resolved.add(id);
      });
    });

    return {
      assigneeIds: Array.from(resolved),
      securityGroupIds: validGroupIds
    };
  },

  createGroup: (
    user: User,
    orgId: string,
    payload: { name: string; scope: 'global' | 'project'; projectId?: string; memberIds: string[] },
    projects: Project[]
  ): { group?: SecurityGroup; error?: string } => {
    const name = payload.name.trim();
    if (!name) return { error: 'Group name is required.' };

    const scope = payload.scope;
    if (scope === 'global' && user.role !== 'admin') {
      return { error: 'Only admins can create global groups.' };
    }

    const project = scope === 'project' ? projects.find((item) => item.id === payload.projectId) : undefined;
    if (scope === 'project' && !project) {
      return { error: 'Choose a valid project for this group.' };
    }
    if (scope === 'project' && !canManageProjectGroup(user, project)) {
      return { error: 'Only the project owner or admin can create project groups.' };
    }

    const all = readGroups();
    const next: SecurityGroup = normalizeGroup({
      id: createId(),
      orgId,
      name,
      scope,
      projectId: scope === 'project' ? payload.projectId : undefined,
      memberIds: scope === 'project' ? filterMemberIdsForProject(payload.memberIds, project) : Array.from(new Set(payload.memberIds.filter(Boolean))),
      createdBy: user.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    writeGroups([...all, next]);
    emitGroupsUpdated(orgId, user.id, next.id);
    return { group: next };
  },

  updateGroup: (
    user: User,
    groupId: string,
    updates: Partial<Pick<SecurityGroup, 'name' | 'memberIds'>>,
    projects: Project[]
  ): { group?: SecurityGroup; error?: string } => {
    const all = readGroups();
    const group = all.find((item) => item.id === groupId);
    if (!group) return { error: 'Group not found.' };

    const project = group.scope === 'project' ? projects.find((item) => item.id === group.projectId) : undefined;
    if (group.scope === 'global' && user.role !== 'admin') {
      return { error: 'Only admins can edit global groups.' };
    }
    if (group.scope === 'project' && !canManageProjectGroup(user, project)) {
      return { error: 'Only the project owner or admin can edit this group.' };
    }

    let nextName = group.name;
    if (typeof updates.name === 'string') {
      const trimmed = updates.name.trim();
      if (!trimmed) return { error: 'Group name is required.' };
      nextName = trimmed;
    }

    let nextMemberIds = group.memberIds;
    if (Array.isArray(updates.memberIds)) {
      nextMemberIds =
        group.scope === 'project'
          ? filterMemberIdsForProject(updates.memberIds, project)
          : Array.from(new Set(updates.memberIds.filter(Boolean)));
    }

    let updatedGroup: SecurityGroup | undefined;
    const updated = all.map((item) => {
      if (item.id !== groupId) return item;
      updatedGroup = normalizeGroup({
        ...item,
        name: nextName,
        memberIds: nextMemberIds,
        updatedAt: Date.now()
      });
      return updatedGroup;
    });
    writeGroups(updated);
    emitGroupsUpdated(group.orgId, user.id, groupId);
    return { group: updatedGroup };
  },

  deleteGroup: (user: User, groupId: string, projects: Project[]): { success: boolean; error?: string } => {
    const all = readGroups();
    const group = all.find((item) => item.id === groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    const project = group.scope === 'project' ? projects.find((item) => item.id === group.projectId) : undefined;
    if (group.scope === 'global' && user.role !== 'admin') {
      return { success: false, error: 'Only admins can delete global groups.' };
    }
    if (group.scope === 'project' && !canManageProjectGroup(user, project)) {
      return { success: false, error: 'Only the project owner or admin can delete this group.' };
    }

    writeGroups(all.filter((item) => item.id !== groupId));
    emitGroupsUpdated(group.orgId, user.id, groupId);
    return { success: true };
  },

  storageKey: GROUPS_KEY
};
