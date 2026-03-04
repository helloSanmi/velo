import React from 'react';
import { TicketNotificationPolicy } from '../../types';
import { thumbClass, toggleClass } from './settingsTicketNotificationPolicy.constants';

interface SettingsNotificationRootTogglesProps {
  draft: TicketNotificationPolicy;
  onToggleRoot: (path: 'enabled' | 'email' | 'teams') => void;
}

const SettingsNotificationRootToggles: React.FC<SettingsNotificationRootTogglesProps> = ({ draft, onToggleRoot }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">Enable notifications</p>
        <button type="button" onClick={() => onToggleRoot('enabled')} className={toggleClass(draft.enabled)}>
          <span className={thumbClass(draft.enabled)} />
        </button>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">Email channel</p>
        <button type="button" onClick={() => onToggleRoot('email')} className={toggleClass(draft.channels.email)}>
          <span className={thumbClass(draft.channels.email)} />
        </button>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">Teams channel</p>
        <button type="button" onClick={() => onToggleRoot('teams')} className={toggleClass(draft.channels.teams)}>
          <span className={thumbClass(draft.channels.teams)} />
        </button>
      </div>
    </div>
  );
};

export default SettingsNotificationRootToggles;
