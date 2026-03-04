import { HttpError } from '../../lib/httpError.js';

export const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getRetryAfterMs = (response: Response): number | undefined => {
  const raw = response.headers.get('retry-after');
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const dateMs = Date.parse(raw);
  if (!Number.isFinite(dateMs)) return undefined;
  const delay = dateMs - Date.now();
  return delay > 0 ? delay : undefined;
};

export const withGraphRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  const maxAttempts = 3;
  let attempt = 0;
  let delayMs = 400;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      const status =
        error instanceof HttpError
          ? Number((error.message.match(/Microsoft Graph request failed \((\d+)\)/)?.[1] || 0))
          : 0;
      const retryable = status === 429 || status >= 500;
      if (!retryable || attempt >= maxAttempts) throw error;
      await sleep(delayMs);
      delayMs *= 2;
    }
  }
  throw new HttpError(502, 'Microsoft Graph request retries exhausted.');
};

export const graphRequest = async <T = any>(input: {
  accessToken: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
}): Promise<T> =>
  withGraphRetry(async () => {
    const response = await fetch(`${GRAPH_BASE_URL}${input.url}`, {
      method: input.method || 'GET',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: input.body === undefined ? undefined : JSON.stringify(input.body)
    });
    if (!response.ok) {
      const retryAfterMs = getRetryAfterMs(response);
      if (retryAfterMs) await sleep(retryAfterMs);
      const text = await response.text().catch(() => '');
      throw new HttpError(400, `Microsoft Graph request failed (${response.status}): ${text || input.url}`);
    }
    if (response.status === 202 || response.status === 204) return undefined as T;
    const raw = await response.text().catch(() => '');
    if (!raw || !raw.trim()) return undefined as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new HttpError(502, `Microsoft Graph returned invalid JSON for ${input.url}`);
    }
  });

export const isAccessDeniedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();
  return (
    message.includes('(403)') ||
    lower.includes('erroraccessdenied') ||
    lower.includes('authorization_requestdenied')
  );
};

export const removeSenderOverrides = (message: Record<string, unknown>) => {
  const clone = { ...message };
  delete (clone as any).from;
  delete (clone as any).sender;
  delete (clone as any).replyTo;
  return clone;
};
