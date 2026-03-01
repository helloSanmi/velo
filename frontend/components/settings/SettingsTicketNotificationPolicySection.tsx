import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, Mail } from 'lucide-react';
import {
  NotificationSetupGuide,
  NotificationSenderPreflightResult,
  Organization,
  TicketNotificationEventType,
  TicketNotificationPolicy
} from '../../types';
import { ticketService } from '../../services/ticketService';
import Button from '../ui/Button';
import { dialogService } from '../../services/dialogService';

interface SettingsTicketNotificationPolicySectionProps {
  org: Organization;
  onUpdateOrganizationSettings: (
    patch: Partial<Pick<Organization, 'notificationSenderEmail'>>
  ) => Promise<void>;
}

const toggleClass = (active: boolean) =>
  `w-10 h-5 rounded-full p-1 transition-colors ${active ? 'bg-slate-900' : 'bg-slate-300'}`;
const thumbClass = (active: boolean) =>
  `block w-3 h-3 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`;

const EVENT_ROWS: Array<{ key: TicketNotificationEventType; label: string; help: string }> = [
  { key: 'ticket_created', label: 'New tickets', help: 'Notify when a new ticket is created.' },
  { key: 'ticket_assigned', label: 'Assignments', help: 'Notify when tickets are assigned/reassigned.' },
  { key: 'ticket_status_changed', label: 'Status changes', help: 'Notify on ticket status movement.' },
  { key: 'ticket_commented', label: 'Comments & replies', help: 'Notify on ticket comments and responses.' },
  { key: 'ticket_sla_breach', label: 'SLA alerts', help: 'Notify when ticket SLA is at risk or breached.' },
  { key: 'ticket_approval_required', label: 'Ticket approvals', help: 'Notify when ticket approval action is needed.' },
  {
    key: 'project_completion_actions',
    label: 'Project completion actions',
    help: 'Notify owner/admin on completion requests and completion approvals.'
  },
  { key: 'task_assignment', label: 'Task assignment', help: 'Notify assigned users when tasks are assigned.' },
  { key: 'task_due_overdue', label: 'Task due/overdue', help: 'Notify assigned users when tasks are due soon or overdue.' },
  { key: 'task_status_changes', label: 'Task status updates', help: 'Notify assigned users when task status changes.' },
  {
    key: 'security_admin_alerts',
    label: 'Security/admin alerts',
    help: 'Notify admins on sensitive workspace/user/team changes.'
  },
  {
    key: 'user_lifecycle',
    label: 'User lifecycle updates',
    help: 'Notify users when they are licensed, unlicensed, added/removed from team, or removed from workspace.'
  }
];

const clonePolicy = (policy: TicketNotificationPolicy): TicketNotificationPolicy =>
  JSON.parse(JSON.stringify(policy)) as TicketNotificationPolicy;

const isEventEnabled = (policy: TicketNotificationPolicy, eventType: TicketNotificationEventType): boolean => {
  const event = policy.events[eventType];
  return Boolean(event?.immediate || event?.digest);
};

