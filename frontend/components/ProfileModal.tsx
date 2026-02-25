import React, { useEffect, useState } from 'react';
import { User as UserIcon, X } from 'lucide-react';
import { Organization, Team, User as UserType } from '../types';
import { userService } from '../services/userService';
import { teamService } from '../services/teamService';
import { toastService } from '../services/toastService';
import ProfileSettingsPanel from './settings/core/ProfileSettingsPanel';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserType;
  onUserUpdated?: (user: UserType) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated
}) => {
  const [profileUser, setProfileUser] = useState<UserType | null>(user || null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (!isOpen || !user) return;
    setProfileUser(user);
    userService.hydrateWorkspaceFromBackend(user.orgId).then((result) => {
      if (result) {
        const current = result.users.find((candidate) => candidate.id === user.id) || user;
        setProfileUser(current);
      }
      setOrg(userService.getOrganization(user.orgId));
    });
    teamService.fetchTeamsFromBackend(user.orgId).then(setTeams);
  }, [isOpen, user]);

  if (!isOpen || !user || !profileUser) return null;

  const handleAvatarUpdate = async (avatar: string) => {
    const fallbackAvatar = (profileUser.avatar || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`).trim();
    const nextAvatar = avatar.trim() || fallbackAvatar;
    const updatedAll = await userService.updateUserRemote(user.orgId, user.id, { avatar: nextAvatar });
    if (!updatedAll) return;
    const updatedCurrent = updatedAll.find((candidate) => candidate.id === user.id) || null;
    if (updatedCurrent) {
      setProfileUser(updatedCurrent);
      onUserUpdated?.(updatedCurrent);
    }
    toastService.success('Profile updated', 'Your avatar has been updated.');
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    return userService.changePassword(currentPassword, newPassword, confirmPassword);
  };

  const handleUpdateProfileName = async (
    firstName: string,
    lastName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (!cleanFirst || !cleanLast) return { success: false, error: 'First and last name are required.' };
    const displayName = `${cleanFirst} ${cleanLast}`.trim();
    const updatedAll = await userService.updateUserRemote(user.orgId, user.id, {
      firstName: cleanFirst,
      lastName: cleanLast,
      displayName
    });
    if (!updatedAll) return { success: false, error: 'Could not update your profile.' };
    const updatedCurrent = updatedAll.find((candidate) => candidate.id === user.id) || null;
    if (updatedCurrent) {
      setProfileUser(updatedCurrent);
      onUserUpdated?.(updatedCurrent);
    }
    return { success: true };
  };

  return (
    <div onClick={(event) => event.target === event.currentTarget && onClose()} className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-none md:rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-200 h-[100dvh] md:h-[80vh] flex flex-col border-0 md:border border-slate-200">
        <button
          onClick={onClose}
          aria-label="Close profile"
          className="absolute right-3 top-3 md:right-4 md:top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-200 bg-white shrink-0">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3 md:gap-4 tracking-tighter">
            <div className="p-2.5 bg-slate-900 rounded-2xl shadow-lg shadow-slate-200"><UserIcon className="w-6 h-6 text-white" /></div> Profile
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar scroll-smooth">
          <ProfileSettingsPanel
            user={profileUser}
            org={org}
            teams={teams}
            onAvatarUpdate={handleAvatarUpdate}
            onChangePassword={handleChangePassword}
            onUpdateProfileName={handleUpdateProfileName}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
