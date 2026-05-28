export interface ModuleSummary {
  slug: string;
  title: string;
  description: string;
  tracks: string[];
  order: number;
  status: "published" | "draft" | "coming_soon";
  estimated_minutes: number;
  requires_acknowledgement: boolean;
  requires_quiz: boolean;
}

export interface ProgressRecord {
  module_slug: string;
  visited: boolean;
  acknowledgements_completed: boolean;
  quiz_passed: boolean;
  module_completed: boolean;
}

export interface ChecklistBlockItem {
  label: string;
  checked: boolean;
}

export interface ContentBlock {
  type: "text" | "heading" | "subheading" | "callout" | "list" | "image" | "video" | "checklist" | "link" | "download" | "aside" | "qrcode" | "track_block" | "tabs";
  content?: string;
  items?: string[] | ChecklistBlockItem[];
  variant?: string;
  tabs?: { label: string; content: string }[];
  src?: string;
  alt?: string;
  caption?: string;
  // link / download
  url?: string;
  label?: string;
  description?: string;
}

export interface Acknowledgement {
  id: string;
  statement: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
}

export interface Quiz {
  questions: QuizQuestion[];
}

export interface ModuleDetail extends ModuleSummary {
  content_blocks: ContentBlock[];
  acknowledgements: Acknowledgement[];
  quiz: Quiz | null;
  quiz_mode?: string | null;
}

export interface QuizFeedback {
  passed: boolean;
  score: number;
  total: number;
  module_completed: boolean;
  feedback: Record<string, { correct: boolean; correct_id: string }>;
}

export type Track = "hr" | "warehouse" | "administrative" | "management";

export interface User {
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  tracks: Track[];
  is_admin: boolean;
  is_manager: boolean;
  is_executive: boolean;
}

export interface ManagerHoursSummary {
  employee_id: string;
  full_name: string;
  department: string | null;
  regular_hours: number;
  ot_hours: number;
  vacation_hours: number;
  personal_hours: number;
  other_hours: number;
  weeks_included: number;
}

export interface ManagerHoursSummaryV2 extends ManagerHoursSummary {
  absent_w_point_hours: number;
  protected_hours: number;
}

export interface IndirectReport {
  employee_id: string;
  full_name: string;
  tracks: string[];
  department: string | null;
  last_login_at: string | null;
  first_login_at: string | null;
  modules_completed: number;
}

export interface ManagerTeamMember {
  employee_id: string;
  full_name: string;
  tracks: string[];
  department: string | null;
  last_login_at: string | null;
  first_login_at: string | null;
  modules_completed: number;
  is_manager?: boolean;
  reports?: IndirectReport[];
}

export type AttendanceThreshold = "verbal" | "written" | "final" | "termination" | null;

export interface ManagerTeamMemberV2 extends ManagerTeamMember {
  point_total: number | null;
  threshold: AttendanceThreshold;
}

export interface AttendancePointRecord {
  point_date: string;
  point: number;
  reason: string | null;
  note: string | null;
  flag_code: string | null;
  point_total: number;
  imported_at: string | null;
}

export interface AbsenceCategoryEntry {
  employee_id: string;
  full_name: string;
  vacation_hours: number;
  personal_hours: number;
  absent_w_point_hours: number;
  protected_hours: number;
  other_hours: number;
  planned_count: number;
  unplanned_count: number;
  planned_hours: number;
  unplanned_hours: number;
  has_monday_flag: boolean;
}

export interface ManagerReview {
  employee_id: string;
  full_name: string;
  review_type: string;
  due_date: string;
  days_until?: number;
  days_overdue?: number;
}

export interface AbsenceEmployeeSummary {
  employee_id: string;
  full_name: string;
  planned_count: number;
  unplanned_count: number;
  planned_hours: number;
  unplanned_hours: number;
}

export interface ManagerDashboardData {
  team_size: number;
  last_updated: string | null;
  last_updated_time: string | null;
  last_updated_reviews: string | null;
  hours_summary: ManagerHoursSummary[];
  hours_date_range: string | null;
  hours_week_count: number;
  upcoming_reviews: ManagerReview[];
  past_due_reviews: ManagerReview[];
  team: ManagerTeamMember[];
  absence_summary: AbsenceEmployeeSummary[];
  total_planned_absences: number;
  total_unplanned_absences: number;
  absence_date_range: string | null;
  last_updated_absences: string | null;
}

