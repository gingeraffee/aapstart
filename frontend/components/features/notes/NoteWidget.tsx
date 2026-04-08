"use client";

import { useState, useRef, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { notesApi } from "@/lib/api";
import type { UserNote } from "@/lib/types";

interface NoteWidgetProps {
  moduleSlug: string;
  moduleTitle: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function NoteWidget({ moduleSlug, moduleTitle }: NoteWidgetProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate } = useSWRConfig();

  const { data: notes = [], mutate: mutateLocal } = useSWR<UserNote[]>(
    `notes:${moduleSlug}`,
    () => notesApi.getForModule(moduleSlug),
    { revalidateOnFocus: false }
  );

  // Focus the textarea when panel opens
  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSaving(true);
    setSaveError(null);
    try {
      const created = await notesApi.create(moduleSlug, trimmed, moduleTitle);
      setText("");
      mutateLocal((prev = []) => [created, ...prev], false);
      // Invalidate the master notes list so the /notes page stays fresh
      mutate("notes:all");
    } catch {
      setSaveError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(note: UserNote) {
    const newStatus = note.status === "open" ? "answered" : "open";
    try {
      const updated = await notesApi.updateStatus(note.id, newStatus);
      mutateLocal((prev = []) => prev.map((n) => (n.id === note.id ? updated : n)), false);
      mutate("notes:all");
    } catch {
      // Silent — the toggle just won't flip visually if it failed
    }
  }

  async function handleDelete(noteId: number) {
    try {
      await notesApi.delete(noteId);
      mutateLocal((prev = []) => prev.filter((n) => n.id !== noteId), false);
      mutate("notes:all");
    } catch {
      // Silent
    }
  }

  const openCount = notes.filter((n) => n.status === "open").length;

  return (
    <div
      className="rounded-[16px]"
      style={{
        border: "1px solid rgba(15,127,179,0.18)",
        background: open
          ? "linear-gradient(180deg,rgba(240,248,255,0.9) 0%,rgba(250,253,255,1) 100%)"
          : "linear-gradient(180deg,rgba(245,251,255,0.7) 0%,rgba(252,254,255,0.9) 100%)",
        boxShadow: "0 4px 16px rgba(12,24,47,0.06)",
        transition: "background 200ms ease",
      }}
    >
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-[16px] px-5 py-4 text-left transition-opacity hover:opacity-80"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          {/* Pencil icon */}
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(15,127,179,0.10)" }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#0f7fb3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" />
            </svg>
          </span>
          <div>
            <p className="text-[0.82rem] font-bold leading-tight" style={{ color: "#0d1f3a" }}>
              Notes &amp; Questions
            </p>
            <p className="text-[0.68rem] leading-tight" style={{ color: "#5b7fa6" }}>
              {notes.length === 0
                ? "Jot something down while it\u2019s fresh"
                : openCount > 0
                  ? `${notes.length} note${notes.length !== 1 ? "s" : ""} \u2014 ${openCount} open`
                  : `${notes.length} note${notes.length !== 1 ? "s" : ""} \u2014 all answered`}
            </p>
          </div>
        </div>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200"
          style={{
            background: "rgba(15,127,179,0.08)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#0f7fb3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4l4 4 4-4" />
          </svg>
        </span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="px-5 pb-5 pt-1">
          {/* Input area */}
          <div
            className="overflow-hidden rounded-[12px]"
            style={{ border: "1px solid rgba(15,127,179,0.22)", background: "#fff" }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setSaveError(null); }}
              onKeyDown={(e) => {
                // Ctrl/Cmd+Enter to save
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="Type a note or question about this module…"
              rows={3}
              className="w-full resize-none px-4 py-3 text-[0.88rem] leading-[1.6] outline-none placeholder:text-[#93aec7]"
              style={{ color: "#0d1f3a", background: "transparent" }}
            />
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderTop: "1px solid rgba(15,127,179,0.12)", background: "rgba(240,248,255,0.5)" }}
            >
              <span className="text-[0.68rem]" style={{ color: "#93aec7" }}>
                {text.length > 0 ? `${text.trim().length} chars · ⌘↵ to save` : "⌘↵ to save"}
              </span>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !text.trim()}
                className="rounded-[8px] px-3.5 py-1.5 text-[0.78rem] font-semibold text-white transition-all duration-150 hover:brightness-110 disabled:cursor-default disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #17365d 0%, #0f7fb3 100%)" }}
              >
                {saving ? "Saving…" : "Add Note"}
              </button>
            </div>
          </div>
          {saveError && (
            <p className="mt-1.5 text-[0.73rem]" style={{ color: "#df0030" }}>{saveError}</p>
          )}

          {/* Existing notes list */}
          {notes.length > 0 && (
            <div className="mt-4 space-y-2.5">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-[11px] px-4 py-3"
                  style={{
                    background: note.status === "answered"
                      ? "rgba(34,197,94,0.05)"
                      : "rgba(15,127,179,0.04)",
                    border: note.status === "answered"
                      ? "1px solid rgba(34,197,94,0.2)"
                      : "1px solid rgba(15,127,179,0.14)",
                  }}
                >
                  <p className="text-[0.84rem] leading-[1.58]" style={{ color: "#1a3152" }}>
                    {note.note_text}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[0.66rem]" style={{ color: "#7b9ab8" }}>
                      {formatDate(note.created_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(note)}
                        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.66rem] font-semibold transition-all hover:opacity-80"
                        style={{
                          background: note.status === "answered"
                            ? "rgba(34,197,94,0.12)"
                            : "rgba(15,127,179,0.10)",
                          color: note.status === "answered" ? "#16a34a" : "#0f7fb3",
                        }}
                      >
                        {note.status === "answered" ? (
                          <>
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1.5 5.5l2.5 2.5 4.5-5" />
                            </svg>
                            Answered
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            Open
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="flex h-5 w-5 items-center justify-center rounded-full transition-all hover:opacity-80"
                        style={{ background: "rgba(0,0,0,0.04)", color: "#93aec7" }}
                        aria-label="Delete note"
                      >
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M2 2l6 6M8 2L2 8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
