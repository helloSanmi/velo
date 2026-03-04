import { settingsService, UserSettings } from '../../services/settingsService';
import { userService } from '../../services/userService';
import { buildInviteActions } from './settingsActions.invites';
import { buildOrganizationActions } from './settingsActions.organization';
import { buildProfileActions } from './settingsActions.profile';
import { buildWorkspaceUserActions } from './settingsActions.workspaceUsers';
import { SettingsActionsContext, UseSettingsModalActionsArgs } from './settingsModalActions.types';

export const useSettingsModalActions = (args: UseSettingsModalActionsArgs) => {
  const refreshWorkspaceUsers = async () => {
    if (!args.user) return;
    await userService.hydrateWorkspaceFromBackend(args.user.orgId);
    args.setAllUsers(userService.getUsers(args.user.orgId));
    args.setOrg(userService.getOrganization(args.user.orgId));
    args.setInvites(await userService.fetchInvitesFromBackend(args.user.orgId));
  };

  const context: SettingsActionsContext = { ...args, refreshWorkspaceUsers };

  const handleToggle = (settings: UserSettings, key: keyof UserSettings) => {
    const updated = settingsService.updateSettings({ [key]: !settings[key] });
    args.setSettings(updated);
  };

  const handleThemeChange = (theme: UserSettings['theme']) => {
    const updated = settingsService.updateSettings({ theme });
    args.setSettings(updated);
  };

  const handleUpdateSettings = (updates: Partial<UserSettings>) => {
    const updated = settingsService.updateSettings(updates);
    args.setSettings(updated);
  };

  return {
    refreshWorkspaceUsers,
    handleToggle,
    handleThemeChange,
    handleUpdateSettings,
    ...buildWorkspaceUserActions(context),
    ...buildInviteActions(context),
    ...buildProfileActions(context),
    ...buildOrganizationActions(context)
  };
};