export interface MonthDashboardData extends Omit<ManagerDashboardData, "team" | "hours_summary"> {
  month: string;
  team: ManagerTeamMemberV2[];
  hours_summary: ManagerHoursSummaryV2[];
  absence_by_category: AbsenceCategoryEntry[];
  last_updated_absences: string | null;
}

export interface DashboardCompareData {
  month: MonthDashboardData;
  compare_month: MonthDashboardData;
}

export function isDashboardCompare(
  d: MonthDashboardData | DashboardCompareData
): d is DashboardCompareData {
  return "compare_month" in d;
}

export interface EmployeeDetailData {
  employee: ManagerTeamMemberV2;
  hours: {
    regular: number;
    ot: number;
    vacation: number;
    personal: number;
    absent_w_point: number;
    protected: number;
    other: number;
  };
  reviews: {
    upcoming: (ManagerReview & { days_until: number })[];
    past_due: (ManagerReview & { days_overdue: number })[];
  };
  attendance_points: AttendancePointRecord[];
  current_point_total: number | null;
  threshold: AttendanceThreshold;
}

export interface ImportResult {
  inserted: number;
  updated?: number;
  skipped: number;
  errors: { row: number; employee_id?: string; detail: string }[];
  hours_upserted?: number;
  manager_linked?: number;
}

export interface EmployeeRecord {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  tracks: string[];
  is_admin: boolean;
  is_manager: boolean;
  is_executive: boolean;
  manager_employee_id: string | null;
  department: string | null;
  totp_enabled: boolean;
  created_at: string | null;
  first_login_at: string | null;
  last_login_at: string | null;
  progress: {
    modules_completed: number;
    total_modules_seen: number;
    last_active: string | null;
  };
}

export interface EmployeeImportRowInput {
  employee_id: string;
  track: string; // raw CSV value; pipe-separated for multiple (e.g. "hr|warehouse")
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  department?: string;
  manager_employee_id?: string;
  location?: string;
}

export interface EmployeeImportError {
  row: number;
  employee_id: string | null;
  detail: string;
}

export interface EmployeeImportResult {
  added: number;
  skipped: number;
  errors: EmployeeImportError[];
  manager_linked?: number;
}

export interface BambooImportResult {
  created: number;
  updated: number;
  skipped: number;
  manager_linked: number;
  errors: { row: number; employee_id?: string; detail: string }[];
}

export interface ImportDataset {
  key: "employees" | "time" | "wosh" | "absences" | "points" | "reviews";
  label: string;
  description: string;
  count: number;
  earliest?: string | null;
  latest?: string | null;
  last_imported_at?: string | null;
  distinct_employees?: number;
  completed?: number;
  managers?: number;
  with_department?: number;
  with_manager?: number;
  clear_endpoint?: string | null;
}

export interface ImportStatus {
  datasets: ImportDataset[];
}

export interface DashboardData {
  total_employees: number;
  by_track: Record<string, number>;
  completion: {
    all_complete: number;
    in_progress: number;
    not_started: number;
  };
  recent_logins: {
    full_name: string;
    tracks: string[];
    last_login_at: string;
  }[];
  module_progress: {
    module_slug: string;
    title: string;
    completed: number;
    total: number;
  }[];
}

export interface LoginPayload {
  employee_id: string;
  first_name: string;
  last_name: string;
}

export interface LoginResponse {
  employee_id: string;
  full_name: string;
  tracks: Track[];
  is_admin: boolean;
  is_manager: boolean;
  is_executive: boolean;
  requires_totp: boolean;
  totp_enabled: boolean;
  totp_required: boolean;
}

export interface WoshSummary {
  total_violations: number;
  employees_affected: number;
  early_arrivals: number;
  late_departures: number;
  managers: number;
  generated_text: string;
  week_start: string | null;
  week_end: string | null;
}

export interface WoshByManagerChart {
  manager: string;
  early_only: number;
  late_only: number;
  both: number;
  total: number;
}

