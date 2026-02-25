import React from 'react';
import { Shield } from 'lucide-react';

interface SecurityHeaderCardProps {
  workspaceName?: string | null;
  requireTwoFactorAuth: boolean;
  onToggleTwoFactor: () => void;
}

const toggleClass = (active: boolean) => `w-11 h-6 rounded-full p-1 transition-colors ${active ? 'bg-slate-900' : 'bg-slate-300'}`;
const thumbClass = (active: boolean) => `block w-4 h-4 rounded-full bg-white transition-transform ${active ? 'translate-x-5' : ''}`;

const SecurityHeaderCard: React.FC<SecurityHeaderCardProps> = ({ workspaceName, requireTwoFactorAuth, onToggleTwoFactor }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-slate-700" />
        <p className="text-sm font-semibold text-slate-900">Security</p>
      </div>
      <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
        Admin
      </span>
    </div>
    <p className="mt-0.5 text-[11px] text-slate-500">Workspace: {workspaceName || 'Unknown'}</p>
    <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-900">Enforce 2FA for all users</p>
        <p className="text-[11px] text-slate-500">Require 2FA on every account.</p>
      </div>
      <button type="button" onClick={onToggleTwoFactor} className={toggleClass(requireTwoFactorAuth)}>
        <span className={thumbClass(requireTwoFactorAuth)} />
      </button>
    </div>
  </div>
);

export default SecurityHeaderCard;
