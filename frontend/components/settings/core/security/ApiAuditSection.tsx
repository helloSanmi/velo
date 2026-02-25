import React, { useState } from 'react';
import { ChevronDown, ChevronUp, KeyRound } from 'lucide-react';
import { UserSettings } from '../../../../services/settingsService';
import AppSelect from '../../../ui/AppSelect';

interface ApiAuditSectionProps {
  draft: Pick<
    UserSettings,
    | 'securityApiTokensEnabled'
    | 'securityAuditExportEnabled'
    | 'securityRequireApprovalForPurge'
    | 'securityAlertOnRiskEvents'
    | 'dataRetentionPolicy'
  >;
  onUpdate: (updates: Partial<UserSettings>) => void;
}

const toggleClass = (active: boolean) => `w-11 h-6 rounded-full p-1 transition-colors ${active ? 'bg-slate-900' : 'bg-slate-300'}`;
const thumbClass = (active: boolean) => `block w-4 h-4 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`;
const rowClass = 'flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2';

const ApiAuditSection: React.FC<ApiAuditSectionProps> = ({ draft, onUpdate }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <KeyRound className="h-4 w-4 text-slate-600" />
          API, audit & data protection
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>
      {open ? (
        <div className="space-y-2">
          {[
            ['securityApiTokensEnabled', 'API tokens enabled', 'Allow API token usage for integrations.'],
            ['securityAuditExportEnabled', 'Audit export enabled', 'Allow audit log export for compliance.'],
            ['securityRequireApprovalForPurge', 'Approval required for purge', 'Require admin approval before hard deletes.'],
            ['securityAlertOnRiskEvents', 'Security risk alerts', 'Alert admins on suspicious/risky events.']
          ].map(([key, title, subtitle]) => (
            <div key={key} className={rowClass}>
              <div>
                <p className="text-sm text-slate-900">{title}</p>
                <p className="text-[11px] text-slate-500">{subtitle}</p>
              </div>
              <button type="button" onClick={() => onUpdate({ [key]: !Boolean(draft[key as keyof typeof draft]) } as Partial<UserSettings>)} className={toggleClass(Boolean(draft[key as keyof typeof draft]))}>
                <span className={thumbClass(Boolean(draft[key as keyof typeof draft]))} />
              </button>
            </div>
          ))}
          <label className={rowClass}>
            <p className="text-sm text-slate-800">Data retention policy</p>
            <div className="w-[160px]">
              <AppSelect
                value={draft.dataRetentionPolicy}
                onChange={(value) => onUpdate({ dataRetentionPolicy: value as UserSettings['dataRetentionPolicy'] })}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                options={[
                  { value: '30_days', label: '30 days' },
                  { value: '90_days', label: '90 days' },
                  { value: '365_days', label: '365 days' },
                  { value: 'indefinite', label: 'Indefinitely' }
                ]}
              />
            </div>
          </label>
        </div>
      ) : null}
    </div>
  );
};

export default ApiAuditSection;
