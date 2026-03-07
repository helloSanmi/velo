import { prisma } from './prisma.js';
import { HttpError } from './httpError.js';
import { normalizeWorkspacePlan, type WorkspacePlan } from './planLimits.js';
import { getBackendPlanUpgradeMessage } from './accessMessages.js';

type BackendPlanFeatures = {
  workflows: boolean;
  integrations: boolean;
  aiTools: boolean;
};

const PLAN_FEATURES: Record<WorkspacePlan, BackendPlanFeatures> = {
  free: {
    workflows: false,
    integrations: false,
    aiTools: false
  },
  basic: {
    workflows: false,
    integrations: true,
    aiTools: false
  },
  pro: {
    workflows: true,
    integrations: true,
    aiTools: true
  }
};

export const getBackendPlanFeatures = (plan?: string | null): BackendPlanFeatures =>
  PLAN_FEATURES[normalizeWorkspacePlan(plan)];

export const getOrgPlanFeatures = async (orgId: string): Promise<BackendPlanFeatures> => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true }
  });
  if (!org) throw new HttpError(404, 'Organization not found.');
  return getBackendPlanFeatures(org.plan);
};

export const enforceOrgPlanFeature = async (
  orgId: string,
  feature: keyof BackendPlanFeatures,
  message?: string
) => {
  const features = await getOrgPlanFeatures(orgId);
  if (!features[feature]) {
    throw new HttpError(403, message || getBackendPlanUpgradeMessage(feature), { code: 'PLAN_UPGRADE_REQUIRED', feature });
  }
};
