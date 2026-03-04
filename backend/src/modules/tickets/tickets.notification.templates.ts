import { env } from '../../config/env.js';
import { getTicketReference } from './tickets.reference.js';
import type { DigestEntry, TicketEventType } from './tickets.notification.types.js';
import type { StoredIntakeTicket } from './tickets.store.js';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const ticketUrl = (ticketId: string): string =>
  `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/app?tickets=${encodeURIComponent(ticketId)}`;

export const titleForEvent = (eventType: TicketEventType, ticket: StoredIntakeTicket): string => {
  switch (eventType) {
    case 'ticket_created':
      return `New ticket: ${ticket.title}`;
    case 'ticket_assigned':
      return `Assigned to you: ${ticket.title}`;
    case 'ticket_status_changed':
      return `Status changed: ${ticket.title}`;
    case 'ticket_commented':
      return `New comment: ${ticket.title}`;
    case 'ticket_sla_breach':
      return `SLA alert: ${ticket.title}`;
    case 'ticket_approval_required':
      return `Approval required: ${ticket.title}`;
    default:
      return ticket.title;
  }
};

export const summaryForEvent = (
  eventType: TicketEventType,
  input: { actorName: string; ticket: StoredIntakeTicket; previousStatus?: string; commentText?: string }
): string => {
  switch (eventType) {
    case 'ticket_created':
      return `${input.actorName} created a new ticket in ${input.ticket.projectId ? 'project scope' : 'workspace scope'}.`;
    case 'ticket_assigned':
      return `${input.actorName} assigned this ticket.`;
    case 'ticket_status_changed':
      return `${input.actorName} changed status from ${input.previousStatus || 'unknown'} to ${input.ticket.status}.`;
    case 'ticket_commented':
      return `${input.actorName} commented: "${(input.commentText || '').slice(0, 120)}"`;
    case 'ticket_sla_breach':
      return 'This ticket is at risk of breaching SLA.';
    case 'ticket_approval_required':
      return 'Ticket requires approval.';
    default:
      return 'Ticket updated.';
  }
};

export const toHtmlBody = (input: {
  title: string;
  summary: string;
  ticket: StoredIntakeTicket;
  workspaceName?: string;
  recipientName?: string;
}): string => {
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hi,';
  const workspaceName = escapeHtml(input.workspaceName || 'your workspace');
  const statusLabel = escapeHtml(input.ticket.status);
  const priorityLabel = escapeHtml(input.ticket.priority);
  const reference = escapeHtml(getTicketReference(input.ticket));
  return `
<div style="font-family:Inter,'Segoe UI',system-ui,sans-serif;background:#eef2f7;padding:24px;color:#0f172a;line-height:1.55;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d6dde8;border-radius:18px;overflow:hidden;box-shadow:0 10px 24px rgba(15,23,42,0.08);">
    <div style="padding:18px 22px;border-bottom:1px solid #e2e8f0;text-align:center;">
      <div style="color:#64748b;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Notification</div>
      <div style="margin-top:6px;color:#0f172a;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.01em;">${workspaceName}</div>
    </div>
    <div style="padding:24px 22px;">
      <p style="margin:0 0 10px;color:#475569;font-size:17px;text-align:center;">${greeting}</p>
      <h2 style="margin:0 0 10px;font-size:34px;line-height:1.2;color:#0f172a;font-weight:800;letter-spacing:-0.02em;text-align:center;">${escapeHtml(input.title)}</h2>
      <p style="margin:0 0 16px;color:#334155;font-size:20px;line-height:1.45;text-align:center;">${escapeHtml(input.summary)}</p>
      <div style="margin:0 0 16px;display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="display:inline-block;background:#f1f5f9;color:#334155;padding:8px 14px;border-radius:999px;font-weight:700;font-size:16px;text-transform:capitalize;">${statusLabel}</span>
        <span style="display:inline-block;color:#64748b;font-size:24px;line-height:1;">•</span>
        <span style="display:inline-block;background:#e0ecff;color:#1e3a8a;padding:8px 14px;border-radius:999px;font-weight:700;font-size:16px;text-transform:capitalize;">${priorityLabel}</span>
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 16px;">
        <tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Reference</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${reference}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Priority</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:capitalize;">${priorityLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Status</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${statusLabel}</td></tr>
      </table>
      <p style="margin:0 0 4px;text-align:center;">
        <a href="${escapeHtml(ticketUrl(input.ticket.id))}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:15px;">
          Open ticket
        </a>
      </p>
      <div style="margin-top:10px;color:#94a3b8;font-size:13px;text-align:center;">Managed by your workspace notification settings.</div>
    </div>
  </div>
</div>`;
};

export const toDigestHtmlBody = (input: { entry: DigestEntry; workspaceName?: string; recipientName?: string }): string => {
  const ticketIdRows = Array.from(input.entry.ticketIds)
    .slice(0, 12)
    .map((id) => `<li style="margin:0 0 4px;">${escapeHtml(id)}</li>`)
    .join('');
  const titleRows = Array.from(input.entry.ticketTitles)
    .slice(0, 8)
    .map((title) => `<li style="margin:0 0 4px;">${escapeHtml(title)}</li>`)
    .join('');
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hi,';
  const workspaceName = escapeHtml(input.workspaceName || 'your workspace');
  return `
<div style="font-family:Inter,'Segoe UI',system-ui,sans-serif;background:#eef2f7;padding:24px;color:#0f172a;line-height:1.55;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d6dde8;border-radius:18px;overflow:hidden;box-shadow:0 10px 24px rgba(15,23,42,0.08);">
    <div style="padding:18px 22px;border-bottom:1px solid #e2e8f0;text-align:center;">
      <div style="color:#64748b;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Digest</div>
      <div style="margin-top:6px;color:#0f172a;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.01em;">${workspaceName}</div>
    </div>
    <div style="padding:24px 22px;">
      <p style="margin:0 0 10px;color:#475569;font-size:17px;text-align:center;">${greeting}</p>
      <h2 style="margin:0 0 10px;font-size:30px;line-height:1.22;color:#0f172a;font-weight:800;letter-spacing:-0.02em;text-align:center;">Ticket digest: ${escapeHtml(input.entry.eventType.replaceAll('_', ' '))}</h2>
      <p style="margin:0 0 16px;color:#334155;font-size:18px;line-height:1.45;text-align:center;">${input.entry.count} updates in this digest window.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 16px;">
        <tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Last actor</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(input.entry.lastActorName)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Last status</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(input.entry.lastStatus)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:130px;">Last priority</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:capitalize;">${escapeHtml(input.entry.lastPriority)}</td></tr>
      </table>
      <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">References</p>
      <ul style="margin:0 0 12px 18px;color:#334155;">${ticketIdRows || '<li>No references captured</li>'}</ul>
      <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">Ticket titles</p>
      <ul style="margin:0 0 4px 18px;color:#334155;">${titleRows || '<li>No titles captured</li>'}</ul>
      <div style="margin-top:10px;color:#94a3b8;font-size:13px;text-align:center;">Managed by your workspace notification settings.</div>
    </div>
  </div>
</div>`;
};
