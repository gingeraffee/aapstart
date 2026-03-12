/**
 * API Client
 * ==========
 * All requests go to /api/* which Next.js proxies to the FastAPI backend.
 * Credentials (cookies) are always included.
 */

const BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "An error occurred." }));
    throw new ApiError(res.status, error.detail ?? "An error occurred.");
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (payload: {
    employee_id: string;
    first_name: string;
    last_name: string;
    access_code: string;
  }) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),

  me: () => request("/auth/me"),

  logout: () => request("/auth/logout", { method: "POST" }),
};

// ── Modules ───────────────────────────────────────────────────────────────────
export const modulesApi = {
  list: () => request("/modules"),
  get: (slug: string) => request(`/modules/${slug}`),
};

// ── Progress ──────────────────────────────────────────────────────────────────
export const progressApi = {
  getAll: () => request("/progress"),
  visit: (slug: string) =>
    request(`/progress/${slug}/visit`, { method: "POST" }),
  acknowledge: (slug: string, acknowledged_ids: string[]) =>
    request(`/progress/${slug}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ acknowledged_ids }),
    }),
  submitQuiz: (slug: string, answers: Record<string, string>) =>
    request(`/progress/${slug}/quiz`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};

// ── Resources ─────────────────────────────────────────────────────────────────
export const resourcesApi = {
  list: (params?: { category?: string; q?: string }) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][]
      )
    ).toString();
    return request(`/resources${query ? `?${query}` : ""}`);
  },
  categories: () => request("/resources/categories"),
  ui: () => request("/resources/ui"),
};
