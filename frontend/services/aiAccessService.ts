import { toastService } from './toastService';

export type AIAccessState = 'enabled' | 'plan_locked' | 'settings_locked' | 'permission_locked';

interface ResolveAiAccessOptions {
  aiPlanEnabled: boolean;
  aiEnabled: boolean;
  hasPermission?: boolean;
}

interface EnsureAiAccessOptions extends ResolveAiAccessOptions {
  featureLabel: string;
  permissionMessage?: string;
}

export const resolveAiAccessState = ({
  aiPlanEnabled,
  aiEnabled,
  hasPermission = true
}: ResolveAiAccessOptions): AIAccessState => {
  if (!aiPlanEnabled) return 'plan_locked';
  if (!aiEnabled) return 'settings_locked';
  if (!hasPermission) return 'permission_locked';
  return 'enabled';
};

export const getAiAccessTitle = ({
  aiPlanEnabled,
  aiEnabled,
  hasPermission = true,
  featureLabel,
  permissionMessage
}: EnsureAiAccessOptions): string => {
  const state = resolveAiAccessState({ aiPlanEnabled, aiEnabled, hasPermission });
  if (state === 'plan_locked') return `Upgrade to Pro to unlock ${featureLabel}`;
  if (state === 'settings_locked') return `Enable AI in Settings to use ${featureLabel}`;
  if (state === 'permission_locked') return permissionMessage || `You do not have permission to use ${featureLabel}`;
  return featureLabel;
};

export const ensureAiAccess = ({
  aiPlanEnabled,
  aiEnabled,
  hasPermission = true,
  featureLabel,
  permissionMessage
}: EnsureAiAccessOptions): boolean => {
  const state = resolveAiAccessState({ aiPlanEnabled, aiEnabled, hasPermission });
  if (state === 'enabled') return true;

  if (state === 'plan_locked') {
    toastService.info('Upgrade required', `Upgrade to Pro to unlock ${featureLabel}.`);
    return false;
  }

  if (state === 'settings_locked') {
    toastService.info('AI disabled', `Enable AI in Settings to use ${featureLabel}.`);
    return false;
  }

  toastService.warning('Permission denied', permissionMessage || `You do not have permission to use ${featureLabel}.`);
  return false;
};
