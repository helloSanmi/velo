import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';

export const truncateError = (value: unknown): string => {
  const text = String(value || 'Unknown invite delivery error').trim();
  return text.length > 500 ? `${text.slice(0, 497)}...` : text;
};

const escapeHtml = (value: string): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const buildInviteLink = (token: string): string =>
  `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/?invite=${encodeURIComponent(token)}`;

export const buildInviteHtml = (input: { orgName: string; inviterName: string; inviteUrl: string }) => `
  <div style="font-family:Inter,'Segoe UI',system-ui,sans-serif;background:#eef2f7;padding:24px;color:#0f172a;line-height:1.55;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d6dde8;border-radius:16px;overflow:hidden;">
      <div style="padding:24px 22px 20px;background:linear-gradient(135deg,#0f172a 0%,#101b3b 66%,#8b1b5e 100%);color:#ffffff;text-align:center;">
        <div style="font-size:30px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;">${escapeHtml(input.orgName)}</div>
      </div>
      <div style="padding:24px 22px;">
        <p style="margin:0 0 10px;color:#475569;font-size:15px;">Hi,</p>
        <h2 style="margin:0 0 10px;font-size:34px;line-height:1.2;color:#0f172a;font-weight:800;letter-spacing:-0.02em;">You were invited to join ${escapeHtml(input.orgName)}</h2>
        <p style="margin:0 0 16px;color:#334155;font-size:19px;line-height:1.45;">${escapeHtml(input.inviterName)} invited you to access this workspace.</p>
        <p style="margin:0 0 8px;">
          <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:15px;">
            Accept invite
          </a>
        </p>
        <p style="margin:12px 0 8px;color:#64748b;font-size:13px;">If the button does not work, open this link:</p>
        <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${escapeHtml(input.inviteUrl)}" style="color:#0f172a;">${escapeHtml(input.inviteUrl)}</a></p>
      </div>
    </div>
  </div>
`;

export const sendMicrosoftInvite = async (input: {
  accessToken: string;
  toEmail: string;
  subject: string;
  htmlBody: string;
  senderEmail?: string;
}) => {
  const endpoint = input.senderEmail
    ? `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(input.senderEmail)}/sendMail`
    : 'https://graph.microsoft.com/v1.0/me/sendMail';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: { contentType: 'HTML', content: input.htmlBody },
        toRecipients: [{ emailAddress: { address: input.toEmail } }],
        ...(input.senderEmail
          ? {
              from: { emailAddress: { address: input.senderEmail } },
              sender: { emailAddress: { address: input.senderEmail } },
              replyTo: [{ emailAddress: { address: input.senderEmail } }]
            }
          : {})
      },
      saveToSentItems: false
    })
  });
  if (!response.ok) {
    throw new HttpError(400, `Microsoft invite email failed (${response.status}).`);
  }
};

