import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import { SeedData, lifecycleFromProject } from './seed.types.js';

export const resetDatabase = async (prisma: PrismaClient) => {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.aiInteraction.deleteMany(),
    prisma.aiUsageDaily.deleteMany(),
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.invite.deleteMany(),
    prisma.securityGroup.deleteMany(),
    prisma.team.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany()
  ]);
};

export const seedOrganizationsAndUsers = async (prisma: PrismaClient, data: SeedData) => {
  for (const org of data.orgs) {
    await prisma.organization.create({
      data: {
        id: org.id,
        name: org.name,
        loginSubdomain: `org-${org.id.slice(-6).toLowerCase()}`,
        totalSeats: org.totalSeats,
        plan: org.plan ?? 'basic',
        seatPrice: org.seatPrice ?? 5,
        billingCurrency: org.billingCurrency ?? 'USD',
        allowGoogleAuth: false,
        allowMicrosoftAuth: false,
        googleWorkspaceConnected: false,
        microsoftWorkspaceConnected: false,
        ownerId: org.ownerId,
        createdAt: org.createdAt ? new Date(org.createdAt) : undefined
      }
    });
  }

  const defaultHash = await bcrypt.hash('Password', 10);
  for (const user of data.users) {
    await prisma.user.create({
      data: {
        id: user.id,
        orgId: user.orgId,
        username: user.username,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email ?? `${user.username}@velo.ai`,
        avatar: user.avatar,
        role: (user.role as UserRole | undefined) ?? UserRole.member,
        mustChangePassword: false,
        passwordHash: defaultHash
      }
    });
  }
};

export const seedProjectsAndTasks = async (prisma: PrismaClient, data: SeedData) => {
  for (const project of data.projects) {
    await prisma.project.create({
      data: {
        id: project.id,
        orgId: project.orgId,
        createdBy: project.createdBy ?? project.members[0] ?? 'unknown',
        ownerId: project.createdBy ?? project.members[0] ?? 'unknown',
        name: project.name,
        description: project.description,
        color: project.color,
        memberIds: project.members,
        stageDefs: project.stages,
        lifecycle: lifecycleFromProject(project),
        isPublic: Boolean(project.isPublic),
        publicToken: project.publicToken,
        metadata: {
          startDate: project.startDate,
          endDate: project.endDate,
          budgetCost: project.budgetCost,
          scopeSummary: project.scopeSummary,
          scopeSize: project.scopeSize
        }
      }
    });
  }

  for (const task of data.tasks) {
    const assigneeIds = task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
    await prisma.task.create({
      data: {
        id: task.id,
        orgId: task.orgId,
        projectId: task.projectId,
        createdBy: task.userId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeIds,
        securityGroupIds: task.securityGroupIds ?? [],
        tags: task.tags ?? [],
        blockedByIds: task.blockedByIds ?? [],
        blocksIds: task.blocksIds ?? [],
        subtasks: task.subtasks ?? [],
        comments: task.comments ?? [],
        auditLog: task.auditLog ?? [],
        metadata: {
          movedBackAt: task.movedBackAt,
          movedBackBy: task.movedBackBy,
          movedBackReason: task.movedBackReason,
          movedBackFromStatus: task.movedBackFromStatus,
          approvedAt: task.approvedAt,
          approvedBy: task.approvedBy,
          estimateMinutes: task.estimateMinutes,
          estimateProvidedBy: task.estimateProvidedBy,
          estimateProvidedAt: task.estimateProvidedAt,
          actualMinutes: task.actualMinutes,
          estimateRiskApprovedAt: task.estimateRiskApprovedAt,
          estimateRiskApprovedBy: task.estimateRiskApprovedBy
        },
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        orderIndex: task.order ?? 0,
        timeLoggedMs: task.timeLogged ?? 0,
        isTimerRunning: Boolean(task.isTimerRunning),
        timerStartedAt: task.timerStartedAt ? new Date(task.timerStartedAt) : undefined,
        createdAt: task.createdAt ? new Date(task.createdAt) : undefined
      }
    });
  }
};

export const seedGroupsTeamsInvites = async (prisma: PrismaClient, data: SeedData) => {
  for (const group of data.groups) {
    await prisma.securityGroup.create({
      data: {
        id: group.id,
        orgId: group.orgId,
        name: group.name,
        scope: group.scope,
        projectId: group.projectId,
        memberIds: group.memberIds,
        createdBy: group.createdBy,
        createdAt: new Date(group.createdAt),
        updatedAt: new Date(group.updatedAt)
      }
    });
  }

  for (const team of data.teams) {
    await prisma.team.create({
      data: {
        id: team.id,
        orgId: team.orgId,
        name: team.name,
        description: team.description,
        leadId: team.leadId,
        memberIds: team.memberIds,
        createdBy: team.createdBy,
        createdAt: new Date(team.createdAt),
        updatedAt: new Date(team.updatedAt)
      }
    });
  }

  for (const invite of data.invites) {
    await prisma.invite.create({
      data: {
        id: invite.id,
        orgId: invite.orgId,
        token: invite.token,
        role: invite.role as UserRole,
        createdBy: invite.createdBy,
        createdAt: new Date(invite.createdAt),
        expiresAt: new Date(invite.expiresAt),
        maxUses: invite.maxUses ?? 1,
        usedCount: invite.usedCount,
        revoked: Boolean(invite.revoked),
        invitedIdentifier: invite.invitedIdentifier
      }
    });
  }
};
