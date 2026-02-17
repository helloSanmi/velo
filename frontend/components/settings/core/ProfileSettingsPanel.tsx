import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil } from 'lucide-react';
import { Organization, SecurityGroup, Team, User as UserType } from '../../../types';
import { toastService } from '../../../services/toastService';
import { getUserFullName } from '../../../utils/userDisplay';

interface ProfileSettingsPanelProps {
  user: UserType;
  org: Organization | null;
  teams: Team[];
  groups: SecurityGroup[];
  onAvatarUpdate: (avatar: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateProfileName: (firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
}

const ProfileSettingsPanel: React.FC<ProfileSettingsPanelProps> = ({
  user,
  org,
  teams,
  groups,
  onAvatarUpdate,
  onChangePassword,
  onUpdateProfileName
}) => {
  const [avatarDraft, setAvatarDraft] = useState(user.avatar || '');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstNameDraft, setFirstNameDraft] = useState('');
  const [lastNameDraft, setLastNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    setAvatarDraft(user.avatar || '');
    setIsEditingAvatar(false);
  }, [user.avatar]);

  const parts = (user.displayName || user.username || '').trim().split(/\s+/).filter(Boolean);
  const firstNameValue = user.firstName || parts[0] || '';
  const lastNameValue = user.lastName || parts.slice(1).join(' ') || '';
  const firstName = firstNameValue || 'N/A';
  const lastName = lastNameValue || 'N/A';
  const teamNames = teams.filter((team) => team.memberIds.includes(user.id)).map((team) => team.name);
  const groupNames = groups.filter((group) => group.memberIds.includes(user.id)).map((group) => group.name);

  useEffect(() => {
    setFirstNameDraft(firstNameValue);
    setLastNameDraft(lastNameValue);
    setIsEditingName(false);
    setNameError('');
  }, [firstNameValue, lastNameValue, user.id]);

