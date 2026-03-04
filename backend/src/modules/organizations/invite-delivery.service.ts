import { OAuthProvider } from '@prisma/client';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { ensureProviderAccessToken } from '../auth/auth.oauth.js';
import {
  buildInviteHtml,
  buildInviteLink,
  sendMicrosoftInvite,
  truncateError
} from './invite-delivery.helpers.js';

type InviteDeliveryResult = {
  ok: boolean;
  provider?: 'microsoft';
  status: 'sent' | 'failed' | 'not_configured';
  error?: string;
};

const resolvePreferredProvider = async (orgId: string): Promise<'microsoft' | null> => {
  const [org, connections] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { allowMicrosoftAuth: true, microsoftWorkspaceConnected: true }
    }),
    prisma.organizationOAuthConnection.findMany({
      where: { orgId, provider: OAuthProvider.microsoft },
      select: { provider: true }
    })
  ]);
  if (!org) return null;

  const hasMicrosoft = connections.some((connection) => connection.provider === OAuthProvider.microsoft);
  return hasMicrosoft && org.microsoftWorkspaceConnected && org.allowMicrosoftAuth ? 'microsoft' : null;
};

const markInviteDelivery = async (
  inviteId: string,
  data: {
    status: 'sent' | 'failed' | 'not_configured';
    provider?: OAuthProvider;
    error?: string | null;
    delivered?: boolean;
  }
) =>
  prisma.invite.update({
    where: { id: inviteId },
    data: {
      deliveryStatus: data.status,
      deliveryProvider: data.provider,
      deliveryAttempts: { increment: 1 },
      deliveryLastAttemptAt: new Date(),
      deliveryDeliveredAt: data.delivered ? new Date() : undefined,
      deliveryError: data.error ?? null
    } as any
  });

export const sendInviteByEmail = async (input: { inviteId: string }): Promise<InviteDeliveryResult> => {
  const invite = await prisma.invite.findUnique({
    where: { id: input.inviteId },
    include: { organization: { select: { id: true, name: true, notificationSenderEmail: true } } }
  });
  if (!invite) throw new HttpError(404, 'Invite not found.');

  const targetEmail = (invite.invitedIdentifier || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    const error = 'Invite requires a valid recipient email.';
    await markInviteDelivery(invite.id, { status: 'failed', error });
    return { ok: false, status: 'failed', error };
  }

  const provider = await resolvePreferredProvider(invite.orgId);
  if (!provider) {
    const error = 'No connected Microsoft workspace mail provider.';
    await markInviteDelivery(invite.id, { status: 'not_configured', error });
    return { ok: false, status: 'not_configured', error };
  }

  const inviter = await prisma.user.findUnique({
    where: { id: invite.createdBy },
    select: { displayName: true }
  });
  const inviteUrl = buildInviteLink(invite.token);
  const senderEmail = String(invite.organization.notificationSenderEmail || '').trim().toLowerCase() || undefined;
  const subject = `You're invited to ${invite.organization.name}`;
  const htmlBody = buildInviteHtml({
    orgName: invite.organization.name,
    inviterName: inviter?.displayName || 'Workspace admin',
    inviteUrl
  });

  try {
    const accessToken = await ensureProviderAccessToken({ orgId: invite.orgId, provider });
    await sendMicrosoftInvite({
      accessToken,
      toEmail: targetEmail,
      subject,
      htmlBody,
      senderEmail
    });

    await markInviteDelivery(invite.id, {
      status: 'sent',
      provider: OAuthProvider.microsoft,
      delivered: true
    });
    return { ok: true, provider, status: 'sent' };
  } catch (error: any) {
    const message = truncateError(error?.message || error);
    await markInviteDelivery(invite.id, {
      status: 'failed',
      provider: OAuthProvider.microsoft,
      error: message
    });
    return { ok: false, provider, status: 'failed', error: message };
  }
};

