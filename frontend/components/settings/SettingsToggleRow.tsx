import React from 'react';

interface SettingsToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

const SettingsToggleRow: React.FC<SettingsToggleRowProps> = ({
  icon,
  title,
  description,
  enabled,
  onToggle
}) => {
  return (
    <div className="flex items-start justify-between p-3 md:p-4 bg-white border border-slate-200 rounded-xl gap-3">
      <div className="flex items-start gap-2.5 md:gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        aria-label={`Toggle ${title}`}
        className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${
          enabled ? 'bg-slate-900' : 'bg-slate-300'
        }`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
};

export default SettingsToggleRow;
