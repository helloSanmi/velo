import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ProfilePasswordModalProps {
  open: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  passwordError: string;
  isChangingPassword: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleCurrentPassword: () => void;
  onToggleNewPassword: () => void;
  onToggleConfirmPassword: () => void;
}

const PasswordField = ({
  label, value, shown, onChange, onToggle
}: { label: string; value: string; shown: boolean; onChange: (value: string) => void; onToggle: () => void }) => (
  <div>
    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
    <div className="relative">
      <input type={shown ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-slate-300 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-slate-300" autoComplete="new-password" />
      <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700" aria-label={shown ? 'Hide password' : 'Show password'}>
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

const ProfilePasswordModal: React.FC<ProfilePasswordModalProps> = (props) => {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-[280] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={(event) => event.target === event.currentTarget && props.onClose()}>
      <div className="custom-scrollbar max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl md:rounded-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-900">Reset password</h4>
            <p className="mt-0.5 text-xs text-slate-500">Enter your current password, then your new password twice.</p>
          </div>
          <button type="button" onClick={props.onClose} className="h-8 w-8 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Close password modal">×</button>
        </div>
        <form onSubmit={props.onSubmit} className="mt-3 space-y-3">
          <PasswordField label="Current password" value={props.currentPassword} shown={props.showCurrentPassword} onChange={props.onCurrentPasswordChange} onToggle={props.onToggleCurrentPassword} />
          <PasswordField label="New password" value={props.newPassword} shown={props.showNewPassword} onChange={props.onNewPasswordChange} onToggle={props.onToggleNewPassword} />
          <PasswordField label="Confirm new password" value={props.confirmPassword} shown={props.showConfirmPassword} onChange={props.onConfirmPasswordChange} onToggle={props.onToggleConfirmPassword} />
          {props.passwordError ? <p className="text-xs text-rose-600">{props.passwordError}</p> : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={props.onClose} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={props.isChangingPassword} className="h-9 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60">
              {props.isChangingPassword ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePasswordModal;
