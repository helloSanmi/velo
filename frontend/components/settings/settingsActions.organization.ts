import { dialogService } from '../../services/dialogService';
import { apiRequest } from '../../services/apiClient';
import { userService } from '../../services/userService';
import { Organization } from '../../types';
import { AiUsageRow, SettingsActionsContext } from './settingsModalActions.types';

export const buildOrganizationActions = (ctx: SettingsActionsContext) => {
  const refreshAiUsage = async () => {
    if (!ctx.user || ctx.user.role !== 'admin') return;
    try {
      const rows = await apiRequest<AiUsageRow[]>(`/orgs/${ctx.user.orgId}/usage/ai`);
      ctx.setAiUsageRows(rows);
    } catch {
      ctx.setAiUsageRows([]);
    }
  };

  const handleUpdateOrganizationSettings = async (
    patch: Partial<Pick<Organization, 'loginSubdomain' | 'allowMicrosoftAuth' | 'microsoftWorkspaceConnected' | 'notificationSenderEmail'>>
  ) => {
    if (!ctx.user || ctx.user.role !== 'admin' || !ctx.org) return;
    const updated = await userService.updateOrganizationSettingsRemote(ctx.org.id, patch);
    if (updated) ctx.setOrg(updated);
  };

  const submitProjectRename = () => {
    if (!ctx.editingProjectId || !ctx.onRenameProject) return;
    const trimmed = ctx.editingProjectName.trim();
    if (!trimmed) return;
    ctx.onRenameProject(ctx.editingProjectId, trimmed);
    ctx.setEditingProjectId(null);
    ctx.setEditingProjectName('');
  };

  const handleDeleteOrganization = async () => {
    if (!ctx.user || !ctx.onDeleteOrganization || ctx.user.role !== 'admin') return;
    const confirmed = await dialogService.confirm('Delete this entire workspace and all related data? This action cannot be undone.', {
      title: 'Delete workspace',
      confirmText: 'Delete workspace',
      danger: true
    });
    if (!confirmed) return;
    const result = await userService.deleteOrganizationRemote(ctx.user.orgId);
    if (!result.success) {
      await dialogService.notice(result.error || 'Could not delete workspace.', { title: 'Error' });
      return;
    }
    ctx.onDeleteOrganization?.();
    ctx.onClose();
  };

  return {
    refreshAiUsage,
    handleUpdateOrganizationSettings,
    submitProjectRename,
    handleDeleteOrganization
  };
};
