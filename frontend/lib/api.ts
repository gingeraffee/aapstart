const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("Request timed out — is the backend running?", 0);
    }
    throw new ApiError("Cannot reach the server", 0);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? res.statusText, res.status);
  }

  return res.json();
}

export const modulesApi = {
  list: () => request("/modules"),
  get: (slug: string) => request(`/modules/${slug}`),
};

export const progressApi = {
  getAll: () => request("/progress"),
  visit: (slug: string) => request(`/progress/${slug}/visit`, { method: "POST" }),
  acknowledge: (slug: string, ids: string[]) =>
    request(`/progress/${slug}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ acknowledged_ids: ids }),
    }),
  submitQuiz: (slug: string, answers: Record<string, string>) =>
    request(`/progress/${slug}/quiz`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};

export const resourcesApi = {
  ui: () => request("/resources/ui"),
};
