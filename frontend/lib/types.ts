// ── User / Auth ───────────────────────────────────────────────────────────────
export type Track = "hr" | "warehouse" | "administrative";

export interface User {
  employee_id: string;
  full_name: string;
  track: Track;
}

// ── Modules ───────────────────────────────────────────────────────────────────
export type ModuleStatus = "published" | "coming_soon" | "draft";

export interface ModuleSummary {
  slug: string;
  title: string;
  description: string;
  order: number;
  estimated_minutes: number;
  status: ModuleStatus;
  requires_quiz: boolean;
  requires_acknowledgement: boolean;
}

// Content block types
export type ContentBlock =
  | TextBlock
  | CalloutBlock
  | TabsBlock
  | ChecklistBlock
  | TrackBlock
  | DownloadBlock
  | LinkBlock
  | VideoBlock
  | ImageBlock;

export interface TextBlock       { type: "text";         content: string; }
export interface CalloutBlock    { type: "callout";      variant: "tip" | "info" | "warning"; content: string; }
export interface TabsBlock       { type: "tabs";         tabs: TabItem[]; }
export interface ChecklistBlock  { type: "checklist";    items: ChecklistItem[]; }
export interface TrackBlock      { type: "track_block";  tracks: string[]; content: string; }
export interface DownloadBlock   { type: "download";     filename: string; label: string; description?: string; }
export interface LinkBlock       { type: "link";         url: string; label: string; description?: string; }
export interface VideoBlock      { type: "video";        url: string; title?: string; }
export interface ImageBlock      { type: "image";        src: string; alt?: string; caption?: string; }

export interface TabItem         { label: string; content: string; }
export interface ChecklistItem   { label: string; checked: boolean; }

// Quiz
export interface QuizOption      { id: string; text: string; }
export interface QuizQuestion    { id: string; text: string; options: QuizOption[]; }
export interface Quiz            { questions: QuizQuestion[]; }

// Acknowledgement
export interface AcknowledgementItem { id: string; statement: string; }

export interface ModuleDetail extends ModuleSummary {
  content_blocks: ContentBlock[];
  quiz: Quiz | null;
  acknowledgements: AcknowledgementItem[];
}

// ── Progress ─────────────────────────────────────────────────────────────────
export interface ProgressRecord {
  module_slug: string;
  visited: boolean;
  acknowledgements_completed: boolean;
  quiz_passed: boolean;
  quiz_score: number | null;
  quiz_attempts: number;
  module_completed: boolean;
  completed_at: string | null;
}

export interface QuizFeedback {
  passed: boolean;
  score: number;
  total: number;
  feedback: Record<string, { correct: boolean; correct_id: string }>;
  module_completed: boolean;
}

// ── Resources ─────────────────────────────────────────────────────────────────
export type ResourceType = "download" | "link";

export interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  tracks: string[];
  type: ResourceType;
  filename?: string;
  url?: string;
  tags: string[];
}

export interface ResourceCategory {
  id: string;
  label: string;
}

// ── UI Copy ───────────────────────────────────────────────────────────────────
export interface UiContent {
  rotating_headers: string[];
  coach_tips: string[];
  login_scenes: LoginScene[];
}

export interface LoginScene {
  id: string;
  headline: string;
  subtext: string;
  body?: string;
}
