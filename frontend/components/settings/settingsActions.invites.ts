import { dialogService } from '../../services/dialogService';
import { userService } from '../../services/userService';
import { SettingsActionsContext } from './settingsModalActions.types';

export const buildInviteActions = (ctx: SettingsActionsContext) => {
  const handleCreateInvite = async () => {
    if (!ctx.user) return;
    const cleanInviteEmail = ctx.newInviteIdentifier.trim().toLowerCase();
    if (!cleanInviteEmail) {
      await dialogService.notice('Enter the user work email before creating an invite.', { title: 'Invite required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanInviteEmail)) {
      await dialogService.notice('Enter a valid work email address.', { title: 'Invalid email' });
      return;
    }
    const result = await userService.createInviteRemote(ctx.user.orgId, {
      role: ctx.newInviteRole,
      invitedIdentifier: cleanInviteEmail,
      ttlDays: 14,
      maxUses: 1
    });
    if (!result.success || !result.invite) {
      await dialogService.notice(result.error || 'Could not create invite.', { title: 'Invite error' });
      return;
    }
    ctx.setInvites(await userService.fetchInvitesFromBackend(ctx.user.orgId));
    ctx.setNewInviteIdentifier('');
    const inviteLink = `${window.location.origin}/?invite=${encodeURIComponent(result.invite.token)}`;
    const deliveryStatus = (result.invite.deliveryStatus || 'pending').toLowerCase();
    try {
      await navigator.clipboard.writeText(inviteLink);
      await dialogService.notice(
        deliveryStatus === 'sent'
          ? `Invite email sent and link copied:\n${inviteLink}`
          : `Invite created, but email delivery is ${deliveryStatus.replace('_', ' ')}.\nLink copied:\n${inviteLink}`,
        { title: 'Invite created' }
      );
    } catch {
      await dialogService.notice(`Invite link:\n${inviteLink}`, { title: 'Invite created' });
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!ctx.user) return;
    const result = await userService.revokeInviteRemote(ctx.user.orgId, inviteId);
    if (!result.success) return;
    ctx.setInvites(await userService.fetchInvitesFromBackend(ctx.user.orgId));
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!ctx.user) return;
    const result = await userService.resendInviteRemote(ctx.user.orgId, inviteId);
    if (!result.success) {
      await dialogService.notice(result.error || 'Could not resend invite.', { title: 'Invite resend failed' });
      return;
    }
    ctx.setInvites(await userService.fetchInvitesFromBackend(ctx.user.orgId));
  };

  return { handleCreateInvite, handleRevokeInvite, handleResendInvite };
};
