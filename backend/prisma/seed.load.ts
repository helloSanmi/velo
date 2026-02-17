import { promises as fs } from 'fs';
import path from 'path';
import { SeedData, JsonOrg, JsonUser, JsonProject, JsonTask, JsonGroup, JsonTeam, JsonInvite } from './seed.types.js';

const dataDir = path.resolve(process.cwd(), 'data');

const readJson = async <T>(name: string): Promise<T> => {
  const raw = await fs.readFile(path.join(dataDir, name), 'utf8');
  return JSON.parse(raw) as T;
};

export const loadSeedData = async (): Promise<SeedData> => {
  const [orgs, users, projects, tasks, groups, teams, invites] = await Promise.all([
    readJson<JsonOrg[]>('orgs.json'),
    readJson<JsonUser[]>('users.json'),
    readJson<JsonProject[]>('projects.json'),
    readJson<JsonTask[]>('tasks.json'),
    readJson<JsonGroup[]>('groups.json'),
    readJson<JsonTeam[]>('teams.json'),
    readJson<JsonInvite[]>('invites.json')
  ]);
  return { orgs, users, projects, tasks, groups, teams, invites };
};

