import { User as UserType } from '../../types';

export type DirectoryEntry = {
  externalId: string;
  email: string;
  displayName: string;
  provider: 'microsoft';
  firstName?: string;
  lastName?: string;
  avatar?: string;
};

export type SettingsAdminRow =
  | {
      key: string;
      source: 'workspace';
      displayName: string;
      email: string;
      role: 'admin' | 'member' | 'guest';
      licensed: boolean;
      member: UserType;
    }
  | {
      key: string;
      source: 'directory';
      provider: 'microsoft';
      displayName: string;
      email: string;
      licensed: false;
      entry: DirectoryEntry;
    };

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

const emailLocalPart = (value: string) => normalizeEmail(value).split('@')[0] || '';
const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export const buildSettingsAdminRows = (allUsers: UserType[], directoryUsers: DirectoryEntry[]): SettingsAdminRow[] => {
  const usersByEmail = allUsers.reduce<Record<string, UserType>>((acc, member) => {
    if (member.email) acc[normalizeEmail(member.email)] = member;
    return acc;
  }, {});

  const usersByMicrosoftSubject = allUsers.reduce<Record<string, UserType>>((acc, member) => {
    const subject = (member.microsoftSubject || '').trim();
    if (subject) acc[subject] = member;
    return acc;
  }, {});

  const usersByNameAndLocalPart = allUsers.reduce<Record<string, UserType>>((acc, member) => {
    if (!member.email) return acc;
    const key = `${normalizeName(member.displayName || '')}|${emailLocalPart(member.email)}`;
    if (key !== '|') acc[key] = member;
    return acc;
  }, {});

  const workspaceRows: SettingsAdminRow[] = allUsers.map((member) => ({
    key: `usr:${member.id}`,
    source: 'workspace',
    displayName: member.displayName,
    email: member.email || '',
    role: (member.role || 'member') as 'admin' | 'member' | 'guest',
    licensed: member.licenseActive !== false,
    member
  }));

  const directoryRows: SettingsAdminRow[] = directoryUsers
    .filter((entry) => {
      const byEmail = usersByEmail[normalizeEmail(entry.email)];
      if (byEmail) return false;
      if (entry.externalId && usersByMicrosoftSubject[entry.externalId]) return false;
      const nameAndLocalKey = `${normalizeName(entry.displayName || '')}|${emailLocalPart(entry.email)}`;
      if (usersByNameAndLocalPart[nameAndLocalKey]) return false;
      return true;
    })
    .map((entry) => ({
      key: `dir:${entry.externalId || normalizeEmail(entry.email)}`,
      source: 'directory',
      provider: entry.provider,
      displayName: entry.displayName,
      email: entry.email,
      licensed: false,
      entry
    }));

  return [...workspaceRows, ...directoryRows];
};

export const filterSettingsAdminRows = (rows: SettingsAdminRow[], search: string): SettingsAdminRow[] => {
  const q = search.trim().toLowerCase();
  return q ? rows.filter((row) => `${row.displayName} ${row.email}`.toLowerCase().includes(q)) : rows;
};
