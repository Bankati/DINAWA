export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ── Barre de progression globale ──
// Compteur de requêtes en vol ; les composants s'y abonnent via subscribeApiLoading.
let _pending = 0;
const _listeners = new Set<(loading: boolean) => void>();
export function subscribeApiLoading(
  fn: (loading: boolean) => void,
): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
function _notify() {
  _listeners.forEach((fn) => fn(_pending > 0));
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(
      (body as { message?: string } | undefined)?.message ??
        `Erreur API (${status})`,
    );
  }
}

const TOKEN_KEY = "warah_access_token";
const REFRESH_KEY = "warah_refresh_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

let refreshing: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new Error("no_refresh_token");

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) {
    // Refresh échoué → déconnexion propre
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem("warah_user");
    if (typeof window !== "undefined") window.location.href = "/auth/login";
    throw new Error("session_expired");
  }

  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  return data.accessToken as string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  silent = false,
): Promise<T> {
  if (!silent) {
    _pending++;
    _notify();
  }
  try {
    const token = getToken();
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    // Retry automatique sur 401 — un seul essai de refresh
    if (
      res.status === 401 &&
      path !== "/auth/refresh" &&
      path !== "/auth/login"
    ) {
      if (!refreshing)
        refreshing = doRefresh().finally(() => {
          refreshing = null;
        });
      let newToken: string;
      try {
        newToken = await refreshing;
      } catch {
        throw new ApiError(401, {
          message: "Session expirée — veuillez vous reconnecter",
        });
      }
      const retryHeaders = new Headers(options.headers);
      if (!(options.body instanceof FormData)) {
        retryHeaders.set("Content-Type", "application/json");
      }
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      const retryRes = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: retryHeaders,
      });
      const isJson2 = retryRes.headers
        .get("content-type")
        ?.includes("application/json");
      const body2 = isJson2 ? await retryRes.json().catch(() => null) : null;
      if (!retryRes.ok) throw new ApiError(retryRes.status, body2);
      return body2 as T;
    }

    const isJson = res.headers
      .get("content-type")
      ?.includes("application/json");
    const body = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) throw new ApiError(res.status, body);
    return body as T;
  } finally {
    if (!silent) {
      _pending--;
      _notify();
    }
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  /** Précharge silencieusement (pas de barre de progression). */
  prefetch: <T>(path: string) => request<T>(path, {}, true),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Pour les réponses binaires (PDF, etc.) — `request()` ne peut pas les
// gérer car il ne fait que du JSON.
export async function getBlob(path: string): Promise<Blob> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  return res.blob();
}
