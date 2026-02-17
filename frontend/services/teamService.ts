import { Team, User } from '../types';
import { createId } from '../utils/id';
import { realtimeService } from './realtimeService';
import { apiRequest } from './apiClient';

const TEAMS_KEY = 'velo_teams';

const normalizeTeam = (team: Team): Team => ({
  ...team,
  name: (team.name || '').trim(),
  description: team.description?.trim() || undefined,
  memberIds: Array.from(new Set((team.memberIds || []).filter(Boolean))),
  createdAt: team.createdAt || Date.now(),
  updatedAt: team.updatedAt || Date.now()
});

const readTeams = (): Team[] => {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Team[]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTeam).filter((team) => Boolean(team.id && team.orgId && team.name));
  } catch {
    return [];
  }
};

const writeTeams = (teams: Team[]) => {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams.map(normalizeTeam)));
};

const emitTeamsUpdated = (orgId?: string, actorId?: string, teamId?: string) => {
  realtimeService.publish({
    type: 'TEAMS_UPDATED',
    orgId,
    actorId,
    payload: teamId ? { teamId } : undefined
  });
};

const ensureAdmin = (user: User): string | undefined => {
  if (user.role !== 'admin') return 'Only admins can manage teams.';
  return undefined;
};

export const teamService = {
  fetchTeamsFromBackend: async (orgId: string): Promise<Team[]> => {
    try {
      const rows = await apiRequest<any[]>(`/orgs/${orgId}/teams`);
      const mapped = rows.map((team) =>
        normalizeTeam({
          id: team.id,
          orgId: team.orgId,
          name: team.name,
          description: team.description || undefined,
          leadId: team.leadId || undefined,
          memberIds: Array.isArray(team.memberIds) ? team.memberIds : [],
          createdBy: team.createdBy,
          createdAt: new Date(team.createdAt).getTime(),
          updatedAt: new Date(team.updatedAt).getTime()
        })
      );
      writeTeams(mapped);
      return mapped;
    } catch {
      return teamService.getTeams(orgId);
    }
  },

  createTeamRemote: async (
    user: User,
    orgId: string,
    payload: { name: string; description?: string; leadId?: string; memberIds?: string[] }
  ): Promise<{ team?: Team; error?: string }> => {
    try {
      const row = await apiRequest<any>(`/orgs/${orgId}/teams`, {
        method: 'POST',
        body: payload
      });
      const team = normalizeTeam({
        id: row.id,
        orgId: row.orgId,
        name: row.name,
        description: row.description || undefined,
        leadId: row.leadId || undefined,
        memberIds: Array.isArray(row.memberIds) ? row.memberIds : [],
        createdBy: row.createdBy,
        createdAt: new Date(row.createdAt).getTime(),
        updatedAt: new Date(row.updatedAt).getTime()
      });
      writeTeams([...readTeams().filter((item) => item.id !== team.id), team]);
      emitTeamsUpdated(orgId, user.id, team.id);
      return { team };
    } catch (error: any) {
      return { error: error?.message || 'Could not create team.' };
    }
  },

  updateTeamRemote: async (
    user: User,
    orgId: string,
    teamId: string,
    updates: Partial<Pick<Team, 'name' | 'description' | 'leadId' | 'memberIds'>>
  ): Promise<{ team?: Team; error?: string }> => {
    try {
      const row = await apiRequest<any>(`/orgs/${orgId}/teams/${teamId}`, {
        method: 'PATCH',
        body: updates
      });
      const team = normalizeTeam({
        id: row.id,
        orgId: row.orgId,
        name: row.name,
        description: row.description || undefined,
        leadId: row.leadId || undefined,
        memberIds: Array.isArray(row.memberIds) ? row.memberIds : [],
        createdBy: row.createdBy,
        createdAt: new Date(row.createdAt).getTime(),
        updatedAt: new Date(row.updatedAt).getTime()
      });
      writeTeams(readTeams().map((item) => (item.id === team.id ? team : item)));
      emitTeamsUpdated(orgId, user.id, team.id);
      return { team };
    } catch (error: any) {
      return { error: error?.message || 'Could not update team.' };
    }
  },

  deleteTeamRemote: async (user: User, orgId: string, teamId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiRequest(`/orgs/${orgId}/teams/${teamId}`, { method: 'DELETE' });
      writeTeams(readTeams().filter((item) => item.id !== teamId));
      emitTeamsUpdated(orgId, user.id, teamId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Could not delete team.' };
    }
  },

  getTeams: (orgId?: string): Team[] => {
    const all = readTeams();
    if (!orgId) return all;
    return all
      .filter((team) => team.orgId === orgId)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  createTeam: (
    user: User,
    orgId: string,
    payload: { name: string; description?: string; leadId?: string; memberIds?: string[] }
  ): { team?: Team; error?: string } => {
    const authError = ensureAdmin(user);
    if (authError) return { error: authError };
    const name = payload.name.trim();
    if (!name) return { error: 'Team name is required.' };
    const memberIds = Array.from(new Set((payload.memberIds || []).filter(Boolean)));
    const leadId = payload.leadId || memberIds[0];
    const next: Team = normalizeTeam({
      id: createId(),
      orgId,
      name,
      description: payload.description,
      leadId,
      memberIds: leadId ? Array.from(new Set([...memberIds, leadId])) : memberIds,
      createdBy: user.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    const all = readTeams();
    writeTeams([...all, next]);
    emitTeamsUpdated(orgId, user.id, next.id);
    return { team: next };
  },

  updateTeam: (
    user: User,
    teamId: string,
    updates: Partial<Pick<Team, 'name' | 'description' | 'leadId' | 'memberIds'>>
  ): { team?: Team; error?: string } => {
    const authError = ensureAdmin(user);
    if (authError) return { error: authError };
    const all = readTeams();
    const current = all.find((team) => team.id === teamId);
    if (!current) return { error: 'Team not found.' };
    const nextName = typeof updates.name === 'string' ? updates.name.trim() : current.name;
    if (!nextName) return { error: 'Team name is required.' };
    const nextMembers = Array.isArray(updates.memberIds)
      ? Array.from(new Set(updates.memberIds.filter(Boolean)))
      : current.memberIds;
    const nextLead = typeof updates.leadId === 'string' ? updates.leadId : current.leadId;
    const next: Team = normalizeTeam({
      ...current,
      name: nextName,
      description: typeof updates.description === 'string' ? updates.description : current.description,
      leadId: nextLead,
      memberIds: nextLead ? Array.from(new Set([...nextMembers, nextLead])) : nextMembers,
      updatedAt: Date.now()
    });
    writeTeams(all.map((team) => (team.id === teamId ? next : team)));
    emitTeamsUpdated(current.orgId, user.id, teamId);
    return { team: next };
  },

  deleteTeam: (user: User, teamId: string): { success: boolean; error?: string } => {
    const authError = ensureAdmin(user);
    if (authError) return { success: false, error: authError };
    const all = readTeams();
    const current = all.find((team) => team.id === teamId);
    if (!current) return { success: false, error: 'Team not found.' };
    writeTeams(all.filter((team) => team.id !== teamId));
    emitTeamsUpdated(current.orgId, user.id, teamId);
    return { success: true };
  },

  storageKey: TEAMS_KEY
};
