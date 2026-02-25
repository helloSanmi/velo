import React, { useEffect, useMemo, useState } from 'react';
import { Organization, Team, User as UserType } from '../../../types';
import { toastService } from '../../../services/toastService';
import ProfileHeaderCard from './profile/ProfileHeaderCard';
import ProfileIdentityCard from './profile/ProfileIdentityCard';
import ProfilePasswordModal from './profile/ProfilePasswordModal';

interface ProfileSettingsPanelProps {
  user: UserType;
  org: Organization | null;
  teams: Team[];
  onAvatarUpdate: (avatar: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateProfileName: (firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
}

const ProfileSettingsPanel: React.FC<ProfileSettingsPanelProps> = ({ user, org, teams, onAvatarUpdate, onChangePassword, onUpdateProfileName }) => {
  const [avatarDraft, setAvatarDraft] = useState(user.avatar || '');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [firstNameDraft, setFirstNameDraft] = useState('');
  const [lastNameDraft, setLastNameDraft] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const parts = (user.displayName || user.username || '').trim().split(/\s+/).filter(Boolean);
  const firstNameValue = user.firstName || parts[0] || '';
  const lastNameValue = user.lastName || parts.slice(1).join(' ') || '';
  const teamText = useMemo(() => {
    const teamNames = teams.filter((team) => team.memberIds.includes(user.id)).map((team) => team.name);
    return teamNames.length ? teamNames.join(', ') : 'Not assigned';
  }, [teams, user.id]);

  useEffect(() => { setAvatarDraft(user.avatar || ''); setIsEditingAvatar(false); }, [user.avatar]);
  useEffect(() => { setFirstNameDraft(firstNameValue); setLastNameDraft(lastNameValue); setIsEditingName(false); setNameError(''); }, [firstNameValue, lastNameValue, user.id]);

  const closePasswordModal = () => {
    if (isChangingPassword) return;
    setIsPasswordModalOpen(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setShowCurrentPassword(false); setShowNewPassword(false); setShowConfirmPassword(false); setPasswordError('');
  };

  const submitPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) return setPasswordError('Fill in all password fields.');
    if (newPassword.length < 6) return setPasswordError('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setPasswordError('New password and confirmation do not match.');
    setIsChangingPassword(true);
    try {
      const result = await onChangePassword(currentPassword, newPassword, confirmPassword);
      if (!result.success) return setPasswordError(result.error || 'Could not update password.');
      closePasswordModal();
      toastService.success('Password updated', 'Your password was changed successfully.');
    } finally { setIsChangingPassword(false); }
  };

  const submitNameUpdate = async () => {
    const nextFirst = firstNameDraft.trim();
    const nextLast = lastNameDraft.trim();
    setNameError('');
    if (!nextFirst || !nextLast) return setNameError('First and last name are required.');
    setIsSavingName(true);
    try {
      const result = await onUpdateProfileName(nextFirst, nextLast);
      if (!result.success) return setNameError(result.error || 'Could not update your name.');
      setIsEditingName(false);
      toastService.success('Profile updated', 'Your name has been updated.');
    } finally { setIsSavingName(false); }
  };

  return (
    <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 space-y-4">
      <ProfileHeaderCard
        user={user}
        orgName={org?.name}
        avatarDraft={avatarDraft}
        isEditingAvatar={isEditingAvatar}
        savingAvatar={savingAvatar}
        onToggleEditAvatar={() => setIsEditingAvatar((prev) => !prev)}
        onAvatarDraftChange={setAvatarDraft}
        onCancelAvatarEdit={() => { setAvatarDraft(user.avatar || ''); setIsEditingAvatar(false); }}
        onSaveAvatar={async () => { setSavingAvatar(true); try { await onAvatarUpdate(avatarDraft.trim()); setIsEditingAvatar(false); } finally { setSavingAvatar(false); } }}
        onOpenPasswordModal={() => { setPasswordError(''); setIsPasswordModalOpen(true); }}
      />
      <ProfileIdentityCard
        firstName={firstNameValue || 'N/A'}
        lastName={lastNameValue || 'N/A'}
        firstNameDraft={firstNameDraft}
        lastNameDraft={lastNameDraft}
        isEditingName={isEditingName}
        isSavingName={isSavingName}
        nameError={nameError}
        email={user.email || `${user.username.toLowerCase()}@velo.app`}
        company={org?.name || 'N/A'}
        teamText={teamText}
        onFirstNameDraftChange={setFirstNameDraft}
        onLastNameDraftChange={setLastNameDraft}
        onStartEditName={() => setIsEditingName(true)}
        onCancelEditName={() => { setFirstNameDraft(firstNameValue); setLastNameDraft(lastNameValue); setNameError(''); setIsEditingName(false); }}
        onSaveName={submitNameUpdate}
      />
      <ProfilePasswordModal
        open={isPasswordModalOpen}
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        showCurrentPassword={showCurrentPassword}
        showNewPassword={showNewPassword}
        showConfirmPassword={showConfirmPassword}
        passwordError={passwordError}
        isChangingPassword={isChangingPassword}
        onClose={closePasswordModal}
        onSubmit={submitPasswordChange}
        onCurrentPasswordChange={setCurrentPassword}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onToggleCurrentPassword={() => setShowCurrentPassword((prev) => !prev)}
        onToggleNewPassword={() => setShowNewPassword((prev) => !prev)}
        onToggleConfirmPassword={() => setShowConfirmPassword((prev) => !prev)}
      />
    </div>
  );
};

export default ProfileSettingsPanel;
