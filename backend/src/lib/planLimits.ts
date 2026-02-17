export type WorkspacePlan = 'free' | 'basic' | 'pro';

export const normalizeWorkspacePlan = (plan?: string | null): WorkspacePlan => {
  if (plan === 'free' || plan === 'basic' || plan === 'pro') return plan;
  return 'basic';
};

export const FREE_PLAN_MAX_SEATS = 3;

export const resolveInitialSeatCapacity = (plan?: string | null, requestedSeats?: number): number => {
  const normalized = normalizeWorkspacePlan(plan);
  if (normalized === 'free') {
    if (!Number.isFinite(requestedSeats as number)) return FREE_PLAN_MAX_SEATS;
    return Math.max(1, Math.min(FREE_PLAN_MAX_SEATS, Math.round(requestedSeats as number)));
  }
  // For paid plans, seats are feature-based and effectively unrestricted.
  return 100000;
};

export const isSeatLimitedPlan = (plan?: string | null): boolean => normalizeWorkspacePlan(plan) === 'free';
