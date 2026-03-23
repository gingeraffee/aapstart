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
  type: "text" | "heading" | "callout" | "list" | "image" | "video" | "checklist" | "link" | "download" | "aside" | "qrcode" | "track_block" | "tabs";
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
  track: Track;
  is_admin: boolean;
}

export interface EmployeeRecord {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  track: string;
  is_admin: boolean;
  created_at: string | null;
  first_login_at: string | null;
  progress: {
    modules_completed: number;
    total_modules_seen: number;
    last_active: string | null;
  };
}

export interface EmployeeImportRowInput {
  employee_id: string;
  track: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
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
    track: string;
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
}

export interface ResourceCategory {
  id: string;
  label: string;
}
