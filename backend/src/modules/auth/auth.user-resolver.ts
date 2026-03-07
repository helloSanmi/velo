import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { buildWorkspaceDomainCandidates, normalizeIdentifier, normalizeWorkspaceDomain } from './auth.shared.js';

export const resolveLoginUser = async (identifier: string, workspaceDomain?: string) => {
  const { normalized } = normalizeIdentifier(identifier);
  const domainHint = normalizeWorkspaceDomain(workspaceDomain);
  const workspaceCandidates = buildWorkspaceDomainCandidates(workspaceDomain);

  const emailLike = normalized.includes('@');
  const [localPartRaw, identifierDomainRaw] = emailLike ? normalized.split('@') : [normalized, ''];
  const localPart = (localPartRaw || '').trim();
  const identifierDomain = (identifierDomainRaw || '').trim();

  const subdomainFromIdentifier = normalizeWorkspaceDomain(identifierDomain);
  const effectiveSubdomain = domainHint || subdomainFromIdentifier;

  if (effectiveSubdomain) {
    const orgLookupCandidates = Array.from(new Set([effectiveSubdomain, ...workspaceCandidates]));
    const org = await prisma.organization.findFirst({
      where: {
        OR: orgLookupCandidates.map((candidate) => ({ loginSubdomain: candidate }))
      },
      select: { id: true }
    });
    if (!org) throw new HttpError(404, 'Workspace domain not found.');

    if (emailLike && !identifierDomain.endsWith('.velo.ai')) {
      return prisma.user.findFirst({ where: { orgId: org.id, email: normalized } });
    }
    return prisma.user.findFirst({ where: { orgId: org.id, username: localPart || normalized } });
  }

  if (emailLike && !identifierDomain.endsWith('.velo.ai')) {
    return prisma.user.findFirst({ where: { email: normalized } });
  }

  const byUsername = await prisma.user.findMany({
    where: { username: localPart || normalized },
    take: 2,
    select: {
      id: true,
      orgId: true,
      username: true,
      displayName: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
      role: true,
      licenseActive: true,
      mustChangePassword: true,
      passwordHash: true
    }
  });

  if (byUsername.length > 1) {
    throw new HttpError(
      400,
      'Multiple workspaces found for this username. Open your workspace URL (e.g. acme.localhost or acme.velo.ai) and sign in there.'
    );
  }

  return byUsername[0] || null;
};
