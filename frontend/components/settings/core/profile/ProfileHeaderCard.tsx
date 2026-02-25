import React from 'react';
import { Pencil } from 'lucide-react';
import { User as UserType } from '../../../../types';
import { getUserFullName } from '../../../../utils/userDisplay';

interface ProfileHeaderCardProps {
  user: UserType;
  orgName?: string | null;
  avatarDraft: string;
  isEditingAvatar: boolean;
  savingAvatar: boolean;
  onToggleEditAvatar: () => void;
  onAvatarDraftChange: (value: string) => void;
  onCancelAvatarEdit: () => void;
  onSaveAvatar: () => Promise<void>;
  onOpenPasswordModal: () => void;
}

const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = (props) => (
  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5 sm:flex-row sm:items-center sm:justify-between md:gap-4">
    <div className="flex min-w-0 items-center gap-3 md:gap-4">
      <div className="group relative">
        <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
          <img
            src={props.user.avatar}
            className="h-full w-full object-cover"
            alt="Profile"
            title={getUserFullName(props.user)}
            onError={(event) => {
              const target = event.currentTarget;
              target.onerror = null;
              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${props.user.username || 'user'}`;
            }}
          />
        </div>
        <button type="button" onClick={props.onToggleEditAvatar} className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" title="Edit avatar">
          <Pencil className="h-3 w-3" />
        </button>
        {props.isEditingAvatar ? (
          <div className="absolute left-0 top-[72px] z-20 w-[min(88vw,16rem)] rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <input type="url" value={props.avatarDraft} onChange={(event) => props.onAvatarDraftChange(event.target.value)} placeholder="Paste avatar image URL" className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs outline-none" />
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <button type="button" onClick={props.onCancelAvatarEdit} className="h-7 rounded-md border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={props.savingAvatar} onClick={props.onSaveAvatar} className="h-7 rounded-md border border-slate-800 bg-slate-800 px-2.5 text-[11px] font-medium text-white hover:bg-slate-900 disabled:opacity-50">{props.savingAvatar ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-slate-900">{props.user.displayName || 'User Account'}</h3>
        <p className="mt-0.5 truncate text-xs text-slate-500">{props.orgName} • {props.user.role === 'admin' ? 'Admin' : 'Member'}</p>
      </div>
    </div>
    <button type="button" onClick={props.onOpenPasswordModal} className="h-8 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">Reset password</button>
  </div>
);

export default ProfileHeaderCard;
