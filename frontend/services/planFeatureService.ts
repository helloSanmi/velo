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

export interface PlanDefinition {
  id: WorkspacePlan;
  name: 'Free' | 'Basic' | 'Pro';
  price: number;
  unit: 'per user / month';
  summary: string;
  seatLabel: string;
  featureList: string[];
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

const buildPlanFeatureList = (plan: WorkspacePlan): string[] => {
  const features = getPlanFeatures(plan);
  const base = ['Boards and projects', 'Projects and lifecycle states', 'Roadmap view', 'Task comments and collaboration'];

  if (features.analytics) base.push('Analytics');
  if (features.resources) base.push('Resource planning');
  if (features.integrations) base.push('Integrations');
  if (features.workflows) base.push('Workflow automation');
  if (features.savedViews) base.push('Saved views');
  if (features.aiTools) base.push('AI tools');

  return base;
};

export const PLAN_DEFINITIONS: Record<WorkspacePlan, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    unit: 'per user / month',
    summary: 'For small teams getting started.',
    seatLabel: 'Up to 3 licensed users',
    featureList: buildPlanFeatureList('free')
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 5,
    unit: 'per user / month',
    summary: 'For teams that need reporting and integrations.',
    seatLabel: 'Choose licensed users at signup',
    featureList: buildPlanFeatureList('basic')
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 7,
    unit: 'per user / month',
    summary: 'For teams that also need AI tools.',
    seatLabel: 'Choose licensed users at signup',
    featureList: buildPlanFeatureList('pro')
  }
};

export const canAccessViewForPlan = (view: MainViewType, plan?: string | null): boolean => {
  const features = getPlanFeatures(plan);
  if (view === 'analytics') return features.analytics;
  if (view === 'resources') return features.resources;
  if (view === 'integrations') return features.integrations;
  if (view === 'workflows') return features.workflows;
  return true;
};

export const isFreePlan = (plan?: string | null): boolean => normalizeWorkspacePlan(plan) === 'free';
