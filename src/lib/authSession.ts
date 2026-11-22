/**
 * In-memory API Bearer token & authenticated header helper.
 * Stored strictly in JavaScript memory (never written to localStorage or sessionStorage).
 */

let inMemoryApiToken: string | null = null;

export function setInMemoryApiToken(token: string | null): void {
  inMemoryApiToken = token && typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function getInMemoryApiToken(): string | null {
  return inMemoryApiToken;
}

export function clearInMemoryApiToken(): void {
  inMemoryApiToken = null;
}

export function getApiAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  if (inMemoryApiToken) {
    headers['Authorization'] = `Bearer ${inMemoryApiToken}`;
  }
  return headers;
}

export async function fetchWithApiAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const mergedHeaders = new Headers(init.headers || {});
  if (inMemoryApiToken && !mergedHeaders.has('Authorization')) {
    mergedHeaders.set('Authorization', `Bearer ${inMemoryApiToken}`);
  }
  return fetch(input, { ...init, headers: mergedHeaders });
}
