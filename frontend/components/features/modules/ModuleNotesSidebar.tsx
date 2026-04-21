"use client";

import { useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { cn } from "@/lib/utils";
import { notesApi } from "@/lib/api";
import type { UserNote } from "@/lib/types";

interface ModuleNotesSidebarProps {
  moduleSlug: string;
  moduleTitle: string;
}

interface SelectionDraft {
  selectedText: string;
  anchorId: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function findAnchorId(node: Node | null): string | null {
  if (!node) return null;
  let current: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
  while (current) {
    if (current.id) return current.id;
    current = current.parentElement;
  }
  return null;
}

function readSelectionDraft(): SelectionDraft | null {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const selectedText = selection.toString().replace(/\s+/g, " ").trim();
  if (!selectedText) return null;

  return {
    selectedText: selectedText.length > 600 ? `${selectedText.slice(0, 597)}...` : selectedText,
    anchorId: findAnchorId(selection.getRangeAt(0).commonAncestorContainer),
  };
}

export function ModuleNotesSidebar({ moduleSlug, moduleTitle }: ModuleNotesSidebarProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: mutateGlobal } = useSWRConfig();

  const { data: notes = [], mutate } = useSWR<UserNote[]>(
    `notes:${moduleSlug}`,
    () => notesApi.getForModule(moduleSlug),
    { revalidateOnFocus: false }
  );

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const created = await notesApi.create(moduleSlug, {
        note_text: trimmed,
        module_title: moduleTitle,
        selected_text: selectionDraft?.selectedText,
        anchor_id: selectionDraft?.anchorId ?? undefined,
      });
      setText("");
      setSelectionDraft(null);
      mutate((prev = []) => [created, ...prev], false);
      mutateGlobal("notes:all");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: number) {
    try {
      await notesApi.delete(noteId);
      mutate((prev = []) => prev.filter((n) => n.id !== noteId), false);
      mutateGlobal("notes:all");
    } catch {
      // silent
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSave();
    }
  }

  const hasNotes = notes.length > 0;

  return (
    <>
      <button
        onMouseDown={() => {
          if (!open) setSelectionDraft(readSelectionDraft());
        }}
        onClick={() => {
          if (!open) setSelectionDraft(readSelectionDraft());
          setOpen((o) => !o);
        }}
        aria-label={open ? "Close notes" : "Open notes"}
        className={cn(
          "fixed bottom-8 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(12,24,47,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(12,24,47,0.22)]",
          open
            ? "bg-[linear-gradient(135deg,#0b1e3d_0%,#132d52_100%)] border border-[rgba(56,189,248,0.35)]"
            : "bg-[linear-gradient(135deg,#184371_0%,#13629a_100%)] border border-[#6eaeea]"
        )}
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        ) : (
          <span className="relative">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2.5a2.121 2.121 0 013 3L6 17l-4 1 1-4 11.5-11.5z" />
            </svg>
            {hasNotes && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#38bdf8] ring-2 ring-[#184371]" />
            )}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px] transition-opacity duration-200"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed bottom-0 right-0 top-0 z-40 flex w-[320px] flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          background: "linear-gradient(180deg, #fffefb 0%, #f6fbff 100%)",
          borderLeft: "1px solid rgba(159,188,221,0.84)",
          boxShadow: "-10px 0 32px rgba(12,24,47,0.14)",
        }}
      >
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(159,188,221,0.5)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[9px]"
              style={{ background: "rgba(14,118,189,0.1)" }}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#0784c4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2.5a2.121 2.121 0 013 3L6 17l-4 1 1-4 11.5-11.5z" />
              </svg>
            </span>
            <div>
              <p className="text-[0.78rem] font-bold leading-none" style={{ color: "#17365d" }}>My Notes</p>
              <p className="mt-0.5 max-w-[190px] truncate text-[0.67rem] leading-none" style={{ color: "#607895" }}>
                {moduleTitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-[rgba(14,118,189,0.08)]"
            aria-label="Close notes"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#607895" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(159,188,221,0.35)" }}>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectionDraft(readSelectionDraft())}
              className="rounded-[8px] px-2.5 py-1 text-[0.65rem] font-semibold"
              style={{ background: "rgba(14,118,189,0.09)", color: "#0f7fb3" }}
            >
              Use current highlight
            </button>
            {selectionDraft && (
              <button
                type="button"
                onClick={() => setSelectionDraft(null)}
                className="text-[0.65rem] font-semibold"
                style={{ color: "#607895" }}
              >
                Clear quote
              </button>
            )}
          </div>

          {selectionDraft && (
            <div className="mb-2 rounded-[10px] px-3 py-2" style={{ background: "rgba(14,118,189,0.06)", border: "1px solid rgba(14,118,189,0.18)" }}>
              <p className="text-[0.72rem] leading-[1.45] italic" style={{ color: "#1b2c56" }}>
                "{selectionDraft.selectedText}"
              </p>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jot down a question or reminder..."
            rows={3}
            className="w-full resize-none rounded-[12px] p-3 text-[0.82rem] leading-[1.65] outline-none transition-shadow duration-150 focus:ring-2"
            style={{
              background: "rgba(18,45,78,0.04)",
              border: "1px solid rgba(159,188,221,0.7)",
              color: "#1b2c56",
              caretColor: "#0f7fb3",
            }}
          />
          <button
            onClick={() => void handleSave()}
            disabled={saving || !text.trim()}
            className="mt-2 w-full rounded-[10px] py-2 text-[0.76rem] font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)" }}
          >
            {saving ? "Saving..." : "Save note"}
          </button>
          <p className="mt-1.5 text-center text-[0.62rem]" style={{ color: "#99aabb" }}>
            Ctrl/Cmd + Enter to save
          </p>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-3" style={{ scrollbarWidth: "thin" }}>
          {notes.length === 0 ? (
            <p className="mt-4 text-center text-[0.78rem] leading-[1.6]" style={{ color: "#99aabb" }}>
              No notes yet for this module.
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="group rounded-[10px] px-3 py-2.5"
                style={{ background: "rgba(18,45,78,0.04)", border: "1px solid rgba(159,188,221,0.55)" }}
              >
                {note.selected_text && (
                  <p className="mb-1 text-[0.68rem] italic leading-[1.4]" style={{ color: "#4d6788" }}>
                    "{note.selected_text}"
                  </p>
                )}
                <p className="whitespace-pre-wrap text-[0.8rem] leading-[1.6]" style={{ color: "#1b2c56" }}>
                  {note.note_text}
                </p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[0.62rem]" style={{ color: "#99aabb" }}>{formatDate(note.created_at)}</span>
                  <button
                    onClick={() => void handleDelete(note.id)}
                    className="text-[0.62rem] font-medium opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: "#be123c" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
