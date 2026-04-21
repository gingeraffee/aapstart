"use client";

import { useState, useRef, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { notesApi } from "@/lib/api";
import type { UserNote } from "@/lib/types";

interface NoteWidgetProps {
  moduleSlug: string;
  moduleTitle: string;
}

interface SelectionDraft {
  selectedText: string;
  anchorId: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

  const limitedText = selectedText.length > 600 ? `${selectedText.slice(0, 597)}...` : selectedText;
  const anchorId = findAnchorId(selection.getRangeAt(0).commonAncestorContainer);

  return {
    selectedText: limitedText,
    anchorId,
  };
}

export function NoteWidget({ moduleSlug, moduleTitle }: NoteWidgetProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate } = useSWRConfig();

  const { data: notes = [], mutate: mutateLocal } = useSWR<UserNote[]>(
    `notes:${moduleSlug}`,
    () => notesApi.getForModule(moduleSlug),
    { revalidateOnFocus: false }
  );

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
      const created = await notesApi.create(moduleSlug, {
        note_text: trimmed,
        module_title: moduleTitle,
        selected_text: selectionDraft?.selectedText,
        anchor_id: selectionDraft?.anchorId ?? undefined,
      });
      setText("");
      setSelectionDraft(null);
      mutateLocal((prev = []) => [created, ...prev], false);
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
      // Silent - no visual flip on failed update.
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

  function handleOpenToggle() {
    if (!open) {
      const draft = readSelectionDraft();
      setSelectionDraft(draft);
    }
    setOpen((v) => !v);
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
      <button
        type="button"
        onMouseDown={() => {
          if (!open) {
            setSelectionDraft(readSelectionDraft());
          }
        }}
        onClick={handleOpenToggle}
        className="flex w-full items-center justify-between rounded-[16px] px-5 py-4 text-left transition-opacity hover:opacity-80"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
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
                ? "Jot something down while it's fresh"
                : openCount > 0
                  ? `${notes.length} note${notes.length !== 1 ? "s" : ""} - ${openCount} open`
                  : `${notes.length} note${notes.length !== 1 ? "s" : ""} - all answered`}
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

      {open && (
        <div className="px-5 pb-5 pt-1">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectionDraft(readSelectionDraft())}
              className="rounded-[8px] px-2.5 py-1 text-[0.68rem] font-semibold"
              style={{ background: "rgba(15,127,179,0.08)", color: "#0f7fb3" }}
            >
              Use current highlight
            </button>
            {selectionDraft && (
              <button
                type="button"
                onClick={() => setSelectionDraft(null)}
                className="text-[0.68rem] font-semibold"
                style={{ color: "#7b9ab8" }}
              >
                Clear quote
              </button>
            )}
          </div>

          {selectionDraft && (
            <div
              className="mb-2 rounded-[10px] px-3 py-2"
              style={{ border: "1px solid rgba(15,127,179,0.16)", background: "rgba(15,127,179,0.05)" }}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#0f7fb3" }}>
                Linked Highlight
              </p>
              <p className="mt-1 text-[0.76rem] leading-[1.45] italic" style={{ color: "#1a3152" }}>
                "{selectionDraft.selectedText}"
              </p>
              {selectionDraft.anchorId && (
                <p className="mt-1 text-[0.65rem]" style={{ color: "#5b7fa6" }}>
                  Section anchor: {selectionDraft.anchorId}
                </p>
              )}
            </div>
          )}

          <div
            className="overflow-hidden rounded-[12px]"
            style={{ border: "1px solid rgba(15,127,179,0.22)", background: "#fff" }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setSaveError(null); }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  void handleSave();
                }
              }}
              placeholder="Type a note or question about this module..."
              rows={3}
              className="w-full resize-none px-4 py-3 text-[0.88rem] leading-[1.6] outline-none placeholder:text-[#93aec7]"
              style={{ color: "#0d1f3a", background: "transparent" }}
            />
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderTop: "1px solid rgba(15,127,179,0.12)", background: "rgba(240,248,255,0.5)" }}
            >
              <span className="text-[0.68rem]" style={{ color: "#93aec7" }}>
                {text.length > 0 ? `${text.trim().length} chars - Ctrl/Cmd+Enter to save` : "Ctrl/Cmd+Enter to save"}
              </span>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !text.trim()}
                className="rounded-[8px] px-3.5 py-1.5 text-[0.78rem] font-semibold text-white transition-all duration-150 hover:brightness-110 disabled:cursor-default disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #17365d 0%, #0f7fb3 100%)" }}
              >
                {saving ? "Saving..." : "Add Note"}
              </button>
            </div>
          </div>
          {saveError && (
            <p className="mt-1.5 text-[0.73rem]" style={{ color: "#df0030" }}>{saveError}</p>
          )}

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
                  {note.selected_text && (
                    <div
                      className="mb-2 rounded-[8px] px-2.5 py-2"
                      style={{ border: "1px solid rgba(15,127,179,0.14)", background: "rgba(15,127,179,0.05)" }}
                    >
                      <p className="text-[0.72rem] italic leading-[1.45]" style={{ color: "#335174" }}>
                        "{note.selected_text}"
                      </p>
                      {note.anchor_id && (
                        <a
                          href={`/modules/${note.module_slug}#${encodeURIComponent(note.anchor_id)}`}
                          className="mt-1 inline-block text-[0.66rem] font-semibold"
                          style={{ color: "#0f7fb3" }}
                        >
                          Jump to section
                        </a>
                      )}
                    </div>
                  )}

                  <p className="text-[0.84rem] leading-[1.58]" style={{ color: "#1a3152" }}>
                    {note.note_text}
                  </p>

                  {note.admin_reply && (
                    <div
                      className="mt-2 rounded-[8px] px-2.5 py-2"
                      style={{ border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.07)" }}
                    >
                      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#15803d" }}>
                        Admin Reply
                      </p>
                      <p className="mt-1 text-[0.76rem] leading-[1.5]" style={{ color: "#1f5135" }}>
                        {note.admin_reply}
                      </p>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[0.66rem]" style={{ color: "#7b9ab8" }}>
                      {formatDate(note.created_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(note)}
                        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.66rem] font-semibold transition-all hover:opacity-80"
                        style={{
                          background: note.status === "answered"
                            ? "rgba(34,197,94,0.12)"
                            : "rgba(15,127,179,0.10)",
                          color: note.status === "answered" ? "#16a34a" : "#0f7fb3",
                        }}
                      >
                        {note.status === "answered" ? "Answered" : "Open"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(note.id)}
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
