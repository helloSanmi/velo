import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/httpError.js';
import { writeAudit } from '../audit/audit.service.js';
import { enforce } from '../policy/policy.service.js';

export const organizationsService = {
  async get(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new HttpError(404, 'Organization not found.');
    return org;
  },

  async updateUserRole(input: {
    orgId: string;
    actor: { userId: string; role: UserRole };
    userId: string;
    role: UserRole;
  }) {
    enforce('org:usage-read', {
      role: input.actor.role,
      userId: input.actor.userId,
      isProjectMember: true
    });

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user || user.orgId !== input.orgId) throw new HttpError(404, 'User not found.');

    const updated = await prisma.user.update({ where: { id: user.id }, data: { role: input.role } });

    await writeAudit({
      orgId: input.orgId,
      userId: input.actor.userId,
      actionType: 'role_changed',
      action: `Changed role for ${updated.username} to ${updated.role}`,
      entityType: 'user',
      entityId: updated.id,
      metadata: { oldRole: user.role, newRole: updated.role }
    });

    return updated;
  },

  async markDeleted(input: { orgId: string; actor: { userId: string; role: UserRole }; confirmation: string }) {
    enforce('org:usage-read', {
      role: input.actor.role,
      userId: input.actor.userId,
      isProjectMember: true
    });

    const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
    if (!org) throw new HttpError(404, 'Organization not found.');

    if (input.confirmation.trim() !== 'DELETE') {
      throw new HttpError(400, 'Invalid confirmation keyword.');
    }

    const deletedAt = new Date();
    await prisma.$transaction([
      prisma.organization.update({ where: { id: org.id }, data: { deletedAt } }),
      prisma.session.updateMany({ where: { orgId: org.id, isRevoked: false }, data: { isRevoked: true } })
    ]);

    await writeAudit({
      orgId: org.id,
      userId: input.actor.userId,
      actionType: 'project_deleted',
      action: 'Organization marked for deletion (30-day retention started)',
      entityType: 'organization',
      entityId: org.id,
      metadata: { retentionDays: 30 }
    });

    return { orgId: org.id, deletedAt, retentionDays: 30 };
  },

  async updateSettings(input: {
    orgId: string;
    actor: { userId: string; role: UserRole };
    patch: {
      loginSubdomain?: string;
      allowMicrosoftAuth?: boolean;
      microsoftWorkspaceConnected?: boolean;
    };
  }) {
    enforce('org:usage-read', {
      role: input.actor.role,
      userId: input.actor.userId,
      isProjectMember: true
    });

    const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
    if (!org) throw new HttpError(404, 'Organization not found.');

    const nextSubdomain = typeof input.patch.loginSubdomain === 'string'
      ? input.patch.loginSubdomain.trim().toLowerCase().replace(/\.velo\.ai$/, '')
      : undefined;
    if (typeof nextSubdomain === 'string' && !/^[a-z0-9][a-z0-9-]{1,39}$/.test(nextSubdomain)) {
      throw new HttpError(400, 'Workspace domain must be 2-40 chars: lowercase letters, numbers, hyphen.');
    }

    if (nextSubdomain && nextSubdomain !== org.loginSubdomain) {
      const conflict = await prisma.organization.findUnique({
        where: { loginSubdomain: nextSubdomain },
        select: { id: true }
      });
      if (conflict) throw new HttpError(409, 'Workspace domain already in use.');
    }

    const updated = await prisma.organization.update({
      where: { id: input.orgId },
      data: {
        loginSubdomain: nextSubdomain,
        allowMicrosoftAuth: input.patch.allowMicrosoftAuth,
        microsoftWorkspaceConnected: input.patch.microsoftWorkspaceConnected
      }
    });

    await writeAudit({
      orgId: input.orgId,
      userId: input.actor.userId,
      actionType: 'role_changed',
      action: 'Updated organization auth/domain settings',
      entityType: 'organization',
      entityId: input.orgId,
      metadata: {
        before: {
          loginSubdomain: org.loginSubdomain,
          allowMicrosoftAuth: org.allowMicrosoftAuth,
          microsoftWorkspaceConnected: org.microsoftWorkspaceConnected
        },
        after: {
          loginSubdomain: updated.loginSubdomain,
          allowMicrosoftAuth: updated.allowMicrosoftAuth,
          microsoftWorkspaceConnected: updated.microsoftWorkspaceConnected
        }
      }
    });

    return updated;
  }
};
