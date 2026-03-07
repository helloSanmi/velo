export type WorkspacePlan = 'free' | 'basic' | 'pro';

export const normalizeWorkspacePlan = (plan?: string | null): WorkspacePlan => {
  if (plan === 'free' || plan === 'basic' || plan === 'pro') return plan;
  return 'basic';
};

export const FREE_PLAN_MAX_SEATS = 3;
export const PAID_PLAN_DEFAULT_SEATS = 5;
export const MAX_PLAN_SEATS = 100000;

export const resolveInitialSeatCapacity = (plan?: string | null, requestedSeats?: number): number => {
  const normalized = normalizeWorkspacePlan(plan);
  const roundedRequested = Number.isFinite(requestedSeats as number)
    ? Math.round(requestedSeats as number)
    : undefined;
  if (normalized === 'free') {
    if (!Number.isFinite(roundedRequested as number)) return FREE_PLAN_MAX_SEATS;
    return Math.max(1, Math.min(FREE_PLAN_MAX_SEATS, roundedRequested as number));
  }
  if (!Number.isFinite(roundedRequested as number)) return PAID_PLAN_DEFAULT_SEATS;
  return Math.max(1, Math.min(MAX_PLAN_SEATS, roundedRequested as number));
};

export const isSeatLimitedPlan = (plan?: string | null): boolean =>
  normalizeWorkspacePlan(plan) === 'free' ||
  normalizeWorkspacePlan(plan) === 'basic' ||
  normalizeWorkspacePlan(plan) === 'pro';
