/**
 * File-backed progress store for dev mode (no backend).
 * Persists to a JSON file so progress survives server restarts.
 */
import fs from "fs";
import path from "path";
import { getModule } from "./content-loader";

const DATA_FILE = path.resolve(process.cwd(), ".dev-progress.json");

interface ProgressEntry {
  module_slug: string;
  visited: boolean;
  acknowledgements_completed: boolean;
  quiz_passed: boolean;
  quiz_score: number | null;
  quiz_attempts: number;
  module_completed: boolean;
  completed_at: string | null;
}

// ── Read / write helpers ────────────────────────────────────────────────────

function loadStore(): Map<string, ProgressEntry> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      return new Map(Object.entries(raw));
    }
  } catch {
    // Corrupted file — start fresh
  }
  return new Map();
}

function saveStore(store: Map<string, ProgressEntry>) {
  const obj = Object.fromEntries(store);
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getOrCreate(store: Map<string, ProgressEntry>, slug: string): ProgressEntry {
  if (!store.has(slug)) {
    store.set(slug, {
      module_slug: slug,
      visited: false,
      acknowledgements_completed: false,
      quiz_passed: false,
      quiz_score: null,
      quiz_attempts: 0,
      module_completed: false,
      completed_at: null,
    });
  }
  return store.get(slug)!;
}

function checkCompletion(entry: ProgressEntry) {
  if (entry.module_completed) return;

  const mod = getModule(entry.module_slug, "administrative");
  const needsAck = mod?.requires_acknowledgement ?? false;
  const needsQuiz = mod?.requires_quiz ?? false;

  const ackOk = needsAck ? entry.acknowledgements_completed : true;
  const quizOk = needsQuiz ? entry.quiz_passed : true;

  if (entry.visited && ackOk && quizOk) {
    entry.module_completed = true;
    entry.completed_at = new Date().toISOString();
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export function getAll(): ProgressEntry[] {
  return Array.from(loadStore().values());
}

export function visit(slug: string): ProgressEntry {
  const store = loadStore();
  const entry = getOrCreate(store, slug);
  entry.visited = true;
  checkCompletion(entry);
  saveStore(store);
  return entry;
}

export function acknowledge(slug: string): ProgressEntry {
  const store = loadStore();
  const entry = getOrCreate(store, slug);
  entry.acknowledgements_completed = true;
  checkCompletion(entry);
  saveStore(store);
  return entry;
}

export function passQuiz(slug: string, score: number, total: number, passed: boolean): ProgressEntry {
  const store = loadStore();
  const entry = getOrCreate(store, slug);
  entry.quiz_attempts += 1;
  entry.quiz_score = score;
  if (passed) {
    entry.quiz_passed = true;
  }
  checkCompletion(entry);
  saveStore(store);
  return entry;
}
