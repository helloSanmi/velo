import React from 'react';
import Badge from '../ui/Badge';
import { getUserFullName } from '../../utils/userDisplay';
import { UserWorkloadStat } from './types';

interface WorkloadUserCardProps {
  user: UserWorkloadStat;
}

const WorkloadUserCard: React.FC<WorkloadUserCardProps> = ({ user }) => {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={user.avatar}
            className="w-10 h-10 rounded-xl border border-slate-200"
            alt={user.displayName}
            title={getUserFullName(user)}
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{user.displayName}</h3>
            <p className="text-xs text-slate-500 capitalize">{user.role || 'member'}</p>
          </div>
        </div>
        <Badge variant={user.status === 'High' ? 'rose' : user.status === 'Medium' ? 'amber' : 'emerald'}>{user.status} load</Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Active</span>
          <span>{user.load}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${user.status === 'High' ? 'bg-rose-500' : user.status === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(user.load * 16, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="border border-slate-200 rounded-lg py-2">
          <p className="text-sm font-semibold text-slate-900">{user.done}</p>
          <p className="text-[11px] text-slate-500">Done</p>
        </div>
        <div className="border border-slate-200 rounded-lg py-2">
          <p className="text-sm font-semibold text-slate-900">{user.highCount}</p>
          <p className="text-[11px] text-slate-500">High Priority</p>
        </div>
      </div>
    </article>
  );
};

export default WorkloadUserCard;
