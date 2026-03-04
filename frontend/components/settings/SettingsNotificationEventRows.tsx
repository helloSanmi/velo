import React from 'react';
import { TicketNotificationEventType, TicketNotificationPolicy } from '../../types';
import { EVENT_ROWS, thumbClass, toggleClass } from './settingsTicketNotificationPolicy.constants';

interface SettingsNotificationEventRowsProps {
  draft: TicketNotificationPolicy;
  isEventEnabled: (policy: TicketNotificationPolicy, eventType: TicketNotificationEventType) => boolean;
  onToggleEvent: (eventType: TicketNotificationEventType) => void;
}

const SettingsNotificationEventRows: React.FC<SettingsNotificationEventRowsProps> = ({ draft, isEventEnabled, onToggleEvent }) => {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {EVENT_ROWS.map((row) => {
        const enabled = isEventEnabled(draft, row.key);
        return (
          <div key={row.key} className="px-3 py-2 border-b border-slate-100 last:border-b-0 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-800">{row.label}</p>
              <p className="text-xs text-slate-500">{row.help}</p>
            </div>
            <button type="button" onClick={() => onToggleEvent(row.key)} className={toggleClass(enabled)}>
              <span className={thumbClass(enabled)} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SettingsNotificationEventRows;
