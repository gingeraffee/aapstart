/**
 * Server-side content loader — mirrors the Python backend's content/loader.py
 * Used by Next.js API routes when DEV_AUTH_BYPASS is enabled (no backend).
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

const CONTENT_DIR = path.resolve(process.cwd(), "..", "content");

// ── Types ───────────────────────────────────────────────────────────────────

interface RawModule {
  slug: string;
  title: string;
  description: string;
  tracks: string[];
  order: number;
  estimated_minutes: number;
  status: string;
  requires_quiz: boolean;
  requires_acknowledgement: boolean;
  content_blocks: ContentBlock[];
  quiz: RawQuiz | null;
  acknowledgements: { id: string; statement: string }[];
}

interface ContentBlock {
  type: string;
  content?: string;
  variant?: string;
  items?: unknown[];
  tabs?: { label: string; content: string }[];
  tracks?: string[];
  [key: string]: unknown;
}

interface RawQuiz {
  questions: {
    id: string;
    text: string;
    options: { id: string; text: string }[];
    correctId: string;
  }[];
}

// ── Cache (survives HMR via globalThis) ─────────────────────────────────────

const g = globalThis as unknown as { __contentLoaderCache?: Map<string, RawModule> };

function getCache(): Map<string, RawModule> {
  if (g.__contentLoaderCache) return g.__contentLoaderCache;
  g.__contentLoaderCache = new Map();
  const _cache = g.__contentLoaderCache;
  const modulesDir = path.join(CONTENT_DIR, "modules");
  if (!fs.existsSync(modulesDir)) return _cache;

  for (const file of fs.readdirSync(modulesDir).sort()) {
    if (!file.endsWith(".md")) continue;
    try {
      const mod = parseModuleFile(path.join(modulesDir, file));
      _cache.set(mod.slug, mod);
    } catch (e) {
      console.warn(`[content-loader] Could not load ${file}:`, e);
    }
  }
  return _cache;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function getModulesForTrack(track: string) {
  const cache = getCache();
  const result: Record<string, unknown>[] = [];
  for (const mod of cache.values()) {
    if (mod.status === "draft") continue;
    if (mod.tracks.includes("all") || mod.tracks.includes(track)) {
      result.push(moduleSummary(mod));
    }
  }
  result.sort((a, b) => (a.order as number) - (b.order as number));
  return result;
}

export function getModule(slug: string, track: string) {
  const cache = getCache();
  const mod = cache.get(slug);
  if (!mod) return null;
  if (!mod.tracks.includes("all") && !mod.tracks.includes(track)) return null;
  return moduleForClient(mod, track);
}

export function getQuizAnswers(slug: string): Record<string, string> | null {
  const cache = getCache();
  const mod = cache.get(slug);
  if (!mod?.quiz) return null;
  const answers: Record<string, string> = {};
  for (const q of mod.quiz.questions) {
    answers[q.id] = q.correctId;
  }
  return answers;
}

// ── Parsing ─────────────────────────────────────────────────────────────────

function parseModuleFile(filepath: string): RawModule {
  const raw = fs.readFileSync(filepath, "utf-8");
  const { data: meta, content: body } = matter(raw);

  return {
    slug: meta.slug || path.basename(filepath, ".md"),
    title: meta.title || "Untitled",
    description: meta.description || "",
    tracks: normaliseTracks(meta.tracks),
    order: meta.order ?? 99,
    estimated_minutes: meta.estimatedMinutes ?? 10,
    status: meta.status || "published",
    requires_quiz: !!meta.requiresQuiz,
    requires_acknowledgement: !!meta.requiresAcknowledgement,
    content_blocks: parseBody(body),
    quiz: meta.quiz || null,
    acknowledgements: meta.acknowledgements || [],
  };
}

function normaliseTracks(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.map(String);
  return ["all"];
}

// ── Body parser (mirrors Python _parse_body) ────────────────────────────────

const DIRECTIVE_RE = /(:::(\w+)(?:\s+[^\n]*)?\n[\s\S]*?:::)/gm;

function renderMd(text: string): string {
  return marked.parse(text.trim(), { async: false }) as string;
}

function parseBody(body: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let lastEnd = 0;

  for (const match of body.matchAll(DIRECTIVE_RE)) {
    const before = body.slice(lastEnd, match.index).trim();
    if (before) blocks.push({ type: "text", content: renderMd(before) });

    const parsed = parseDirective(match[1]);
    if (parsed) blocks.push(parsed);

    lastEnd = match.index! + match[0].length;
  }

  const tail = body.slice(lastEnd).trim();
  if (tail) blocks.push({ type: "text", content: renderMd(tail) });

  return blocks;
}

function parseDirective(block: string): ContentBlock | null {
  const lines = block.split("\n");
  const header = lines[0].trim();
  const inner = lines.slice(1, -1).join("\n");

  const headerParts = header.slice(3).trim().split(/\s+/);
  if (!headerParts.length) return null;
  const blockType = headerParts[0];
  const args = headerParts.slice(1);

  if (blockType === "callout") {
    return { type: "callout", variant: args[0] || "tip", content: renderMd(inner) };
  }
  if (blockType === "tabs") {
    return { type: "tabs", tabs: parseTabs(inner) };
  }
  if (blockType === "checklist") {
    return { type: "checklist", items: parseChecklist(inner) };
  }
  if (blockType === "track") {
    const rawTracks = args.join(" ").replace(/[[\]]/g, "").split(",");
    const tracks = rawTracks.map((t) => t.trim()).filter(Boolean);
    return { type: "track_block", tracks, content: renderMd(inner) };
  }
  if (["download", "link", "video", "image"].includes(blockType)) {
    return { type: blockType, ...parseKeyValue(inner) };
  }
  if (blockType === "aside") {
    const props = parseKeyValue(inner);
    const headerText = props.header || "";
    delete props.header;
    // Everything after key-value lines is the body content
    const bodyLines = inner.split("\n").filter((l) => !l.includes(":") || l.trim().startsWith("-"));
    const bodyContent = bodyLines.length > 0 ? renderMd(inner.split("\n").filter((l) => {
      const trimmed = l.trim();
      return !(trimmed.startsWith("header:") || trimmed.startsWith("icon:") || trimmed.startsWith("border:"));
    }).join("\n")) : "";
    return { type: "aside", content: bodyContent, label: headerText, ...props };
  }
  if (blockType === "qrcode") {
    return { type: "qrcode", ...parseKeyValue(inner) };
  }
  return null;
}

function parseTabs(content: string): { label: string; content: string }[] {
  const tabs: { label: string; content: string }[] = [];
  let currentLabel: string | null = null;
  let currentLines: string[] = [];

  for (const line of content.split("\n")) {
    const m = line.match(/\[\[\s*(.+?)\s*]]/);
    if (m) {
      if (currentLabel !== null) {
        tabs.push({ label: currentLabel, content: renderMd(currentLines.join("\n")) });
      }
      currentLabel = m[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLabel !== null) {
    tabs.push({ label: currentLabel, content: renderMd(currentLines.join("\n")) });
  }
  return tabs;
}

function parseChecklist(content: string): { label: string; checked: boolean }[] {
  const items: { label: string; checked: boolean }[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- [x]")) {
      items.push({ label: trimmed.slice(5).trim(), checked: true });
    } else if (trimmed.startsWith("- [ ]")) {
      items.push({ label: trimmed.slice(5).trim(), checked: false });
    }
  }
  return items;
}

function parseKeyValue(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.trim().split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return result;
}

// ── Views ───────────────────────────────────────────────────────────────────

function moduleSummary(mod: RawModule) {
  return {
    slug: mod.slug,
    title: mod.title,
    description: mod.description,
    order: mod.order,
    estimated_minutes: mod.estimated_minutes,
    status: mod.status,
    requires_quiz: mod.requires_quiz,
    requires_acknowledgement: mod.requires_acknowledgement,
  };
}

function moduleForClient(mod: RawModule, track: string) {
  const contentBlocks = mod.content_blocks.filter((b) => {
    if (b.type !== "track_block") return true;
    const tracks = (b.tracks as string[]) || [];
    return tracks.includes("all") || tracks.includes(track);
  });

  let quizClient = null;
  if (mod.quiz) {
    quizClient = {
      questions: mod.quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        // correctId intentionally omitted
      })),
    };
  }

  return {
    ...moduleSummary(mod),
    content_blocks: contentBlocks,
    quiz: quizClient,
    acknowledgements: mod.acknowledgements,
  };
}
