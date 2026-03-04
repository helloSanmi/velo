import { TaskPriority } from '../../types';

interface ProjectMetaInput {
  startDate: string;
  endDate: string;
  budgetCost: string;
  hourlyRate: string;
  scopeSummary: string;
  scopeSize: string;
  isPublic: boolean;
}

export const normalizeTaskPriority = (priority: string): TaskPriority => {
  const normalized = priority?.toLowerCase();
  if (normalized === 'high') return TaskPriority.HIGH;
  if (normalized === 'low') return TaskPriority.LOW;
  return TaskPriority.MEDIUM;
};

export const parseProjectMeta = (input: ProjectMetaInput) => {
  const parsedStartDate = input.startDate ? new Date(input.startDate).getTime() : undefined;
  const parsedEndDate = input.endDate ? new Date(input.endDate).getTime() : undefined;
  const parsedBudgetCost = input.budgetCost.trim() ? Number(input.budgetCost) : undefined;
  const parsedHourlyRate = input.hourlyRate.trim() ? Number(input.hourlyRate) : undefined;
  const parsedScopeSize = input.scopeSize.trim() ? Number(input.scopeSize) : undefined;

  if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
    return { error: 'End date must be on or after the start date.' };
  }
  if (parsedBudgetCost !== undefined && (!Number.isFinite(parsedBudgetCost) || parsedBudgetCost < 0)) {
    return { error: 'Cost must be a positive number.' };
  }
  if (parsedHourlyRate !== undefined && (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate < 0)) {
    return { error: 'Hourly rate must be a positive number.' };
  }
  if (parsedScopeSize !== undefined && (!Number.isFinite(parsedScopeSize) || parsedScopeSize < 0)) {
    return { error: 'Scope size must be a positive number.' };
  }

  return {
    meta: {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      budgetCost: parsedBudgetCost,
      hourlyRate: parsedHourlyRate,
      scopeSummary: input.scopeSummary.trim() || undefined,
      scopeSize: parsedScopeSize !== undefined ? Math.round(parsedScopeSize) : undefined,
      isPublic: input.isPublic
    }
  };
};
