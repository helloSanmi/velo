import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  TicketNotificationActiveHealthCheck,
  TicketNotificationDelivery,
  TicketNotificationDiagnostics,
  TicketNotificationDeliveryStatus,
  TicketNotificationEventType,
  TicketNotificationPolicy
} from '../../types';
import { ticketService } from '../../services/ticketService';
import Button from '../ui/Button';
import { dialogService } from '../../services/dialogService';

interface SettingsTicketNotificationPolicySectionProps {
  orgId: string;
}

const toggleClass = (active: boolean) => `w-10 h-5 rounded-full p-1 transition-colors ${active ? 'bg-slate-900' : 'bg-slate-300'}`;
const thumbClass = (active: boolean) => `block w-3 h-3 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`;

const EVENT_LABELS: Record<TicketNotificationEventType, string> = {
  ticket_created: 'Ticket created',
  ticket_assigned: 'Ticket assigned',
  ticket_status_changed: 'Status changed',
  ticket_commented: 'Comment added',
  ticket_sla_breach: 'SLA breach',
  ticket_approval_required: 'Approval required'
};

const clonePolicy = (policy: TicketNotificationPolicy): TicketNotificationPolicy =>
  JSON.parse(JSON.stringify(policy)) as TicketNotificationPolicy;

const SettingsTicketNotificationPolicySection: React.FC<SettingsTicketNotificationPolicySectionProps> = ({ orgId }) => {
  const [policy, setPolicy] = useState<TicketNotificationPolicy | null>(null);
  const [draft, setDraft] = useState<TicketNotificationPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [queueStatus, setQueueStatus] = useState<{ queued: number; digestPending: number } | null>(null);
  const [deliveries, setDeliveries] = useState<TicketNotificationDelivery[]>([]);
  const [diagnostics, setDiagnostics] = useState<TicketNotificationDiagnostics | null>(null);
  const [activeHealth, setActiveHealth] = useState<TicketNotificationActiveHealthCheck | null>(null);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ticketService
      .getNotificationPolicy(orgId)
      .then((value) => {
        if (cancelled) return;
        setPolicy(value);
        setDraft(clonePolicy(value));
      })
      .catch((error) => {
        dialogService.alert(error?.message || 'Could not load ticket notification policy.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const hasChanges = useMemo(() => {
    if (!policy || !draft) return false;
    return JSON.stringify(policy) !== JSON.stringify(draft);
  }, [policy, draft]);

  const updateEvent = (eventType: TicketNotificationEventType, path: 'immediate' | 'digest' | 'email' | 'teams') => {
    if (!draft) return;
    const next = clonePolicy(draft);
    if (path === 'email' || path === 'teams') next.events[eventType].channels[path] = !next.events[eventType].channels[path];
    else next.events[eventType][path] = !next.events[eventType][path];
    setDraft(next);
  };

  const toggleRoot = (path: 'enabled' | 'quietHoursEnabled' | 'email' | 'teams') => {
    if (!draft) return;
    const next = clonePolicy(draft);
    if (path === 'email' || path === 'teams') next.channels[path] = !next.channels[path];
    else next[path] = !next[path];
    setDraft(next);
  };

  const loadDeliveryState = async () => {
    setDeliveriesLoading(true);
    try {
      const [queue, health, failed, sent] = await Promise.all([
        ticketService.getNotificationQueueStatus(orgId),
        ticketService.getNotificationDiagnostics(orgId),
        ticketService.getNotificationDeliveries(orgId, { status: 'dead_letter', limit: 20 }),
        ticketService.getNotificationDeliveries(orgId, { status: 'sent', limit: 20 })
      ]);
      setQueueStatus(queue);
      setDiagnostics(health);
      setDeliveries([...failed, ...sent].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch (error: any) {
      dialogService.alert(error?.message || 'Could not load notification delivery status.');
    } finally {
      setDeliveriesLoading(false);
    }
  };

  useEffect(() => {
    if (!expanded) return;
    void loadDeliveryState();
  }, [expanded, orgId]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await ticketService.updateNotificationPolicy(orgId, {
        enabled: draft.enabled,
        quietHoursEnabled: draft.quietHoursEnabled,
        quietHoursStartHour: draft.quietHoursStartHour,
        quietHoursEndHour: draft.quietHoursEndHour,
        timezoneOffsetMinutes: draft.timezoneOffsetMinutes,
        channels: draft.channels,
        digest: draft.digest,
        events: draft.events
      });
      setPolicy(updated);
      setDraft(clonePolicy(updated));
      dialogService.notice('Ticket notification policy updated.');
    } catch (error: any) {
      dialogService.alert(error?.message || 'Could not save ticket notification policy.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Loading ticket notification policy...
      </div>
    );
  }
  if (!draft) return null;

  const retryDelivery = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      await ticketService.retryNotificationDelivery(orgId, deliveryId);
      dialogService.notice('Notification retry triggered.');
      await loadDeliveryState();
    } catch (error: any) {
      dialogService.alert(error?.message || 'Could not retry notification.');
    } finally {
      setRetryingId(null);
    }
  };

  const runHealthCheck = async () => {
    setRunningHealthCheck(true);
    try {
      const result = await ticketService.runNotificationHealthCheck(orgId);
      setActiveHealth(result);
      await loadDeliveryState();
      dialogService.notice(result.ok ? 'Health check passed.' : 'Health check found issues. Review remediation steps.');
    } catch (error: any) {
      dialogService.alert(error?.message || 'Could not run health check.');
    } finally {
      setRunningHealthCheck(false);
    }
  };

  const statusBadgeClass = (status: TicketNotificationDeliveryStatus) => {
    if (status === 'dead_letter' || status === 'failed') return 'text-rose-700 bg-rose-50 border-rose-200';
    if (status === 'sent') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (status === 'queued') return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  const healthBadgeClass = (status: string) => {
    if (status === 'ok' || status === 'sent') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (status === 'expiring' || status === 'queued') return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const formatIso = (value?: string) => {
    if (!value) return 'n/a';
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) return 'n/a';
    return new Date(ms).toLocaleString();
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
          <span className="text-sm font-semibold text-slate-900">Ticket notifications policy</span>
        </div>
        <span className="text-xs text-slate-500">{expanded ? 'Hide' : 'Show'}</span>
      </button>

      {expanded ? (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">Engine enabled</p>
              <button type="button" onClick={() => toggleRoot('enabled')} className={toggleClass(draft.enabled)}>
                <span className={thumbClass(draft.enabled)} />
              </button>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">Quiet hours</p>
              <button type="button" onClick={() => toggleRoot('quietHoursEnabled')} className={toggleClass(draft.quietHoursEnabled)}>
                <span className={thumbClass(draft.quietHoursEnabled)} />
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs text-slate-600">
              Quiet start (hour)
              <input
                type="number"
                min={0}
                max={23}
                value={draft.quietHoursStartHour}
                onChange={(event) => setDraft({ ...draft, quietHoursStartHour: Math.min(23, Math.max(0, Number(event.target.value) || 0)) })}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              Quiet end (hour)
              <input
                type="number"
                min={0}
                max={23}
                value={draft.quietHoursEndHour}
                onChange={(event) => setDraft({ ...draft, quietHoursEndHour: Math.min(23, Math.max(0, Number(event.target.value) || 0)) })}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              Timezone offset (min)
              <input
                type="number"
                min={-720}
                max={840}
                value={draft.timezoneOffsetMinutes}
                onChange={(event) => setDraft({ ...draft, timezoneOffsetMinutes: Math.min(840, Math.max(-720, Number(event.target.value) || 0)) })}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">Digest enabled</p>
              <button type="button" onClick={() => setDraft({ ...draft, digest: { ...draft.digest, enabled: !draft.digest.enabled } })} className={toggleClass(draft.digest.enabled)}>
                <span className={thumbClass(draft.digest.enabled)} />
              </button>
            </div>
            <label className="text-xs text-slate-600">
              Digest cadence
              <select
                value={draft.digest.cadence}
                onChange={(event) => setDraft({ ...draft, digest: { ...draft.digest, cadence: event.target.value as 'hourly' | 'daily' } })}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </label>
            <label className="text-xs text-slate-600">
              Daily digest hour
              <input
                type="number"
                min={0}
                max={23}
                value={draft.digest.dailyHourLocal}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    digest: {
                      ...draft.digest,
                      dailyHourLocal: Math.min(23, Math.max(0, Number(event.target.value) || 0))
                    }
                  })
                }
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
              />
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-5 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span className="col-span-2">Event</span>
              <span>Immediate</span>
              <span>Email</span>
              <span>Teams</span>
            </div>
            {(Object.keys(EVENT_LABELS) as TicketNotificationEventType[]).map((eventType) => (
              <div key={eventType} className="grid grid-cols-5 px-3 py-2 border-t border-slate-100 items-center">
                <span className="col-span-2 text-sm text-slate-800">{EVENT_LABELS[eventType]}</span>
                <button type="button" onClick={() => updateEvent(eventType, 'immediate')} className={toggleClass(draft.events[eventType].immediate)}>
                  <span className={thumbClass(draft.events[eventType].immediate)} />
                </button>
                <button type="button" onClick={() => updateEvent(eventType, 'email')} className={toggleClass(draft.events[eventType].channels.email)}>
                  <span className={thumbClass(draft.events[eventType].channels.email)} />
                </button>
                <button type="button" onClick={() => updateEvent(eventType, 'teams')} className={toggleClass(draft.events[eventType].channels.teams)}>
                  <span className={thumbClass(draft.events[eventType].channels.teams)} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">{hasChanges ? 'Unsaved policy changes.' : 'No pending policy changes.'}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDraft(clonePolicy(policy!))} disabled={!hasChanges || saving}>Discard</Button>
              <Button onClick={save} disabled={!hasChanges || saving} className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Save policy
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                Delivery status
              </div>
              <div className="inline-flex items-center gap-3">
                <span className="text-xs text-slate-600">
                  Queue {queueStatus?.queued ?? 0} • Digest {queueStatus?.digestPending ?? 0}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-slate-700"
                  onClick={() => void loadDeliveryState()}
                  disabled={deliveriesLoading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${deliveriesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runHealthCheck()}
                  disabled={runningHealthCheck}
                >
                  {runningHealthCheck ? 'Checking...' : 'Run health check'}
                </Button>
              </div>
            </div>
            {diagnostics ? (
              <div className="px-3 py-2 border-b border-slate-100 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">Microsoft token</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 ${healthBadgeClass(diagnostics.microsoft.tokenStatus)}`}>
                        {diagnostics.microsoft.tokenStatus}
                      </span>
                    </div>
                    <p>SSO {diagnostics.microsoft.ssoEnabled ? 'enabled' : 'disabled'} • connected {diagnostics.microsoft.connected ? 'yes' : 'no'}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">Subscription</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 ${healthBadgeClass(diagnostics.subscription.status)}`}>
                        {diagnostics.subscription.status}
                      </span>
                    </div>
                    <p>Expires {formatIso(diagnostics.subscription.expiresAt)}{typeof diagnostics.subscription.minutesRemaining === 'number' ? ` (${diagnostics.subscription.minutesRemaining}m)` : ''}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <p className="font-medium text-slate-700">Webhook</p>
                    <p>Last webhook {formatIso(diagnostics.webhook.lastWebhookAt)} • Last sync {formatIso(diagnostics.webhook.lastSyncAt)}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <p className="font-medium text-slate-700">Delivery health</p>
                    <p>Dead letters {diagnostics.delivery.deadLetterOpen} • Failed 24h {diagnostics.delivery.failedLast24h}</p>
                  </div>
                </div>
                {diagnostics.microsoft.tokenError ? (
                  <p className="mt-2 text-xs text-rose-600">{diagnostics.microsoft.tokenError}</p>
                ) : null}
              </div>
            ) : null}
            {activeHealth ? (
              <div className="px-3 py-2 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-medium text-slate-700">Active check • {formatIso(activeHealth.ranAt)}</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${healthBadgeClass(activeHealth.ok ? 'ok' : 'failed')}`}>
                    {activeHealth.ok ? 'healthy' : 'needs attention'}
                  </span>
                </div>
                <div className="space-y-1">
                  {activeHealth.checks.map((check) => (
                    <div key={check.key} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <p className={`text-xs font-medium ${check.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {check.key.replaceAll('_', ' ')}: {check.ok ? 'ok' : 'failed'}
                      </p>
                      <p className="text-xs text-slate-600">{check.detail}</p>
                      {check.remediation ? <p className="text-xs text-amber-700">Fix: {check.remediation}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="max-h-64 overflow-auto">
              {deliveries.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-500">No delivery records yet.</div>
              ) : (
                deliveries.map((row) => (
                  <div key={row.id} className="px-3 py-2 border-b border-slate-100 last:border-b-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-900 truncate">
                        {row.eventType.replaceAll('_', ' ')} {row.recipientEmail ? `• ${row.recipientEmail}` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.kind} • attempts {row.attempts}/{row.maxAttempts}
                        {row.lastError ? ` • ${row.lastError}` : ''}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] px-2 py-1 rounded-full border ${statusBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                      {row.status === 'dead_letter' || row.status === 'failed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retryingId === row.id}
                          onClick={() => void retryDelivery(row.id)}
                        >
                          Retry
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SettingsTicketNotificationPolicySection;
