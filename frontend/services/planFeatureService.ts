import { MainViewType } from '../types';

export type WorkspacePlan = 'free' | 'basic' | 'pro';

export interface PlanFeatures {
  analytics: boolean;
  resources: boolean;
  integrations: boolean;
  workflows: boolean;
  aiTools: boolean;
  savedViews: boolean;
}

const PLAN_FEATURES: Record<WorkspacePlan, PlanFeatures> = {
  free: {
    analytics: false,
    resources: false,
    integrations: false,
    workflows: false,
    aiTools: false,
    savedViews: false
  },
  basic: {
    analytics: true,
    resources: true,
    integrations: true,
    workflows: false,
    aiTools: false,
    savedViews: true
  },
  pro: {
    analytics: true,
    resources: true,
    integrations: true,
    workflows: true,
    aiTools: true,
    savedViews: true
  }
};

export const normalizeWorkspacePlan = (plan?: string | null): WorkspacePlan => {
  if (plan === 'free' || plan === 'basic' || plan === 'pro') return plan;
  return 'basic';
};

export const getPlanFeatures = (plan?: string | null): PlanFeatures => PLAN_FEATURES[normalizeWorkspacePlan(plan)];

export const canAccessViewForPlan = (view: MainViewType, plan?: string | null): boolean => {
  const features = getPlanFeatures(plan);
  if (view === 'analytics') return features.analytics;
  if (view === 'resources') return features.resources;
  if (view === 'integrations') return features.integrations;
  if (view === 'workflows') return features.workflows;
  return true;
};

export const isFreePlan = (plan?: string | null): boolean => normalizeWorkspacePlan(plan) === 'free';
