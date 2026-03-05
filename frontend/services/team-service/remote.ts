import { Team, User } from '../../types';
import { apiRequest } from '../apiClient';
import { mapApiTeam } from './mappers';
import { readTeams, writeTeams } from './store';

const formatError = (error: any, fallback: string) => error?.message || fallback;

export const fetchTeamsFromBackendRemote = async (orgId: string): Promise<Team[]> => {
  const rows = await apiRequest<any[]>(`/orgs/${orgId}/teams`);
  const mapped = rows.map(mapApiTeam);
  writeTeams(mapped);
  return mapped;
};

export const createTeamRemote = async (
  orgId: string,
  payload: { name: string; description?: string; leadId?: string; memberIds?: string[] }
): Promise<{ team?: Team; error?: string }> => {
  try {
    const row = await apiRequest<any>(`/orgs/${orgId}/teams`, {
      method: 'POST',
      body: payload
    });
    const team = mapApiTeam(row);
    writeTeams([...readTeams().filter((item) => item.id !== team.id), team]);
    return { team };
  } catch (error: any) {
    return { error: formatError(error, 'Could not create team.') };
  }
};

export const updateTeamRemote = async (
  orgId: string,
  teamId: string,
  updates: Partial<Pick<Team, 'name' | 'description' | 'leadId' | 'memberIds'>>
): Promise<{ team?: Team; error?: string }> => {
  try {
    const row = await apiRequest<any>(`/orgs/${orgId}/teams/${teamId}`, {
      method: 'PATCH',
      body: updates
    });
    const team = mapApiTeam(row);
    writeTeams(readTeams().map((item) => (item.id === team.id ? team : item)));
    return { team };
  } catch (error: any) {
    return { error: formatError(error, 'Could not update team.') };
  }
};

export const deleteTeamRemote = async (orgId: string, teamId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiRequest(`/orgs/${orgId}/teams/${teamId}`, { method: 'DELETE' });
    writeTeams(readTeams().filter((item) => item.id !== teamId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: formatError(error, 'Could not delete team.') };
  }
};

export const isAdminUser = (user: User): boolean => user.role === 'admin';
