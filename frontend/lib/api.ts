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
      throw new ApiError("Request timed out - is the backend running?", 0);
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

export const authApi = {
  totpSetup: () => request<{ secret: string; qr_code: string; provisioning_uri: string }>("/auth/totp/setup", { method: "POST" }),
  totpConfirmSetup: (code: string) =>
    request("/auth/totp/confirm-setup", { method: "POST", body: JSON.stringify({ code }) }),
  totpValidate: (employee_id: string, code: string) =>
    request("/auth/totp/validate", { method: "POST", body: JSON.stringify({ employee_id, code }) }),
};

export const modulesApi = {
  list: (track?: string) =>
    request(`/modules${track ? `?track=${encodeURIComponent(track)}` : ""}`),
  get: (slug: string, track?: string) =>
    request(`/modules/${slug}${track ? `?track=${encodeURIComponent(track)}` : ""}`),
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
  createEmployee: (data: { employee_id: string; first_name: string; last_name: string; tracks: string[]; is_admin: boolean; department?: string | null; manager_employee_id?: string | null }) =>
    request("/admin/employees", { method: "POST", body: JSON.stringify(data) }),
  importEmployees: (employees: Array<{ employee_id: string; track: string; name?: string; full_name?: string; first_name?: string; last_name?: string; is_admin?: boolean }>) =>
    request("/admin/employees/import", { method: "POST", body: JSON.stringify({ employees }) }),
  updateEmployee: (employee_id: string, data: { first_name?: string; last_name?: string; tracks?: string[]; is_admin?: boolean; is_manager?: boolean; is_executive?: boolean; manager_employee_id?: string | null; department?: string | null }) =>
    request(`/admin/employees/${employee_id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEmployee: (employee_id: string) =>
    request(`/admin/employees/${employee_id}`, { method: "DELETE" }),
  terminateEmployee: (employee_id: string, terminated_date?: string) =>
    request<{ employee_id: string; terminated_date: string; detail: string }>(
      `/admin/employees/${employee_id}/terminate`,
      { method: "POST", body: JSON.stringify({ terminated_date: terminated_date ?? null }) }
    ),
  reactivateEmployee: (employee_id: string) =>
    request<{ employee_id: string; detail: string }>(
      `/admin/employees/${employee_id}/reactivate`,
      { method: "POST", body: JSON.stringify({}) }
    ),
  resetProgress: (employee_id: string) =>
    request(`/admin/employees/${employee_id}/reset-progress`, { method: "POST" }),
  dashboard: () => request("/admin/dashboard"),
  importStatus: () => request<import("./types").ImportStatus>("/admin/import-status"),
  importHistory: () => request<import("./types").ImportHistory>("/admin/imports"),
  resetTotp: (employee_id: string) =>
    request(`/admin/employees/${employee_id}/reset-totp`, { method: "POST" }),
  employeeProgress: (employee_id: string) =>
    request(`/admin/employees/${employee_id}/progress`),
  clearTime: () => request<{ deleted: number }>("/admin/import/time", { method: "DELETE" }),
  clearAbsences: () => request<{ deleted: number }>("/admin/import/absences", { method: "DELETE" }),
  clearReviews: () => request<{ deleted: number }>("/admin/import/reviews", { method: "DELETE" }),
  clearPoints: () => request<{ deleted: number }>("/admin/import/points", { method: "DELETE" }),
  importPoints: (file: File) => uploadFile<import("./types").ImportResult>("/admin/import/points", file),
  importEmployeeDirectory: (file: File) => uploadFile<import("./types").ImportResult>("/admin/import/employee-directory", file),
  importXlsx: (file: File) => uploadFile<import("./types").EmployeeImportResult>("/admin/employees/import-xlsx", file),
  importBamboo: async (file: File, defaultTrack: string): Promise<import("./types").BambooImportResult> => {
    const url = `${API_BASE}/admin/employees/import-bamboo?default_track=${encodeURIComponent(defaultTrack)}`;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(url, { method: "POST", credentials: "include", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(body.detail ?? res.statusText, res.status);
    }
    return res.json();
  },
  managersList: () =>
    request<{ employee_id: string; full_name: string; department: string | null }[]>("/admin/managers"),
};

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const url = `${API_BASE}${path}`;
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url, { method: "POST", credentials: "include", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? res.statusText, res.status);
  }
  return res.json();
}

export const managerApi = {
  dashboard: (weeks?: number) =>
    request<import("./types").ManagerDashboardData>(
      `/manager/dashboard${weeks !== undefined ? `?weeks=${weeks}` : ""}`
    ),
  monthDashboard: (month: string, compareTo?: string, asManagerId?: string) => {
    const p = new URLSearchParams({ month });
    if (compareTo) p.set("compare_month", compareTo);
    if (asManagerId) p.set("as_manager_id", asManagerId);
    return request<import("./types").MonthDashboardData | import("./types").DashboardCompareData>(
      `/manager/dashboard?${p.toString()}`
    );
  },
  employeeDetail: (employeeId: string, month: string) =>
    request<import("./types").EmployeeDetailData>(
      `/manager/employee/${employeeId}?month=${month}`
    ),
  importTime: (file: File) => uploadFile<import("./types").ImportResult>("/manager/import/time", file),
  importReviews: (file: File) => uploadFile<import("./types").ImportResult>("/manager/import/reviews", file),
  importAbsences: (file: File) => uploadFile<import("./types").ImportResult>("/manager/import/absences", file),
};

export const searchApi = {
  all: (q: string) =>
    request<import("./types").SearchResultItem[]>(
      `/search?q=${encodeURIComponent(q)}`
    ),
};

export const executiveApi = {
  dashboard: (params?: { weekStart?: string; fromDate?: string; toDate?: string }) => {
    const p = new URLSearchParams();
    if (params?.weekStart) p.set("week_start", params.weekStart);
    if (params?.fromDate) p.set("from_date", params.fromDate);
    if (params?.toDate) p.set("to_date", params.toDate);
    const qs = p.toString();
    return request<import("./types").ExecutiveDashboardData>(`/executive/dashboard${qs ? `?${qs}` : ""}`);
  },
  woshLatest: () => request<import("./types").WoshReport | null>("/executive/wosh/latest"),
  woshHistory: () => request<import("./types").WoshReportMeta[]>("/executive/wosh/history"),
  woshById: (id: number) => request<import("./types").WoshReport>(`/executive/wosh/${id}`),
  hoursByLocation: (params?: { weekStart?: string; fromDate?: string; toDate?: string }) => {
    const p = new URLSearchParams();
    if (params?.weekStart) p.set("week_start", params.weekStart);
    if (params?.fromDate) p.set("from_date", params.fromDate);
    if (params?.toDate) p.set("to_date", params.toDate);
    const qs = p.toString();
    return request<{ locations: Array<{ location: string; regular_hours: number; ot_hours: number; departments: Array<{ department: string; regular_hours: number; ot_hours: number }> }> }>(`/executive/hours-by-location${qs ? `?${qs}` : ""}`);
  },
  headcount: () => request<import("./types").HeadcountData>("/executive/headcount"),
  ptoAnalytics: () => request<import("./types").PTOAnalyticsData>("/executive/pto-analytics"),
  shiftAdherence: () => request<import("./types").ShiftAdherenceData>("/executive/shift-adherence"),
  uploadWosh: async (file: File, weekLabel?: string): Promise<{ id: number; week_label: string | null; week_start: string | null; week_end: string | null; uploaded_at: string; exceptions: number; managers: number }> => {
    const url = `${API_BASE}/executive/wosh/upload${weekLabel ? `?week_label=${encodeURIComponent(weekLabel)}` : ""}`;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(url, { method: "POST", credentials: "include", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(body.detail ?? res.statusText, res.status);
    }
    return res.json();
  },
  clearWosh: () => request<{ deleted: number }>("/executive/wosh", { method: "DELETE" }),
  deleteWoshById: (id: number) =>
    request<{ deleted: number; id: number }>(`/executive/wosh/${id}`, { method: "DELETE" }),
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
