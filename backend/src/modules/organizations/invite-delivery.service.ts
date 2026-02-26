import { OAuthProvider } from '@prisma/client';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { ensureProviderAccessToken } from '../auth/auth.oauth.js';

type InviteDeliveryResult = {
  ok: boolean;
  provider?: 'microsoft';
  status: 'sent' | 'failed' | 'not_configured';
  error?: string;
};

const truncateError = (value: unknown): string => {
  const text = String(value || 'Unknown invite delivery error').trim();
  return text.length > 500 ? `${text.slice(0, 497)}...` : text;
};

const toBase64Url = (value: string): string =>
  Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const buildInviteLink = (token: string): string => `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/?invite=${encodeURIComponent(token)}`;

const buildInviteHtml = (input: { orgName: string; inviterName: string; inviteUrl: string }) => `
  <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #0f172a;">
    <h2 style="margin: 0 0 12px;">You were invited to join ${input.orgName}</h2>
    <p style="margin: 0 0 12px;">${input.inviterName} invited you to access this workspace in Velo.</p>
    <p style="margin: 0 0 16px;"><a href="${input.inviteUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;">Accept invite</a></p>
    <p style="margin: 0 0 8px;">If the button does not work, open this link:</p>
    <p style="margin: 0;"><a href="${input.inviteUrl}">${input.inviteUrl}</a></p>
  </div>
`;

const sendMicrosoftInvite = async (input: {
  accessToken: string;
  toEmail: string;
  subject: string;
  htmlBody: string;
}) => {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: { contentType: 'HTML', content: input.htmlBody },
        toRecipients: [{ emailAddress: { address: input.toEmail } }]
      },
      saveToSentItems: false
    })
  });
  if (!response.ok) {
    throw new HttpError(400, `Microsoft invite email failed (${response.status}).`);
  }
};

const resolvePreferredProvider = async (orgId: string): Promise<'microsoft' | null> => {
  const [org, connections] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        allowMicrosoftAuth: true,
        microsoftWorkspaceConnected: true
      }
    }),
    prisma.organizationOAuthConnection.findMany({
      where: {
        orgId,
        provider: OAuthProvider.microsoft
      },
      select: { provider: true }
    })
  ]);
  if (!org) return null;

  const hasMicrosoft = connections.some((connection) => connection.provider === OAuthProvider.microsoft);
  if (hasMicrosoft && org.microsoftWorkspaceConnected && org.allowMicrosoftAuth) return 'microsoft';
  return null;
};

export const sendInviteByEmail = async (input: { inviteId: string }): Promise<InviteDeliveryResult> => {
  const invite = await prisma.invite.findUnique({
    where: { id: input.inviteId },
    include: {
      organization: { select: { id: true, name: true } }
    }
  });
  if (!invite) throw new HttpError(404, 'Invite not found.');

  const targetEmail = (invite.invitedIdentifier || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        deliveryStatus: 'failed',
        deliveryAttempts: { increment: 1 },
        deliveryLastAttemptAt: new Date(),
        deliveryError: 'Invite requires a valid recipient email.'
      } as any
    });
    return { ok: false, status: 'failed', error: 'Invite requires a valid recipient email.' };
  }

  const provider = await resolvePreferredProvider(invite.orgId);
  if (!provider) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        deliveryStatus: 'not_configured',
        deliveryAttempts: { increment: 1 },
        deliveryLastAttemptAt: new Date(),
        deliveryError: 'No connected Microsoft workspace mail provider.'
      } as any
    });
    return {
      ok: false,
      status: 'not_configured',
      error: 'No connected Microsoft workspace mail provider.'
    };
  }

  const inviter = await prisma.user.findUnique({
    where: { id: invite.createdBy },
    select: { displayName: true }
  });
  const inviterName = inviter?.displayName || 'Workspace admin';
  const inviteUrl = buildInviteLink(invite.token);
  const subject = `You're invited to ${invite.organization.name} on Velo`;
  const htmlBody = buildInviteHtml({
    orgName: invite.organization.name,
    inviterName,
    inviteUrl
  });

  try {
    const accessToken = await ensureProviderAccessToken({
      orgId: invite.orgId,
      provider
    });
    await sendMicrosoftInvite({
      accessToken,
      toEmail: targetEmail,
      subject,
      htmlBody
    });

    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        deliveryStatus: 'sent',
        deliveryProvider: OAuthProvider.microsoft,
        deliveryAttempts: { increment: 1 },
        deliveryLastAttemptAt: new Date(),
        deliveryDeliveredAt: new Date(),
        deliveryError: null
      } as any
    });
    return { ok: true, provider, status: 'sent' };
  } catch (error: any) {
    const message = truncateError(error?.message || error);
    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        deliveryStatus: 'failed',
        deliveryProvider: OAuthProvider.microsoft,
        deliveryAttempts: { increment: 1 },
        deliveryLastAttemptAt: new Date(),
        deliveryError: message
      } as any
    });
    return { ok: false, provider, status: 'failed', error: message };
  }
};
