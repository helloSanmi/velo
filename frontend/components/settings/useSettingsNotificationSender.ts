import { useEffect, useMemo, useState } from 'react';
import { NotificationSenderPreflightResult, NotificationSetupGuide, Organization } from '../../types';
import { ticketService } from '../../services/ticketService';
import { dialogService } from '../../services/dialogService';

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

interface UseSettingsNotificationSenderArgs {
  org: Organization;
  onUpdateOrganizationSettings: (
    patch: Partial<Pick<Organization, 'notificationSenderEmail'>>
  ) => Promise<Organization | null>;
}

export const useSettingsNotificationSender = ({ org, onUpdateOrganizationSettings }: UseSettingsNotificationSenderArgs) => {
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

  const hasSenderChanges = useMemo(
    () => senderDraft.trim().toLowerCase() !== String(org.notificationSenderEmail || '').trim().toLowerCase(),
    [senderDraft, org.notificationSenderEmail]
  );

  const saveSender = async () => {
    const value = senderDraft.trim().toLowerCase();
    if (value && !isValidEmail(value)) {
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

  return {
    senderDraft,
    setSenderDraft,
    senderSaving,
    hasSenderChanges,
    preflightRunning,
    preflightRecipient,
    setPreflightRecipient,
    preflightResult,
    setupLoading,
    setupGuide,
    saveSender,
    runPreflight,
    loadSetupGuide,
    copySetupScript,
    downloadSetupScript
  };
};
