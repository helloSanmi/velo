import { env } from '../../config/env.js';

const escapeHtml = (value: string): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getFactValue = (facts: Array<{ title: string; value: string }> | undefined, title: string): string => {
  const row = (facts || []).find((item) => item.title?.trim().toLowerCase() === title.trim().toLowerCase());
  return row?.value || '';
};

export const toWorkspaceNotificationHtmlBody = (input: {
  workspaceName?: string;
  recipientName?: string;
  title: string;
  summary: string;
  facts?: Array<{ title: string; value: string }>;
  openPath?: string;
}) => {
  const facts = input.facts || [];
  const fromStatus = getFactValue(facts, 'from');
  const toStatus = getFactValue(facts, 'to');
  const projectName = getFactValue(facts, 'project');
  const factRows = facts
    .filter((row) => row.title && row.value)
    .filter((row) => !['from', 'to', 'project'].includes(row.title.trim().toLowerCase()))
    .map(
      (row) =>
        `<tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;width:140px;">${escapeHtml(row.title)}</td>
          <td style="padding:8px 0;color:#0f172a;font-size:15px;font-weight:700;">${escapeHtml(row.value)}</td>
        </tr>`
    )
    .join('');
  const openUrl = input.openPath
    ? escapeHtml(`${env.FRONTEND_BASE_URL.replace(/\/$/, '')}${input.openPath}`)
    : '';
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hi,';
  const workspaceName = escapeHtml(input.workspaceName || 'Workspace');
  const title = escapeHtml(input.title);
  const summary = escapeHtml(input.summary);

  return `
<div style="font-family:Inter,'Segoe UI',system-ui,sans-serif;background:#edf3fa;padding:32px 16px;color:#0f172a;line-height:1.5;">
  <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #d7e1ee;border-radius:18px;overflow:hidden;box-shadow:0 10px 26px rgba(15,23,42,0.08);">
    <div style="padding:18px 28px;border-bottom:1px solid #e7eef7;text-align:center;color:#334155;">
      <div style="font-size:14px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;">
        <span style="font-size:15px;line-height:1;margin-right:6px;">📋</span>Notification
      </div>
      <div style="margin-top:8px;font-size:28px;font-weight:800;letter-spacing:-0.01em;color:#0f172a;">${workspaceName}</div>
    </div>
    <div style="padding:30px 40px 28px;text-align:center;">
      <p style="margin:0 0 10px;color:#475569;font-size:18px;">${greeting}</p>
      <h2 style="margin:0 0 14px;font-size:32px;line-height:1.2;color:#0f172a;font-weight:800;letter-spacing:-0.02em;">${title}</h2>
      <p style="margin:0 0 20px;color:#475569;font-size:17px;line-height:1.45;">${summary}</p>
      ${
        fromStatus && toStatus
          ? `<div style="margin:0 auto 10px;max-width:640px;display:flex;justify-content:center;align-items:center;gap:12px;">
              <div style="min-width:170px;padding:10px 16px;border-radius:999px;background:#f2f5f9;color:#111827;font-size:20px;font-weight:700;">${escapeHtml(fromStatus)}</div>
              <div style="font-size:24px;color:#64748b;">→</div>
              <div style="min-width:170px;padding:10px 16px;border-radius:999px;background:#dbeafe;color:#0f2b5b;font-size:20px;font-weight:700;">${escapeHtml(toStatus)}</div>
            </div>
            <div style="margin:0 0 16px;display:flex;justify-content:center;gap:20px;">
              <span style="padding:5px 12px;border-radius:8px;background:#f3f4f6;color:#6b7280;font-size:12px;">Previous status</span>
              <span style="padding:5px 12px;border-radius:8px;background:#e0edff;color:#1e3a8a;font-size:12px;">Current status</span>
            </div>`
          : ''
      }
      ${
        projectName
          ? `<p style="margin:0 0 18px;color:#334155;font-size:18px;">
              <span style="margin-right:8px;">🗃️</span><span style="font-weight:700;color:#64748b;">Project:</span> <span style="font-weight:700;color:#0f172a;">${escapeHtml(projectName)}</span>
            </p>`
          : ''
      }
      ${
        factRows
          ? `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-top:1px solid #e5eaf2;border-bottom:1px solid #e5eaf2;margin:0 0 20px;text-align:left;">${factRows}</table>`
          : ''
      }
      ${
        openUrl
          ? `<p style="margin:0 0 16px;">
              <a href="${openUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:14px;font-weight:700;font-size:15px;">
                Open workspace
              </a>
            </p>`
          : ''
      }
      <div style="margin-top:8px;color:#94a3b8;font-size:14px;">Managed by your workspace notification settings.</div>
    </div>
  </div>
</div>`;
};

