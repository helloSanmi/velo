const ACCESS_TOKEN_KEY = 'velo_access_token';
const REFRESH_TOKEN_KEY = 'velo_refresh_token';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  details?: any;
}

const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);
const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);
let refreshInFlight: Promise<boolean> | null = null;

export const setAuthTokens = (tokens: { accessToken: string; refreshToken: string }): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const clearAuthTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const refreshAccessToken = async (): Promise<boolean> => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) return false;
  const json = (await response.json()) as ApiResponse<{ tokens: { accessToken: string; refreshToken: string } }>;
  if (!json.success || !json.data?.tokens) return false;
  setAuthTokens(json.data.tokens);
  return true;
  })()
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, auth = true, retry = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (response.status === 401 && auth && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retry: false });
    }
  }

  const json = (await response.json().catch(() => ({ success: false, message: 'Invalid response' }))) as ApiResponse<T>;

  if (!response.ok || !json.success) {
    const error: any = new Error(json.message || `Request failed (${response.status})`);
    error.details = json.details;
    error.status = response.status;
    throw error;
  }

  return json.data;
};

export const apiConfig = {
  baseUrl: API_BASE_URL,
  getAccessToken,
  getRefreshToken,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY
};
