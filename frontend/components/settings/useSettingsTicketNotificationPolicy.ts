import { useEffect, useMemo, useState } from 'react';
import { Organization, TicketNotificationEventType, TicketNotificationPolicy } from '../../types';
import { ticketService } from '../../services/ticketService';
import { dialogService } from '../../services/dialogService';
import { useSettingsNotificationSender } from './useSettingsNotificationSender';

const clonePolicy = (policy: TicketNotificationPolicy): TicketNotificationPolicy =>
  JSON.parse(JSON.stringify(policy)) as TicketNotificationPolicy;

const isEventEnabled = (policy: TicketNotificationPolicy, eventType: TicketNotificationEventType): boolean => {
  const event = policy.events[eventType];
  return Boolean(event?.immediate || event?.digest);
};

export const useSettingsTicketNotificationPolicy = (
  org: Organization,
  onUpdateOrganizationSettings: (
    patch: Partial<Pick<Organization, 'notificationSenderEmail'>>
  ) => Promise<Organization | null>
) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<TicketNotificationPolicy | null>(null);
  const [draft, setDraft] = useState<TicketNotificationPolicy | null>(null);

  const sender = useSettingsNotificationSender({ org, onUpdateOrganizationSettings });

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

  const discardPolicy = () => {
    if (!policy) return;
    setDraft(clonePolicy(policy));
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

  return {
    expanded,
    setExpanded,
    loading,
    saving,
    draft,
    hasPolicyChanges,
    isEventEnabled,
    toggleRoot,
    toggleEvent,
    discardPolicy,
    savePolicy,
    ...sender
  };
};
