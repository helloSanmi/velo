import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { prisma } from '../../lib/prisma.js';
import { ticketsGraphService } from './tickets.graph.service.js';
import { ticketsNotificationPolicyStore } from './tickets.notification.policy.store.js';
import { ticketsPolicyStore } from './tickets.policy.store.js';
import { canManageProjectTicket } from './tickets.access.js';
import {
  notificationPolicySchema,
  orgParamsSchema,
  policyQuerySchema,
  policyUpsertSchema,
  senderPreflightSchema,
  toPsSingleQuoted
} from './tickets.routes.schemas.js';

export const getTicketPolicyHandler = async (req: Request, res: Response) => {
  const { orgId } = orgParamsSchema.parse(req.params);
  const { projectId } = policyQuerySchema.parse(req.query);
  const policy = await ticketsPolicyStore.get(orgId, projectId);
  res.json({ success: true, data: policy });
};

export const patchTicketPolicyHandler = async (req: Request, res: Response) => {
  const { orgId } = orgParamsSchema.parse(req.params);
  const patch = policyUpsertSchema.parse(req.body);
  if (patch.projectId) {
    const canManage = await canManageProjectTicket({
      orgId,
      userId: req.auth!.userId,
      role: req.auth!.role,
      projectId: patch.projectId
    });
    if (!canManage) throw new HttpError(403, 'Only project owners/admins can update ticket policy.');
  } else if (req.auth!.role !== 'admin') {
    throw new HttpError(403, 'Only admins can update org-wide ticket policy.');
  }
  const existing = await ticketsPolicyStore.get(orgId, patch.projectId);
  const updated = await ticketsPolicyStore.upsert({
    orgId,
    projectId: patch.projectId,
    assignmentMode: patch.assignmentMode,
    assigneePoolIds: patch.assigneePoolIds,
    slaHours: patch.slaHours,
    roundRobinCursor: patch.roundRobinCursor ?? existing.roundRobinCursor
  });
  res.json({ success: true, data: updated });
};

export const getTicketNotificationPolicyHandler = async (req: Request, res: Response) => {
  const { orgId } = orgParamsSchema.parse(req.params);
  if (req.auth!.role !== 'admin') throw new HttpError(403, 'Only admins can view ticket notification policy.');
  const policy = await ticketsNotificationPolicyStore.get(orgId);
  res.json({ success: true, data: policy });
};

export const patchTicketNotificationPolicyHandler = async (req: Request, res: Response) => {
  const { orgId } = orgParamsSchema.parse(req.params);
  if (req.auth!.role !== 'admin') throw new HttpError(403, 'Only admins can update ticket notification policy.');
  const patch = notificationPolicySchema.parse(req.body);
  const policy = await ticketsNotificationPolicyStore.upsert({ orgId, patch });
  res.json({ success: true, data: policy });
};

export const postTicketNotificationPreflightHandler = async (req: Request, res: Response) => {
  const { orgId } = orgParamsSchema.parse(req.params);
  if (req.auth!.role !== 'admin') throw new HttpError(403, 'Only admins can run notification sender preflight.');
  const body = senderPreflightSchema.parse(req.body || {});
  const result = await ticketsGraphService.senderMailboxPreflight({
    orgId,
    testRecipientEmail: body.testRecipientEmail
  });
  res.json({ success: true, data: result });
};