export interface WoshException {
  "Employee Name": string | null;
  "Employee #": number | null;
  Manager: string | null;
  Location: string | null;
  Department: string | null;
  Date: string | null;
  "Scheduled Start": string | null;
  "Scheduled End": string | null;
  "Actual Clock In": string | null;
  "Actual Clock Out": string | null;
  "Time Early": string | null;
  "Time Late": string | null;
  "Exception Type": string | null;
}

export interface WoshManagerDetailRow {
  employee_name: string | null;
  emp_num: number | null;
  department: string | null;
  total: number | null;
  early_arrive: number | null;
  late_leave: number | null;
  extra_time: string | null;
  days_affected: string | null;
}

export interface WoshManagerDetail {
  manager: string;
  violations: number;
  employee_count: number;
  rows: WoshManagerDetailRow[];
}

export interface WoshParsedData {
  summary: WoshSummary;
  chart: {
    by_manager: WoshByManagerChart[];
    by_type: { type: string; count: number }[];
    by_day: { day: string; count: number }[];
  };
  top_employees: { employee_name: string; manager: string | null; total: number; early: number; late: number }[];
  by_manager_detail: WoshManagerDetail[];
  exceptions: WoshException[];
}

export interface WoshReport {
  id: number;
  week_label: string | null;
  week_start: string | null;
  week_end: string | null;
  uploaded_at: string | null;
  parsed_data: WoshParsedData | null;
}

export interface WoshReportMeta {
  id: number;
  week_label: string | null;
  week_start: string | null;
  week_end: string | null;
  uploaded_at: string | null;
  parsed_data: { summary: WoshSummary } | null;
}

export interface ExecutiveDashboardData {
  headcount: {
    total: number;
    by_department: { department: string; count: number }[];
    by_track: Record<string, number>;
    managers: number;
    admins: number;
    executives: number;
  };
  hours_by_department: {
    department: string;
    employee_count: number;
    regular_hours: number;
    ot_hours: number;
    vacation_hours: number;
    personal_hours: number;
    other_hours: number;
    absent_w_point_hours: number;
    protected_hours: number;
  }[];
  hours_date_range: string | null;
  last_updated_hours: string | null;
  attendance_thresholds: {
    verbal: number;
    written: number;
    final: number;
    termination: number;
  };
  totals: {
    regular_hours: number;
    ot_hours: number;
  };
}

export interface HeadcountLocation {
  location: string;
  total: number;
  departments: { department: string; count: number }[];
}

export interface HeadcountData {
  total: number;
  by_location: HeadcountLocation[];
}

export interface PTODepartment {
  department: string;
  vacation_hours: number;
  personal_hours: number;
  protected_hours: number;
  total_pto: number;
  employee_count: number;
}

export interface PTOLocation {
  location: string;
  vacation_hours: number;
  personal_hours: number;
  protected_hours: number;
  total_pto: number;
  departments: PTODepartment[];
}

export interface PTOAnalyticsData {
  total_pto: number;
  locations: PTOLocation[];
}

export interface ManagerAdherence {
  manager_id: string;
  manager_name: string;
  department: string | null;
  location: string;
  team_size: number;
  regular_hours: number;
  ot_hours: number;
  ot_rate: number;
  absent_w_point_hours: number;
  reviews_total?: number;
  reviews_past_due?: number;
  review_compliance?: number;
  adherence_score: number;
}

export interface ShiftAdherenceData {
  managers: ManagerAdherence[];
  top_manager: string | null;
  top_score: number | null;
}

export interface TotpSetupData {
  secret: string;
  qr_code: string;
  provisioning_uri: string;
}

export interface UiContent {
  rotating_headers: string[];
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: "link" | "download";
  url?: string;
  filename?: string;
  category: string;
  tracks?: string[];
  module_slug?: string;
}

export type SearchResultItem =
  | ({ result_type: "resource" } & Resource)
  | {
      result_type: "module";
      slug: string;
      title: string;
      description: string;
      estimated_minutes: number;
      tracks: string[];
      order: number;
      status: string;
    };

export interface ResourceCategory {
  id: string;
  label: string;
}