  const submitPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError('Fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await onChangePassword(currentPassword, newPassword, confirmPassword);
      if (!result.success) {
        setPasswordError(result.error || 'Could not update password.');
        return;
      }
      closePasswordModal();
      toastService.success('Password updated', 'Your password was changed successfully.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    if (isChangingPassword) return;
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError('');
  };

  const submitNameUpdate = async () => {
    setNameError('');
    const nextFirst = firstNameDraft.trim();
    const nextLast = lastNameDraft.trim();
    if (!nextFirst || !nextLast) {
      setNameError('First and last name are required.');
      return;
    }
    setIsSavingName(true);
    try {
      const result = await onUpdateProfileName(nextFirst, nextLast);
      if (!result.success) {
        setNameError(result.error || 'Could not update your name.');
        return;
      }
      setIsEditingName(false);
      toastService.success('Profile updated', 'Your name has been updated.');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="relative group">
            <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-200">
              <img
                src={user?.avatar}
                className="w-full h-full object-cover"
                alt="Profile"
                title={getUserFullName(user)}
                onError={(event) => {
                  const target = event.currentTarget;
                  target.onerror = null;
                  target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'user'}`;
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsEditingAvatar((prev) => !prev)}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-md border border-slate-700 bg-slate-900 text-white flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              title="Edit avatar"
            >
              <Pencil className="w-3 h-3" />
            </button>
            {isEditingAvatar ? (
              <div className="absolute left-0 top-[72px] z-20 w-[min(88vw,16rem)] rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <input
                  type="url"
                  value={avatarDraft}
                  onChange={(event) => setAvatarDraft(event.target.value)}
                  placeholder="Paste avatar image URL"
                  className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs outline-none"
                />
                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarDraft(user.avatar || '');
                      setIsEditingAvatar(false);
                    }}
                    className="h-7 rounded-md border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingAvatar}
                    onClick={async () => {
                      setSavingAvatar(true);
                      try {
                        await onAvatarUpdate(avatarDraft.trim());
                        setIsEditingAvatar(false);
                      } finally {
                        setSavingAvatar(false);
                      }
                    }}
                    className="h-7 rounded-md border border-slate-800 bg-slate-800 px-2.5 text-[11px] font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    {savingAvatar ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate">{user?.displayName || 'User Account'}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {org?.name} • {user?.role === 'admin' ? 'Admin' : 'Member'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setPasswordError('');
            setIsPasswordModalOpen(true);
          }}
          className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
        >
          Reset password
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[130px_1fr] gap-1.5 md:gap-3 px-4 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">First name</p>
          <div className="flex items-center justify-between gap-2 min-w-0">
            {isEditingName ? (
              <input
                value={firstNameDraft}
                onChange={(event) => setFirstNameDraft(event.target.value)}
                className="h-8 w-full max-w-xs rounded-md border border-slate-300 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            ) : (
              <p className="text-sm text-slate-900">{firstName}</p>
            )}
            {!isEditingName ? (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="h-7 w-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center"
                aria-label="Edit first and last name"
                title="Edit name"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[130px_1fr] gap-1.5 md:gap-3 px-4 py-2.5 border-t border-slate-100">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Last name</p>
          <div className="flex items-center justify-between gap-2 min-w-0">
            {isEditingName ? (
              <input
                value={lastNameDraft}
                onChange={(event) => setLastNameDraft(event.target.value)}
                className="h-8 w-full max-w-xs rounded-md border border-slate-300 px-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
            ) : (
              <p className="text-sm text-slate-900">{lastName}</p>
            )}
            {!isEditingName ? (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="h-7 w-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center"
                aria-label="Edit first and last name"
                title="Edit name"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        {isEditingName ? (
          <div className="px-4 py-2 border-t border-slate-100">
            {nameError ? <p className="text-xs text-rose-600 mb-2">{nameError}</p> : null}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFirstNameDraft(firstNameValue);
                  setLastNameDraft(lastNameValue);
                  setNameError('');
                  setIsEditingName(false);
                }}
                className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNameUpdate}
                disabled={isSavingName}
                className="h-8 rounded-md border border-slate-800 bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {isSavingName ? 'Saving...' : 'Save name'}
              </button>
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-[130px_1fr] gap-1.5 md:gap-3 px-4 py-2.5 border-t border-slate-100">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Email</p>
          <p className="text-sm text-slate-900">{user?.email || `${user?.username.toLowerCase()}@velo.app`}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[130px_1fr] gap-1.5 md:gap-3 px-4 py-2.5 border-t border-slate-100">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Company</p>
          <p className="text-sm text-slate-900">{org?.name || 'N/A'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[130px_1fr] gap-1.5 md:gap-3 px-4 py-2.5 border-t border-slate-100">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Group</p>
          <p className="text-sm text-slate-900">{groupNames.length ? groupNames.join(', ') : 'Not assigned'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[130px_1fr] gap-1.5 md:gap-3 px-4 py-2.5 border-t border-slate-100">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Team</p>
          <p className="text-sm text-slate-900">{teamNames.length ? teamNames.join(', ') : 'Not assigned'}</p>
        </div>
      </div>

      {isPasswordModalOpen ? (
        <div
          className="fixed inset-0 z-[280] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={(event) => event.target === event.currentTarget && closePasswordModal()}
        >
          <div className="w-full max-w-md rounded-t-2xl md:rounded-xl border border-slate-200 bg-white shadow-2xl p-4 max-h-[94dvh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900">Reset password</h4>
                <p className="text-xs text-slate-500 mt-0.5">Enter your current password, then your new password twice.</p>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                className="h-8 w-8 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close password modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitPasswordChange} className="mt-3 space-y-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Current password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">New password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Confirm new password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {passwordError ? <p className="text-xs text-rose-600">{passwordError}</p> : null}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="h-9 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {isChangingPassword ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProfileSettingsPanel;
