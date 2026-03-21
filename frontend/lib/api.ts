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

  if (res.status === 204) {
    return undefined as T;
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

export const adminApi = {
  listEmployees: () => request("/admin/employees"),
  createEmployee: (data: { employee_id: string; first_name: string; last_name: string; track: string; is_admin: boolean }) =>
    request("/admin/employees", { method: "POST", body: JSON.stringify(data) }),
  importEmployees: (employees: Array<{ employee_id: string; track: string; name?: string; full_name?: string; first_name?: string; last_name?: string; is_admin?: boolean }>) =>
    request("/admin/employees/import", { method: "POST", body: JSON.stringify({ employees }) }),
  updateEmployee: (employee_id: string, data: { first_name?: string; last_name?: string; track?: string; is_admin?: boolean }) =>
    request(`/admin/employees/${employee_id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEmployee: (employee_id: string) =>
    request(`/admin/employees/${employee_id}`, { method: "DELETE" }),
  dashboard: () => request("/admin/dashboard"),
};

export const resourcesApi = {
  ui: () => request("/resources/ui"),
  list: (category?: string, q?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    const qs = params.toString();
    return request(`/resources${qs ? `?${qs}` : ""}`);
  },
  categories: () => request("/resources/categories"),
  download: async (filename: string, displayName: string) => {
    const url = `${API_BASE}/resources/download?filename=${encodeURIComponent(filename)}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new ApiError("File not found.", res.status);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = displayName;
    a.click();
    URL.revokeObjectURL(objectUrl);
  },
};
