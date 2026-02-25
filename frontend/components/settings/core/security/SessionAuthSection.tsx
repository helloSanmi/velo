import React, { useState } from 'react';
import { ChevronDown, ChevronUp, UserCog } from 'lucide-react';
import { UserSettings } from '../../../../services/settingsService';
import AppSelect from '../../../ui/AppSelect';

interface SessionAuthSectionProps {
  draft: Pick<
    UserSettings,
    | 'securitySessionTimeoutMinutes'
    | 'securityPasswordMinLength'
    | 'securityLockoutAttempts'
    | 'securitySingleSessionOnly'
    | 'securityPasswordRequireComplexity'
  >;
  onUpdate: (updates: Partial<UserSettings>) => void;
}

const toggleClass = (active: boolean) => `w-11 h-6 rounded-full p-1 transition-colors ${active ? 'bg-slate-900' : 'bg-slate-300'}`;
const thumbClass = (active: boolean) => `block w-4 h-4 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`;
const rowClass = 'flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2';

const SessionAuthSection: React.FC<SessionAuthSectionProps> = ({ draft, onUpdate }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <UserCog className="h-4 w-4 text-slate-600" />
          Session & authentication
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>
      {open ? (
        <div className="space-y-2">
          <div className={rowClass}>
            <p className="text-sm text-slate-800">Idle timeout</p>
            <div className="w-[140px]">
              <AppSelect
                value={String(draft.securitySessionTimeoutMinutes)}
                onChange={(value) => onUpdate({ securitySessionTimeoutMinutes: Number(value) as UserSettings['securitySessionTimeoutMinutes'] })}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                options={[
                  { value: '15', label: '15 min' },
                  { value: '30', label: '30 min' },
                  { value: '60', label: '60 min' },
                  { value: '120', label: '120 min' }
                ]}
              />
            </div>
          </div>
          <div className={rowClass}>
            <p className="text-sm text-slate-800">Password min length</p>
            <div className="w-[140px]">
              <AppSelect
                value={String(draft.securityPasswordMinLength)}
                onChange={(value) => onUpdate({ securityPasswordMinLength: Number(value) as UserSettings['securityPasswordMinLength'] })}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                options={[
                  { value: '8', label: '8' },
                  { value: '10', label: '10' },
                  { value: '12', label: '12' }
                ]}
              />
            </div>
          </div>
          <div className={rowClass}>
            <p className="text-sm text-slate-800">Lockout attempts</p>
            <div className="w-[140px]">
              <AppSelect
                value={String(draft.securityLockoutAttempts)}
                onChange={(value) => onUpdate({ securityLockoutAttempts: Number(value) as UserSettings['securityLockoutAttempts'] })}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                options={[
                  { value: '3', label: '3 attempts' },
                  { value: '5', label: '5 attempts' },
                  { value: '10', label: '10 attempts' }
                ]}
              />
            </div>
          </div>
          <div className={rowClass}>
            <div>
              <p className="text-sm text-slate-900">Single session only</p>
              <p className="text-[11px] text-slate-500">Sign out other sessions on login.</p>
            </div>
            <button type="button" onClick={() => onUpdate({ securitySingleSessionOnly: !draft.securitySingleSessionOnly })} className={toggleClass(draft.securitySingleSessionOnly)}>
              <span className={thumbClass(draft.securitySingleSessionOnly)} />
            </button>
          </div>
          <div className={rowClass}>
            <div>
              <p className="text-sm text-slate-900">Require password complexity</p>
              <p className="text-[11px] text-slate-500">Uppercase, lowercase, number, and symbol.</p>
            </div>
            <button type="button" onClick={() => onUpdate({ securityPasswordRequireComplexity: !draft.securityPasswordRequireComplexity })} className={toggleClass(draft.securityPasswordRequireComplexity)}>
              <span className={thumbClass(draft.securityPasswordRequireComplexity)} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SessionAuthSection;
