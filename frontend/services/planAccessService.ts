import { PlanFeatures } from './planFeatureService';
import { toastService } from './toastService';

export type PlanFeatureKey = keyof Pick<
  PlanFeatures,
  'analytics' | 'resources' | 'integrations' | 'workflows' | 'savedViews'
>;

interface PlanFeatureMeta {
  label: string;
  requiredPlanLabel: string;
}

const PLAN_FEATURE_META: Record<PlanFeatureKey, PlanFeatureMeta> = {
  analytics: {
    label: 'analytics',
    requiredPlanLabel: 'Basic or Pro'
  },
  resources: {
    label: 'resource planning',
    requiredPlanLabel: 'Basic or Pro'
  },
  integrations: {
    label: 'integrations',
    requiredPlanLabel: 'Basic or Pro'
  },
  workflows: {
    label: 'workflow automation',
    requiredPlanLabel: 'Pro'
  },
  savedViews: {
    label: 'saved views',
    requiredPlanLabel: 'Basic or Pro'
  }
};

export const getPlanBadgeLabel = (feature: PlanFeatureKey): string =>
  PLAN_FEATURE_META[feature].requiredPlanLabel === 'Pro' ? 'Pro' : 'Basic';

export const getPlanUpgradeMessage = (feature: PlanFeatureKey): string => {
  const meta = PLAN_FEATURE_META[feature];
  return `Upgrade to ${meta.requiredPlanLabel} to unlock ${meta.label}.`;
};

export const getPlanUnavailableTitle = (feature: PlanFeatureKey): string => {
  const meta = PLAN_FEATURE_META[feature];
  const capitalized = meta.label.charAt(0).toUpperCase() + meta.label.slice(1);
  return `${capitalized} unavailable`;
};

export const ensurePlanAccess = (feature: PlanFeatureKey, enabled: boolean): boolean => {
  if (enabled) return true;
  toastService.info('Upgrade required', getPlanUpgradeMessage(feature));
  return false;
};
