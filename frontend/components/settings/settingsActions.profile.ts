import { dialogService } from '../../services/dialogService';
import { userService } from '../../services/userService';
import { SettingsActionsContext } from './settingsModalActions.types';

export const buildProfileActions = (ctx: SettingsActionsContext) => {
  const handleAvatarUpdate = async (avatar: string) => {
    if (!ctx.user) return;
    const fallbackAvatar = (ctx.profileUser?.avatar || ctx.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ctx.user.username}`).trim();
    const nextAvatar = avatar.trim() || fallbackAvatar;
    const updatedAll = await userService.updateUserRemote(ctx.user.orgId, ctx.user.id, { avatar: nextAvatar });
    if (!updatedAll) return;
    const updatedCurrent = updatedAll.find((candidate) => candidate.id === ctx.user?.id) || null;
    ctx.setAllUsers(updatedAll.filter((candidate) => candidate.orgId === ctx.user?.orgId));
    if (updatedCurrent) {
      ctx.setProfileUser(updatedCurrent);
      ctx.onUserUpdated?.(updatedCurrent);
    }
    await dialogService.notice('Avatar updated.', { title: 'Profile' });
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) =>
    userService.changePassword(currentPassword, newPassword, confirmPassword);

  const handleUpdateProfileName = async (firstName: string, lastName: string) => {
    if (!ctx.user) return { success: false, error: 'Session unavailable.' };
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (!cleanFirst || !cleanLast) return { success: false, error: 'First and last name are required.' };
    const displayName = `${cleanFirst} ${cleanLast}`.trim();
    const updatedAll = await userService.updateUserRemote(ctx.user.orgId, ctx.user.id, { firstName: cleanFirst, lastName: cleanLast, displayName });
    if (!updatedAll) return { success: false, error: 'Could not update your profile.' };
    const updatedCurrent = updatedAll.find((candidate) => candidate.id === ctx.user?.id) || null;
    ctx.setAllUsers(updatedAll.filter((candidate) => candidate.orgId === ctx.user?.orgId));
    if (updatedCurrent) {
      ctx.setProfileUser(updatedCurrent);
      ctx.onUserUpdated?.(updatedCurrent);
    }
    return { success: true };
  };

  return { handleAvatarUpdate, handleChangePassword, handleUpdateProfileName };
};
