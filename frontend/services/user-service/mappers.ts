import { Organization, OrgInvite, User } from '../../types';

export const mapInviteFromApi = (invite: any): OrgInvite => ({
  id: invite.id,
  orgId: invite.orgId,
  token: invite.token,
  role: invite.role,
  createdBy: invite.createdBy,
  createdAt: new Date(invite.createdAt).getTime(),
  expiresAt: new Date(invite.expiresAt).getTime(),
  maxUses: invite.maxUses,
  usedCount: invite.usedCount,
  revoked: invite.revoked,
  invitedIdentifier: invite.invitedIdentifier || undefined,
  deliveryStatus: invite.deliveryStatus || undefined,
  deliveryProvider: invite.deliveryProvider || undefined,
  deliveryAttempts:
    typeof invite.deliveryAttempts === 'number' ? invite.deliveryAttempts : undefined,
  deliveryLastAttemptAt: invite.deliveryLastAttemptAt
    ? new Date(invite.deliveryLastAttemptAt).getTime()
    : undefined,
  deliveryDeliveredAt: invite.deliveryDeliveredAt
    ? new Date(invite.deliveryDeliveredAt).getTime()
    : undefined,
  deliveryError: invite.deliveryError || undefined
});

export const mapOrganizationFromApi = (org: any): Organization => ({
  id: org.id,
  name: org.name,
  loginSubdomain: org.loginSubdomain || undefined,
  totalSeats: org.totalSeats,
  ownerId: org.ownerId,
  createdAt: new Date(org.createdAt).getTime(),
  plan: org.plan,
  seatPrice: org.seatPrice,
  billingCurrency: org.billingCurrency,
  aiDailyRequestLimit:
    typeof org.aiDailyRequestLimit === 'number' ? org.aiDailyRequestLimit : undefined,
  aiDailyTokenLimit:
    typeof org.aiDailyTokenLimit === 'number' ? org.aiDailyTokenLimit : undefined,
  allowMicrosoftAuth: Boolean(org.allowMicrosoftAuth),
  microsoftWorkspaceConnected: Boolean(org.microsoftWorkspaceConnected),
  notificationSenderEmail: org.notificationSenderEmail || undefined
});

export const mapUserFromApi = (user: any): User => ({
  id: user.id,
  orgId: user.orgId,
  username: user.username,
  displayName: user.displayName,
  firstName: user.firstName || undefined,
  lastName: user.lastName || undefined,
  email: user.email || undefined,
  avatar: user.avatar || undefined,
  role: user.role,
  licenseActive: user.licenseActive !== false,
  mustChangePassword: Boolean(user.mustChangePassword),
  microsoftSubject: user.microsoftSubject || undefined
});
