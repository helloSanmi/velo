type BackendPlanFeature = 'integrations' | 'workflows' | 'aiTools';
type BackendPermissionRule = 'admin_only' | 'project_owner_or_admin';

const PLAN_FEATURE_META: Record<BackendPlanFeature, { label: string; requiredPlanLabel: string }> = {
  integrations: {
    label: 'integrations',
    requiredPlanLabel: 'Basic or Pro'
  },
  workflows: {
    label: 'workflow automation',
    requiredPlanLabel: 'Pro'
  },
  aiTools: {
    label: 'AI tools',
    requiredPlanLabel: 'Pro'
  }
};

const PERMISSION_SUBJECT: Record<BackendPermissionRule, string> = {
  admin_only: 'Only admins can',
  project_owner_or_admin: 'Only project owners or admins can'
};

export const getBackendPlanUpgradeMessage = (feature: BackendPlanFeature): string => {
  const meta = PLAN_FEATURE_META[feature];
  return `Upgrade to ${meta.requiredPlanLabel} to unlock ${meta.label}.`;
};

export const getBackendPermissionMessage = (rule: BackendPermissionRule, action: string): string =>
  `${PERMISSION_SUBJECT[rule]} ${action}.`;
