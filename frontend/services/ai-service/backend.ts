import { apiRequest } from '../apiClient';
import { userService } from '../userService';

const isPlanDeniedError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const status = 'status' in error ? (error as { status?: number }).status : undefined;
  const details = 'details' in error ? (error as { details?: { code?: string } }).details : undefined;
  const message = 'message' in error ? String((error as { message?: string }).message || '') : '';
  return status === 403 && (details?.code === 'PLAN_UPGRADE_REQUIRED' || /upgrade to .* unlock|available on the .* plan|current plan/i.test(message));
};

export const isAiPlanDeniedError = isPlanDeniedError;

export const parseJsonText = <T>(text: string): T | null => {
  try {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
};

export const backendGenerateRaw = async (feature: string, prompt: string): Promise<string | null> => {
  const currentUser = userService.getCurrentUser();
  if (!currentUser) return null;
  try {
    const result = await apiRequest<{ content: string }>(`/orgs/${currentUser.orgId}/ai/generate`, {
      method: 'POST',
      body: { feature, prompt }
    });
    return result.content || null;
  } catch (error) {
    if (isPlanDeniedError(error)) throw error;
    return null;
  }
};

export const backendGenerateJson = async <T>(feature: string, prompt: string): Promise<T | null> => {
  const content = await backendGenerateRaw(feature, prompt);
  if (!content) return null;
  return parseJsonText<T>(content);
};
