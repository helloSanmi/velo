import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { createId } from '../../lib/ids.js';
import { writeAudit } from '../audit/audit.service.js';
import { isSeatLimitedPlan } from '../../lib/planLimits.js';
import { hashToken } from './auth.shared.js';
import { normalizeEmailForUsername, renderPopupResult, frontendOrigin } from './auth.oauth.provider.js';
import { resolveOrgByWorkspaceDomain } from './auth.oauth.workspace.js';
import type { MinimalAuthUser, OauthSignInInput } from './auth.oauth.callback.signin.types.js';

const providerSubjectField = 'microsoftSubject' as const;

export const resolveSignInOrg = async (input: OauthSignInInput, user: MinimalAuthUser | null) => {
  let resolvedOrg = input.stateOrg ? await prisma.organization.findUnique({ where: { id: input.stateOrg.id } }) : null;

  if (!resolvedOrg && !user && input.microsoftTenantId) {
    resolvedOrg = await prisma.organization.findFirst({
      where: { microsoftTenantId: input.microsoftTenantId, allowMicrosoftAuth: true, microsoftWorkspaceConnected: true }
    });
  }

  if (!resolvedOrg && !user) {
    const enabledOrgs = await prisma.organization.findMany({
      where: { allowMicrosoftAuth: true, microsoftWorkspaceConnected: true },
      take: 2
    });
    if (enabledOrgs.length === 1) resolvedOrg = enabledOrgs[0];
  }

  return resolvedOrg;
};

export const jitProvisionUserIfNeeded = async (
  input: OauthSignInInput,
  existingUser: MinimalAuthUser | null,
  resolvedOrg: { id: string; name: string; plan: string; totalSeats: number } | null
) => {
  if (existingUser || !resolvedOrg) return existingUser;

  const userCount = await prisma.user.count({ where: { orgId: resolvedOrg.id, licenseActive: true } });
  if (isSeatLimitedPlan(resolvedOrg.plan) && userCount >= resolvedOrg.totalSeats) {
    return null;
  }

  const baseUsername = normalizeEmailForUsername(input.profile.email);
  let username = baseUsername;
  let suffix = 1;
  while (await prisma.user.findFirst({ where: { orgId: resolvedOrg.id, username } })) {
    suffix += 1;
    username = `${baseUsername}-${suffix}`;
  }

  const created = (await prisma.user.create({
    data: {
      id: createId('usr'),
      orgId: resolvedOrg.id,
      username,
      email: input.profile.email,
      displayName: input.profile.name || username,
      role: input.isMicrosoftGlobalAdmin ? UserRole.admin : UserRole.member,
      licenseActive: true,
      avatar: input.profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
      mustChangePassword: false,
      passwordHash: await hashToken(createId('pwd')),
      [providerSubjectField]: input.profile.subject
    }
  })) as MinimalAuthUser;

  await writeAudit({
    orgId: resolvedOrg.id,
    userId: created.id,
    actionType: 'auth_login',
    action: `JIT provisioned user ${created.email} via ${input.provider} SSO`,
    entityType: 'user',
    entityId: created.id,
    metadata: { provider: input.provider, roleAssigned: created.role, isMicrosoftGlobalAdmin: input.isMicrosoftGlobalAdmin }
  });

  return created;
};

export const getNoSeatPopup = (input: OauthSignInInput, resolvedOrgName: string) =>
  renderPopupResult(
    {
      ok: false,
      code: 'LICENSE_REQUIRED',
      error: `No available license seat in ${resolvedOrgName}. Ask your workspace admin to assign licenses.`,
      orgName: resolvedOrgName
    },
    'velo-oauth-result',
    input.state.returnOrigin || frontendOrigin
  );

export const writeDeniedSignInAudit = async (input: OauthSignInInput) => {
  const auditOrg =
    input.stateOrg || (input.state.loginSubdomain ? await resolveOrgByWorkspaceDomain(input.state.loginSubdomain).catch(() => null) : null);
  if (!auditOrg) return;
  await writeAudit({
    orgId: auditOrg.id,
    actionType: 'auth_login',
    action: `OAuth sign-in denied for ${input.profile.email} (${input.provider})`,
    entityType: 'organization',
    entityId: auditOrg.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });
};
