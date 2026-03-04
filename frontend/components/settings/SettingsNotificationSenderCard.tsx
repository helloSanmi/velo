import React from 'react';
import { Mail } from 'lucide-react';
import { NotificationSenderPreflightResult, NotificationSetupGuide } from '../../types';
import Button from '../ui/Button';

interface SettingsNotificationSenderCardProps {
  senderDraft: string;
  setSenderDraft: (value: string) => void;
  senderSaving: boolean;
  hasSenderChanges: boolean;
  preflightRecipient: string;
  setPreflightRecipient: (value: string) => void;
  preflightRunning: boolean;
  preflightResult: NotificationSenderPreflightResult | null;
  setupLoading: boolean;
  setupGuide: NotificationSetupGuide | null;
  onSaveSender: () => void;
  onRunPreflight: () => void;
  onLoadSetupGuide: () => void;
  onCopySetupScript: () => void;
  onDownloadSetupScript: () => void;
}

const SettingsNotificationSenderCard: React.FC<SettingsNotificationSenderCardProps> = ({
  senderDraft,
  setSenderDraft,
  senderSaving,
  hasSenderChanges,
  preflightRecipient,
  setPreflightRecipient,
  preflightRunning,
  preflightResult,
  setupLoading,
  setupGuide,
  onSaveSender,
  onRunPreflight,
  onLoadSetupGuide,
  onCopySetupScript,
  onDownloadSetupScript
}) => {
  return (
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
        <Button size="sm" onClick={onSaveSender} disabled={!hasSenderChanges || senderSaving}>
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
        <Button size="sm" variant="outline" onClick={onRunPreflight} disabled={preflightRunning}>
          {preflightRunning ? 'Running...' : 'Run preflight'}
        </Button>
        <Button size="sm" variant="outline" onClick={onLoadSetupGuide} disabled={setupLoading}>
          {setupLoading ? 'Generating...' : 'Generate setup script'}
        </Button>
      </div>

      {preflightResult ? (
        <div
          className={`mt-2 rounded-lg border p-2 text-xs ${
            preflightResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
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
            <Button size="sm" variant="outline" onClick={onCopySetupScript}>
              Copy PowerShell
            </Button>
            <Button size="sm" variant="outline" onClick={onDownloadSetupScript}>
              Download .ps1
            </Button>
            <Button size="sm" variant="outline" onClick={onLoadSetupGuide} disabled={setupLoading}>
              Refresh checklist
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SettingsNotificationSenderCard;
