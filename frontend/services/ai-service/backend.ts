import { apiRequest } from '../apiClient';
import { userService } from '../userService';

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
  } catch {
    return null;
  }
};

export const backendGenerateJson = async <T>(feature: string, prompt: string): Promise<T | null> => {
  const content = await backendGenerateRaw(feature, prompt);
  if (!content) return null;
  return parseJsonText<T>(content);
};
