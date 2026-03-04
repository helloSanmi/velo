import React from 'react';
import { BellRing, CheckCircle2 } from 'lucide-react';
import { Organization } from '../../types';
import Button from '../ui/Button';
import SettingsNotificationSenderCard from './SettingsNotificationSenderCard';
import SettingsNotificationRootToggles from './SettingsNotificationRootToggles';
import SettingsNotificationEventRows from './SettingsNotificationEventRows';
import { useSettingsTicketNotificationPolicy } from './useSettingsTicketNotificationPolicy';

interface SettingsTicketNotificationPolicySectionProps {
  org: Organization;
  onUpdateOrganizationSettings: (
    patch: Partial<Pick<Organization, 'notificationSenderEmail'>>
  ) => Promise<void>;
}

const SettingsTicketNotificationPolicySection: React.FC<SettingsTicketNotificationPolicySectionProps> = ({
  org,
  onUpdateOrganizationSettings
}) => {
  const {
    expanded,
    setExpanded,
    loading,
    saving,
    draft,
    hasPolicyChanges,
    hasSenderChanges,
    senderDraft,
    setSenderDraft,
    senderSaving,
    preflightRunning,
    preflightRecipient,
    setPreflightRecipient,
    preflightResult,
    setupLoading,
    setupGuide,
    isEventEnabled,
    toggleRoot,
    toggleEvent,
    discardPolicy,
    savePolicy,
    saveSender,
    runPreflight,
    loadSetupGuide,
    copySetupScript,
    downloadSetupScript
  } = useSettingsTicketNotificationPolicy(org, onUpdateOrganizationSettings);

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
          <SettingsNotificationSenderCard
            senderDraft={senderDraft}
            setSenderDraft={setSenderDraft}
            senderSaving={senderSaving}
            hasSenderChanges={hasSenderChanges}
            preflightRecipient={preflightRecipient}
            setPreflightRecipient={setPreflightRecipient}
            preflightRunning={preflightRunning}
            preflightResult={preflightResult}
            setupLoading={setupLoading}
            setupGuide={setupGuide}
            onSaveSender={() => void saveSender()}
            onRunPreflight={() => void runPreflight()}
            onLoadSetupGuide={() => void loadSetupGuide()}
            onCopySetupScript={() => void copySetupScript()}
            onDownloadSetupScript={downloadSetupScript}
          />

          {loading || !draft ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Loading notification toggles...
            </div>
          ) : (
            <>
              <SettingsNotificationRootToggles draft={draft} onToggleRoot={toggleRoot} />
              <SettingsNotificationEventRows draft={draft} isEventEnabled={isEventEnabled} onToggleEvent={toggleEvent} />

              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">
                  {hasPolicyChanges ? 'Unsaved notification toggle changes.' : 'No pending changes.'}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={discardPolicy} disabled={!hasPolicyChanges || saving}>
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