const SettingsTicketNotificationPolicySection: React.FC<SettingsTicketNotificationPolicySectionProps> = ({
  org,
  onUpdateOrganizationSettings
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<TicketNotificationPolicy | null>(null);
  const [draft, setDraft] = useState<TicketNotificationPolicy | null>(null);

  const [senderDraft, setSenderDraft] = useState(org.notificationSenderEmail || '');
  const [senderSaving, setSenderSaving] = useState(false);
  const [preflightRunning, setPreflightRunning] = useState(false);
  const [preflightRecipient, setPreflightRecipient] = useState('');
  const [preflightResult, setPreflightResult] = useState<NotificationSenderPreflightResult | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupGuide, setSetupGuide] = useState<NotificationSetupGuide | null>(null);

  useEffect(() => {
    setSenderDraft(org.notificationSenderEmail || '');
  }, [org.notificationSenderEmail]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ticketService
      .getNotificationPolicy(org.id)
      .then((value) => {
        if (cancelled) return;
        setPolicy(value);
        setDraft(clonePolicy(value));
      })
      .catch((error) => {
        dialogService.alert(error?.message || 'Could not load notification settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [org.id]);

  const hasPolicyChanges = useMemo(() => {
    if (!policy || !draft) return false;
    return JSON.stringify(policy) !== JSON.stringify(draft);
  }, [policy, draft]);

  const hasSenderChanges = useMemo(
    () => senderDraft.trim().toLowerCase() !== String(org.notificationSenderEmail || '').trim().toLowerCase(),
    [senderDraft, org.notificationSenderEmail]
  );

  const toggleRoot = (path: 'enabled' | 'email' | 'teams') => {
    if (!draft) return;
    const next = clonePolicy(draft);
    if (path === 'enabled') next.enabled = !next.enabled;
    if (path === 'email') next.channels.email = !next.channels.email;
    if (path === 'teams') next.channels.teams = !next.channels.teams;
    setDraft(next);
  };

  const toggleEvent = (eventType: TicketNotificationEventType) => {
    if (!draft) return;
    const next = clonePolicy(draft);
    const currentlyEnabled = isEventEnabled(next, eventType);
    next.events[eventType].immediate = !currentlyEnabled;
    next.events[eventType].digest = !currentlyEnabled;
    next.events[eventType].channels.email = !currentlyEnabled;
    next.events[eventType].channels.teams = !currentlyEnabled;
    setDraft(next);
  };

  const savePolicy = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await ticketService.updateNotificationPolicy(org.id, {
        enabled: draft.enabled,
        channels: draft.channels,
        events: draft.events
      });
      setPolicy(updated);
      setDraft(clonePolicy(updated));
      dialogService.notice('Notification toggles updated.');
    } catch (error: any) {
      dialogService.alert(error?.message || 'Could not save notification toggles.');
    } finally {
      setSaving(false);
    }
  };

  const saveSender = async () => {
    const value = senderDraft.trim().toLowerCase();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      dialogService.alert('Enter a valid sender email, e.g. project@acme.ng');
      return;
    }
    setSenderSaving(true);
    try {
      await onUpdateOrganizationSettings({ notificationSenderEmail: value || undefined });
      setSetupGuide(null);
      dialogService.notice('Notification sender mailbox updated.');
    } catch (error: any) {
      dialogService.alert(error?.message || 'Could not update sender mailbox.');
    } finally {
      setSenderSaving(false);
    }
  };

  const runPreflight = async () => {
    setPreflightRunning(true);
    try {
      const result = await ticketService.runNotificationSenderPreflight(org.id, {
        testRecipientEmail: preflightRecipient.trim() || undefined
      });
      setPreflightResult(result);
      dialogService.notice(result.ok ? 'Sender preflight passed.' : 'Sender preflight found issues.');
    } catch (error: any) {
      dialogService.alert(error?.message || 'Could not run sender preflight.');
    } finally {
      setPreflightRunning(false);
    }
  };

  const loadSetupGuide = async () => {
    setSetupLoading(true);
    try {
      const guide = await ticketService.getNotificationSetupGuide(org.id);
      setSetupGuide(guide);
      setPreflightResult(guide.preflight);
      dialogService.notice(guide.ready ? 'Notification setup is ready.' : 'Setup steps generated.');
    } catch (error: any) {
      dialogService.alert(error?.message || 'Could not generate setup script.');
    } finally {
      setSetupLoading(false);
    }
  };

  const copySetupScript = async () => {
    if (!setupGuide?.script) return;
    try {
      await navigator.clipboard.writeText(setupGuide.script);
      dialogService.notice('PowerShell setup script copied.');
    } catch {
      dialogService.alert('Could not copy script.');
    }
  };

  const downloadSetupScript = () => {
    if (!setupGuide?.script) return;
    const blob = new Blob([setupGuide.script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = setupGuide.filename || 'velo-mailbox-policy.ps1';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-200 text-left"
      >
        <div className="inline-flex items-center gap-2">
          <BellRing className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900">Workspace notifications</span>
        </div>
        <span className="text-xs text-slate-500">{expanded ? 'Hide' : 'Show'}</span>
      </button>

      {expanded ? (
        <div className="p-4 space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="inline-flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-900">Sender mailbox</p>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              Use one org mailbox as the source for outbound notifications (example: <span className="font-medium">project@acme.ng</span>).
            </p>
            <div className="flex items-center gap-2">
              <input
                value={senderDraft}
                onChange={(event) => setSenderDraft(event.target.value)}
                placeholder="project@acme.ng"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              />
              <Button size="sm" onClick={() => void saveSender()} disabled={!hasSenderChanges || senderSaving}>
                {senderSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={preflightRecipient}
                onChange={(event) => setPreflightRecipient(event.target.value)}
                placeholder="Optional test recipient email"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              />
              <Button size="sm" variant="outline" onClick={() => void runPreflight()} disabled={preflightRunning}>
                {preflightRunning ? 'Running...' : 'Run preflight'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void loadSetupGuide()} disabled={setupLoading}>
                {setupLoading ? 'Generating...' : 'Generate setup script'}
              </Button>
            </div>
            {preflightResult ? (
              <div className={`mt-2 rounded-lg border p-2 text-xs ${preflightResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
                <p className="font-semibold">{preflightResult.ok ? 'Sender preflight passed' : 'Sender preflight failed'}</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {preflightResult.checks.map((check) => (
                    <li key={check.key}>
                      {check.ok ? 'OK' : 'FAIL'} - {check.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {setupGuide ? (
              <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Microsoft app-only onboarding</p>
                  <span className={`text-xs font-medium ${setupGuide.ready ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {setupGuide.ready ? 'Ready' : 'Action required'}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {setupGuide.checklist.map((item) => (
                    <div key={item.key} className="text-xs text-slate-700">
                      {item.ok ? 'OK' : 'TODO'} - {item.label}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void copySetupScript()}>
                    Copy PowerShell
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadSetupScript()}>
                    Download .ps1
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void loadSetupGuide()} disabled={setupLoading}>
                    Refresh checklist
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {loading || !draft ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Loading notification toggles...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">Enable notifications</p>
                  <button type="button" onClick={() => toggleRoot('enabled')} className={toggleClass(draft.enabled)}>
                    <span className={thumbClass(draft.enabled)} />
                  </button>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">Email channel</p>
                  <button type="button" onClick={() => toggleRoot('email')} className={toggleClass(draft.channels.email)}>
                    <span className={thumbClass(draft.channels.email)} />
                  </button>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">Teams channel</p>
                  <button type="button" onClick={() => toggleRoot('teams')} className={toggleClass(draft.channels.teams)}>
                    <span className={thumbClass(draft.channels.teams)} />
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                {EVENT_ROWS.map((row) => {
                  const enabled = isEventEnabled(draft, row.key);
                  return (
                    <div key={row.key} className="px-3 py-2 border-b border-slate-100 last:border-b-0 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.help}</p>
                      </div>
                      <button type="button" onClick={() => toggleEvent(row.key)} className={toggleClass(enabled)}>
                        <span className={thumbClass(enabled)} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">{hasPolicyChanges ? 'Unsaved notification toggle changes.' : 'No pending changes.'}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setDraft(clonePolicy(policy!))} disabled={!hasPolicyChanges || saving}>
                    Discard
                  </Button>
                  <Button onClick={() => void savePolicy()} disabled={!hasPolicyChanges || saving} className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Save toggles
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SettingsTicketNotificationPolicySection;
