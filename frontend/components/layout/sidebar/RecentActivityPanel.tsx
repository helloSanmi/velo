import React from 'react';
import { RecentActionItem } from '../../../hooks/useRecentActions';

interface RecentActivityPanelProps {
  recentActions: RecentActionItem[];
}

const RecentActivityPanel: React.FC<RecentActivityPanelProps> = ({ recentActions }) => {
  return (
    <div className="pt-4 border-t border-[#ead4df] space-y-3">
      <div className="flex items-center gap-2 px-3 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a506f] truncate">Recent Activity</p>
      </div>
      <div className="space-y-3 px-3">
        {recentActions.map((action, index) => (
          <div key={`${action.timestamp}-${index}`} className="animate-in fade-in slide-in-from-left-2 duration-500">
            <p className="text-[12px] font-medium text-slate-700 leading-tight">
              <span className="text-slate-900">{action.displayName}</span> {action.action.toLowerCase()}
            </p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">{action.taskTitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivityPanel;
