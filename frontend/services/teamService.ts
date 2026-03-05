import { Team, User } from '../types';
import { createId } from '../utils/id';
import { realtimeService } from './realtimeService';
import { normalizeTeam, readTeams, TEAMS_KEY, writeTeams } from './team-service/store';
import {
  createTeamRemote as createTeamRemoteRequest,
  deleteTeamRemote as deleteTeamRemoteRequest,
  fetchTeamsFromBackendRemote,
  isAdminUser,
  updateTeamRemote as updateTeamRemoteRequest
} from './team-service/remote';

const emitTeamsUpdated = (orgId?: string, actorId?: string, teamId?: string) => {
  realtimeService.publish({
    type: 'TEAMS_UPDATED',
    orgId,
    actorId,
    payload: teamId ? { teamId } : undefined
  });
};

const ensureAdmin = (user: User): string | undefined => {
  if (!isAdminUser(user)) return 'Only admins can manage teams.';
  return undefined;
};

export const teamService = {
  fetchTeamsFromBackend: async (orgId: string): Promise<Team[]> => {
    try {
      return await fetchTeamsFromBackendRemote(orgId);
    } catch {
      return teamService.getTeams(orgId);
    }
  },

  createTeamRemote: async (
    user: User,
    orgId: string,
    payload: { name: string; description?: string; leadId?: string; memberIds?: string[] }
  ): Promise<{ team?: Team; error?: string }> => {
    const response = await createTeamRemoteRequest(orgId, payload);
    if (response.team) {
      emitTeamsUpdated(orgId, user.id, response.team.id);
      return response;
    }
    return response;
  },

  updateTeamRemote: async (
    user: User,
    orgId: string,
    teamId: string,
    updates: Partial<Pick<Team, 'name' | 'description' | 'leadId' | 'memberIds'>>
  ): Promise<{ team?: Team; error?: string }> => {
    const response = await updateTeamRemoteRequest(orgId, teamId, updates);
    if (response.team) {
      emitTeamsUpdated(orgId, user.id, response.team.id);
      return response;
    }
    return response;
  },

  deleteTeamRemote: async (user: User, orgId: string, teamId: string): Promise<{ success: boolean; error?: string }> => {
    const response = await deleteTeamRemoteRequest(orgId, teamId);
    if (response.success) {
      emitTeamsUpdated(orgId, user.id, teamId);
      return response;
    }
    return response;
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
