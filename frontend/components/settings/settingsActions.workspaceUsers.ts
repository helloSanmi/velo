import { FormEvent } from 'react';
import { dialogService } from '../../services/dialogService';
import { apiRequest } from '../../services/apiClient';
import { userService } from '../../services/userService';
import { User as UserType } from '../../types';
import { SettingsActionsContext } from './settingsModalActions.types';

export const buildWorkspaceUserActions = (ctx: SettingsActionsContext) => {
  const handleProvision = async (e: FormEvent) => {
    e.preventDefault();
    if (!ctx.user) return;
    ctx.setProvisionError('');
    if (!ctx.newUserName.trim() || !ctx.newUserEmail.trim()) {
      ctx.setProvisionError('Username and email are required.');
      return;
    }
    if ((ctx.newUserTempPassword || '').trim().length < 6) {
      ctx.setProvisionError('Temporary password must be at least 6 characters.');
      return;
    }
    const result = await userService.provisionUserRemote(
      ctx.user.orgId,
      ctx.newUserName,
      ctx.newUserRole,
      { firstName: ctx.newUserFirstName, lastName: ctx.newUserLastName, email: ctx.newUserEmail },
      ctx.newUserTempPassword,
      true
    );
    if (result.success) {
      await ctx.refreshWorkspaceUsers();
      ctx.setNewUserName('');
      ctx.setNewUserFirstName('');
      ctx.setNewUserLastName('');
      ctx.setNewUserEmail('');
      ctx.setNewUserRole('member');
      ctx.setNewUserTempPassword('TempPassword123');
      ctx.setIsProvisioning(false);
      return;
    }
    ctx.setProvisionError(result.error || 'Could not add seat.');
  };

  const handleUpdateUserRole = async (userId: string, role: 'admin' | 'member') => {
    if (!ctx.user) return;
    try {
      await apiRequest(`/orgs/${ctx.user.orgId}/users/role`, { method: 'PATCH', body: { userId, role } });
      await ctx.refreshWorkspaceUsers();
    } catch {
      const updatedAll = userService.updateUser(userId, { role });
      ctx.setAllUsers(updatedAll.filter((u) => u.orgId === ctx.user?.orgId));
    }
  };

  const handleStartEdit = (targetUser: UserType) => {
    const parts = (targetUser.displayName || '').trim().split(/\s+/).filter(Boolean);
    ctx.setEditingUserId(targetUser.id);
    ctx.setEditFirstNameValue(targetUser.firstName || parts[0] || '');
    ctx.setEditLastNameValue(targetUser.lastName || parts.slice(1).join(' '));
    ctx.setEditEmailValue(targetUser.email || '');
  };

  const handleCommitEdit = async () => {
    if (!ctx.editingUserId || !ctx.user) return;
    const firstName = ctx.editFirstNameValue.trim();
    const lastName = ctx.editLastNameValue.trim();
    const email = ctx.editEmailValue.trim().toLowerCase();
    if (!firstName || !lastName || !email) return;
    const displayName = `${firstName} ${lastName}`.trim();
    const updatedAll = await userService.updateUserRemote(ctx.user.orgId, ctx.editingUserId, { firstName, lastName, email, displayName });
    if (updatedAll) ctx.setAllUsers(updatedAll.filter((u) => u.orgId === ctx.user?.orgId));
    ctx.setEditingUserId(null);
  };

  const handlePurgeUser = async (userId: string) => {
    if (!ctx.user || userId === ctx.user.id) return;
    const confirmed = await dialogService.confirm('Remove this user permanently? This cannot be undone.', {
      title: 'Remove user',
      confirmText: 'Remove',
      danger: true
    });
    if (!confirmed) return;
    const allAfterDelete = await userService.deleteUserRemote(ctx.user.orgId, userId);
    if (allAfterDelete) ctx.setAllUsers(allAfterDelete.filter((u) => u.orgId === ctx.user?.orgId));
    await ctx.refreshWorkspaceUsers();
  };

  const handleBuyMoreSeats = async () => {
    if (!ctx.org) return;
    const updatedOrg = await userService.addSeatsRemote(ctx.org.id, ctx.seatPurchaseCount);
    if (updatedOrg) {
      userService.updateOrganization(ctx.org.id, updatedOrg);
      ctx.setOrg(updatedOrg);
    }
  };

  return {
    handleProvision,
    handleUpdateUserRole,
    handleStartEdit,
    handleCommitEdit,
    handlePurgeUser,
    handleBuyMoreSeats
  };
};
