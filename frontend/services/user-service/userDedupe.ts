import { User } from '../../types';

const isOnMicrosoftAlias = (email?: string): boolean =>
  (email || '').toLowerCase().endsWith('.onmicrosoft.com');

const normalizeName = (value?: string): string =>
  (value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeLocalPart = (email?: string): string => {
  const normalized = (email || '').trim().toLowerCase();
  const at = normalized.indexOf('@');
  return at >= 0 ? normalized.slice(0, at) : normalized;
};

const shouldReplaceWithCandidate = (current: User, candidate: User): boolean => {
  const currentOnMicrosoft = isOnMicrosoftAlias(current.email);
  const candidateOnMicrosoft = isOnMicrosoftAlias(candidate.email);
  if (currentOnMicrosoft !== candidateOnMicrosoft) return currentOnMicrosoft;
  const currentLicensed = current.licenseActive !== false;
  const candidateLicensed = candidate.licenseActive !== false;
  if (currentLicensed !== candidateLicensed) return candidateLicensed;
  if (current.role !== candidate.role) return current.role !== 'admin' && candidate.role === 'admin';
  return false;
};

export const dedupeUsers = (users: User[]): User[] => {
  const bySubject = new Map<string, User>();
  const deduped: User[] = [];
  const fallbackKeyToUser = new Map<string, User>();

  for (const user of users) {
    const subject = (user.microsoftSubject || '').trim();
    if (subject) {
      const existing = bySubject.get(subject);
      if (!existing) {
        bySubject.set(subject, user);
        deduped.push(user);
        continue;
      }
      if (shouldReplaceWithCandidate(existing, user)) {
        const existingIndex = deduped.findIndex((candidate) => candidate.id === existing.id);
        if (existingIndex >= 0) deduped[existingIndex] = user;
        bySubject.set(subject, user);
      }
      continue;
    }

    const fallbackKey = `${normalizeName(user.displayName)}|${normalizeLocalPart(user.email)}`;
    if (fallbackKey === '|') {
      deduped.push(user);
      continue;
    }
    const existing = fallbackKeyToUser.get(fallbackKey);
    if (!existing) {
      fallbackKeyToUser.set(fallbackKey, user);
      deduped.push(user);
      continue;
    }
    const aliasPair =
      (isOnMicrosoftAlias(existing.email) && !isOnMicrosoftAlias(user.email)) ||
      (!isOnMicrosoftAlias(existing.email) && isOnMicrosoftAlias(user.email));
    if (!aliasPair) {
      deduped.push(user);
      continue;
    }
    if (shouldReplaceWithCandidate(existing, user)) {
      const existingIndex = deduped.findIndex((candidate) => candidate.id === existing.id);
      if (existingIndex >= 0) deduped[existingIndex] = user;
      fallbackKeyToUser.set(fallbackKey, user);
    }
  }

  return deduped;
};
