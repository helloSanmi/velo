import { Team } from '../../types';

export const TEAMS_KEY = 'velo_teams';

export const normalizeTeam = (team: Team): Team => ({
  ...team,
  name: (team.name || '').trim(),
  description: team.description?.trim() || undefined,
  memberIds: Array.from(new Set((team.memberIds || []).filter(Boolean))),
  createdAt: team.createdAt || Date.now(),
  updatedAt: team.updatedAt || Date.now()
});

export const readTeams = (): Team[] => {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Team[]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTeam).filter((team) => Boolean(team.id && team.orgId && team.name));
  } catch {
    return [];
  }
};

export const writeTeams = (teams: Team[]) => {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams.map(normalizeTeam)));
};
