const DEFAULT_BASE_URL = 'http://localhost:8000';

let authToken: string | null = null;
const ENABLE_API_LOGS = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export const API_BASE_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL);

function logApi(label: string, data: Record<string, unknown>) {
  if (!ENABLE_API_LOGS) return;
  try {
    // Avoid logging sensitive headers
    if ('headers' in data && typeof data.headers === 'object' && data.headers) {
      const headers = { ...(data.headers as Record<string, unknown>) };
      if (headers.Authorization) headers.Authorization = '[redacted]';
      data = { ...data, headers };
    }
    // eslint-disable-next-line no-console
    console.log(`[api] ${label}`, data);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`[api] ${label}`);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers ?? {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const startedAt = Date.now();
  logApi('request', {
    url,
    method: options.method ?? 'GET',
    headers: Object.fromEntries(headers.entries()),
  });
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    logApi('network_error', {
      url,
      method: options.method ?? 'GET',
      message: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
  logApi('response', {
    url,
    method: options.method ?? 'GET',
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - startedAt,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logApi('error_body', { url, status: response.status, body: errorText.slice(0, 500) });
    throw new Error(errorText || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers();
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  const startedAt = Date.now();
  logApi('request', {
    url,
    method: 'POST',
    headers: Object.fromEntries(headers.entries()),
    body: '[form-data]',
  });
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (error) {
    logApi('network_error', {
      url,
      method: 'POST',
      message: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
  logApi('response', {
    url,
    method: 'POST',
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - startedAt,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logApi('error_body', { url, status: response.status, body: errorText.slice(0, 500) });
    throw new Error(errorText || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