export const getTicketNotificationSetupScriptHandler = async (req: Request, res: Response) => {
  const { orgId } = orgParamsSchema.parse(req.params);
  if (req.auth!.role !== 'admin') throw new HttpError(403, 'Only admins can generate notification setup script.');

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      loginSubdomain: true,
      notificationSenderEmail: true,
      microsoftWorkspaceConnected: true,
      microsoftTenantId: true
    }
  });
  if (!org) throw new HttpError(404, 'Organization not found.');

  const appId = String(env.MICROSOFT_OAUTH_CLIENT_ID || '').trim();
  const senderEmail = String(org.notificationSenderEmail || '').trim().toLowerCase();
  const scopeGroupName = `${org.loginSubdomain}-velo-mailbox-scope`;
  const scopeGroupAlias = `${org.loginSubdomain}-velo-mail-scope`.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  const scopeGroupId = `${scopeGroupAlias}@${senderEmail.split('@')[1] || 'yourdomain.com'}`;

  const preflight = senderEmail
    ? await ticketsGraphService.senderMailboxPreflight({ orgId })
    : { ok: false, checks: [{ key: 'sender_mailbox', ok: false, message: 'Sender mailbox is not configured.' }] };

  const checklist = [
    { key: 'workspace_connection', label: 'Microsoft workspace connected', ok: Boolean(org.microsoftWorkspaceConnected) },
    { key: 'tenant_id', label: 'Tenant ID discovered', ok: Boolean(org.microsoftTenantId) },
    { key: 'sender_mailbox', label: 'Sender mailbox configured', ok: Boolean(senderEmail) },
    { key: 'app_id', label: 'App registration client ID configured on server', ok: Boolean(appId) },
    { key: 'preflight_ok', label: 'Preflight checks', ok: Boolean(preflight.ok) }
  ];

  const script = [
    '# Velo notification mailbox scope setup (Exchange Online)',
    '# Run as Exchange/M365 admin in PowerShell',
    '',
    'Connect-ExchangeOnline',
    '',
    '# 1) Create (or reuse) mailbox scope group',
    `$scopeName = ${toPsSingleQuoted(scopeGroupName)}`,
    `$scopeAlias = ${toPsSingleQuoted(scopeGroupAlias)}`,
    `$scopeSmtp = ${toPsSingleQuoted(scopeGroupId)}`,
    `$appId = ${toPsSingleQuoted(appId || '<MICROSOFT_OAUTH_CLIENT_ID>')}`,
    `$senderMailbox = ${toPsSingleQuoted(senderEmail || 'project@yourdomain.com')}`,
    '',
    '$group = Get-DistributionGroup -Identity $scopeSmtp -ErrorAction SilentlyContinue',
    'if (-not $group) {',
    '  $group = New-DistributionGroup -Name $scopeName -Alias $scopeAlias -Type Security -PrimarySmtpAddress $scopeSmtp',
    '}',
    '',
    '# 2) Ensure sender mailbox is in scope group',
    '$existingMember = Get-DistributionGroupMember -Identity $scopeSmtp -ResultSize Unlimited | Where-Object { $_.PrimarySmtpAddress -eq $senderMailbox }',
    'if (-not $existingMember) {',
    '  Add-DistributionGroupMember -Identity $scopeSmtp -Member $senderMailbox',
    '}',
    '',
    '# 3) Create or update Application Access Policy',
    '$policy = Get-ApplicationAccessPolicy | Where-Object { $_.AppId -eq $appId -and $_.PolicyScopeGroupId -eq $scopeSmtp } | Select-Object -First 1',
    'if (-not $policy) {',
    '  New-ApplicationAccessPolicy -AppId $appId -PolicyScopeGroupId $scopeSmtp -AccessRight RestrictAccess -Description "Velo mailbox scope policy"',
    '}',
    '',
    '# 4) Validate policy (should be Granted)',
    'Test-ApplicationAccessPolicy -AppId $appId -Identity $senderMailbox',
    '',
    '# Optional: verify Graph app permissions/admin consent in Entra UI:',
    '# Mail.Send (Application), Mail.Read (Application) with admin consent.'
  ].join('\n');

  res.json({
    success: true,
    data: {
      ready: checklist.every((item) => item.ok),
      appId: appId || null,
      senderEmail: senderEmail || null,
      scopeGroupName,
      scopeGroupId,
      checklist,
      preflight,
      script,
      filename: `${org.loginSubdomain}-velo-mailbox-policy.ps1`
    }
  });
};
