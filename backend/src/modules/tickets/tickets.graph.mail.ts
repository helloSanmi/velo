import { HttpError } from '../../lib/httpError.js';
import { graphRequest, isAccessDeniedError, removeSenderOverrides } from './tickets.graph.request.js';
import { getOrgNotificationSenderEmail, resolveConnection } from './tickets.graph.connection.js';
import { getCircuitOpenError, isCircuitOpen, updateGraphHealthOnResult } from './tickets.graph.health.js';
import { resolveGraphAuthContext } from './tickets.graph.auth.js';

export const sendTicketEmail = async (input: {
  orgId: string;
  to: string[];
  subject: string;
  htmlBody: string;
  ticketId: string;
  ticketCode?: string;
}): Promise<void> => {
  if (input.to.length === 0) return;
  const { metadata } = await resolveConnection(input.orgId);
  if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
  try {
    const { accessToken, mode } = await resolveGraphAuthContext({ orgId: input.orgId });
    const senderEmail = await getOrgNotificationSenderEmail(input.orgId);
    if (mode === 'app_only' && !senderEmail) {
      throw new HttpError(400, 'Notification sender mailbox must be configured for app-only delivery.');
    }
    const message = {
      subject: input.ticketCode ? `[${input.ticketCode}] ${input.subject}` : input.subject,
      body: { contentType: 'HTML', content: input.htmlBody },
      toRecipients: input.to.map((address) => ({ emailAddress: { address } })),
      ...(senderEmail
        ? {
            from: { emailAddress: { address: senderEmail } },
            sender: { emailAddress: { address: senderEmail } },
            replyTo: [{ emailAddress: { address: senderEmail } }]
          }
        : {}),
      internetMessageHeaders: [
        { name: 'X-Velo-Ticket-Id', value: input.ticketId },
        { name: 'X-Velo-Thread-Key', value: `ticket-${input.ticketId}` }
      ]
    } as Record<string, unknown>;
    try {
      await graphRequest({
        accessToken,
        method: 'POST',
        url: senderEmail ? `/users/${encodeURIComponent(senderEmail)}/sendMail` : '/me/sendMail',
        body: { message, saveToSentItems: true }
      });
    } catch (error) {
      if (mode === 'app_only' || !senderEmail || !isAccessDeniedError(error)) throw error;
      await graphRequest({
        accessToken,
        method: 'POST',
        url: '/me/sendMail',
        body: { message: removeSenderOverrides(message), saveToSentItems: true }
      });
    }
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
  } catch (error: any) {
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: false, errorMessage: error?.message || String(error) });
    throw error;
  }
};

export const sendWorkspaceEmail = async (input: {
  orgId: string;
  to: string[];
  subject: string;
  htmlBody: string;
  threadKey?: string;
}): Promise<void> => {
  if (input.to.length === 0) return;
  const { metadata } = await resolveConnection(input.orgId);
  if (isCircuitOpen(metadata)) throw getCircuitOpenError(metadata);
  try {
    const { accessToken, mode } = await resolveGraphAuthContext({ orgId: input.orgId });
    const senderEmail = await getOrgNotificationSenderEmail(input.orgId);
    if (mode === 'app_only' && !senderEmail) {
      throw new HttpError(400, 'Notification sender mailbox must be configured for app-only delivery.');
    }
    const message = {
      subject: input.subject,
      body: { contentType: 'HTML', content: input.htmlBody },
      toRecipients: input.to.map((address) => ({ emailAddress: { address } })),
      ...(senderEmail
        ? {
            from: { emailAddress: { address: senderEmail } },
            sender: { emailAddress: { address: senderEmail } },
            replyTo: [{ emailAddress: { address: senderEmail } }]
          }
        : {}),
      internetMessageHeaders: input.threadKey ? [{ name: 'X-Velo-Thread-Key', value: input.threadKey }] : undefined
    } as Record<string, unknown>;
    try {
      await graphRequest({
        accessToken,
        method: 'POST',
        url: senderEmail ? `/users/${encodeURIComponent(senderEmail)}/sendMail` : '/me/sendMail',
        body: { message, saveToSentItems: true }
      });
    } catch (error) {
      if (mode === 'app_only' || !senderEmail || !isAccessDeniedError(error)) throw error;
      await graphRequest({
        accessToken,
        method: 'POST',
        url: '/me/sendMail',
        body: { message: removeSenderOverrides(message), saveToSentItems: true }
      });
    }
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: true });
  } catch (error: any) {
    await updateGraphHealthOnResult({ orgId: input.orgId, ok: false, errorMessage: error?.message || String(error) });
    throw error;
  }
};
