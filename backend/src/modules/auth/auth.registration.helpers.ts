import { prisma } from '../../lib/prisma.js';

const toSubdomainBase = (orgName: string): string => {
  const normalized = orgName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return normalized || 'workspace';
};

export const buildUniqueSubdomain = async (orgName: string): Promise<string> => {
  const base = toSubdomainBase(orgName);
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.organization.findUnique({
      where: { loginSubdomain: candidate },
      select: { id: true }
    });
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString().slice(-6)}`;
};

