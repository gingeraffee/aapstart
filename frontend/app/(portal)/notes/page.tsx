"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { notesApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import type { UserNote } from "@/lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupByModule(notes: UserNote[]): Map<string, { slug: string; title: string | null; notes: UserNote[] }> {
  const map = new Map<string, { slug: string; title: string | null; notes: UserNote[] }>();
  for (const note of notes) {
    if (!map.has(note.module_slug)) {
      map.set(note.module_slug, { slug: note.module_slug, title: note.module_title, notes: [] });
    }
    map.get(note.module_slug)!.notes.push(note);
  }
  return map;
}

export default function NotesPage() {
  const [filter, setFilter] = useState<"all" | "open" | "answered">("all");

  const { data: notes, isLoading, mutate } = useSWR<UserNote[]>(
    "notes:all",
    () => notesApi.getAll(),
    { revalidateOnFocus: true }
  );

  async function handleToggleStatus(note: UserNote) {
    const newStatus = note.status === "open" ? "answered" : "open";
    try {
      await notesApi.updateStatus(note.id, newStatus);
      mutate((prev = []) => prev.map((n) => n.id === note.id ? { ...n, status: newStatus } : n), false);
    } catch {
      // silent
    }
  }

  async function handleDelete(noteId: number) {
    try {
      await notesApi.delete(noteId);
      mutate((prev = []) => prev.filter((n) => n.id !== noteId), false);
    } catch {
      // silent
    }
  }

  const allNotes = notes ?? [];
  const filtered = filter === "all"
    ? allNotes
    : allNotes.filter((n) => n.status === filter);

  const grouped = groupByModule(filtered);
  const openCount = allNotes.filter((n) => n.status === "open").length;
  const answeredCount = allNotes.filter((n) => n.status === "answered").length;

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-10 md:px-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg, rgba(15,127,179,0.12) 0%, rgba(6,182,212,0.08) 100%)" }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#0f7fb3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 3.5a1.768 1.768 0 012.5 2.5L6.5 16.5H4v-2.5L14.5 3.5z" />
            </svg>
          </span>
          <h1
            className="font-display text-[1.6rem] font-bold tracking-[-0.03em]"
            style={{ color: "#0d1f3a" }}
          >
            Notes &amp; Questions
          </h1>
        </div>
        <p className="text-[0.88rem] leading-relaxed" style={{ color: "#5b7fa6" }}>
          Everything you&apos;ve jotted down while working through your modules.
        </p>

        {/* Stats row */}
        {allNotes.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-3">
            <div
              className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold"
              style={{ background: "rgba(15,127,179,0.08)", color: "#0f7fb3" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#0f7fb3]" />
              {allNotes.length} total
            </div>
            <div
              className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold"
              style={{ background: "rgba(245,158,11,0.08)", color: "#b45309" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
              {openCount} open
            </div>
            <div
              className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold"
              style={{ background: "rgba(34,197,94,0.08)", color: "#16a34a" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 5.5l2.5 2.5 4.5-5" />
              </svg>
              {answeredCount} answered
            </div>
          </div>
        )}
      </div>

      {/* Filter pills */}
      {allNotes.length > 0 && (
        <div className="mb-6 flex gap-2">
          {(["all", "open", "answered"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="rounded-full px-4 py-1.5 text-[0.78rem] font-semibold capitalize transition-all duration-150"
              style={{
                background: filter === f
                  ? "linear-gradient(135deg, #17365d 0%, #0f7fb3 100%)"
                  : "rgba(15,127,179,0.07)",
                color: filter === f ? "#fff" : "#4d6788",
                boxShadow: filter === f ? "0 2px 8px rgba(15,127,179,0.22)" : "none",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allNotes.length === 0 && (
        <div
          className="flex flex-col items-center gap-4 rounded-[20px] px-8 py-16 text-center"
          style={{
            background: "linear-gradient(180deg,#f5fbff 0%,#fafcff 100%)",
            border: "1px dashed rgba(15,127,179,0.22)",
          }}
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "rgba(15,127,179,0.08)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f7fb3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3.5a2.121 2.121 0 013 3L7.5 20H5v-2.5L17 3.5z" />
              <path d="M15 5.5l3 3" />
            </svg>
          </span>
          <div>
            <p className="text-[1rem] font-semibold" style={{ color: "#0d1f3a" }}>No notes yet</p>
            <p className="mt-1 text-[0.84rem] leading-relaxed" style={{ color: "#5b7fa6" }}>
              Open any module and use the Notes &amp; Questions panel at the bottom to jot things down as you go.
            </p>
          </div>
          <Link
            href="/overview"
            className="mt-2 rounded-[10px] px-5 py-2.5 text-[0.84rem] font-semibold text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #17365d 0%, #0f7fb3 100%)" }}
          >
            Go to my modules
          </Link>
        </div>
      )}

      {/* No results for filter */}
      {!isLoading && allNotes.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-[0.88rem]" style={{ color: "#5b7fa6" }}>
            No {filter} notes yet.
          </p>
        </div>
      )}

      {/* Notes grouped by module */}
      {!isLoading && grouped.size > 0 && (
        <div className="space-y-8">
          {Array.from(grouped.values()).map((group) => (
            <div key={group.slug}>
              {/* Module heading */}
              <div className="mb-3 flex items-center gap-2.5">
                <Link
                  href={`/modules/${group.slug}`}
                  className="group flex items-center gap-2 text-[0.76rem] font-bold uppercase tracking-[0.1em] transition-opacity hover:opacity-75"
                  style={{ color: "#0f7fb3" }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: "rgba(15,127,179,0.10)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h8M2 6h8M2 9h5" />
                    </svg>
                  </span>
                  {group.title ?? group.slug}
                </Link>
                <span
                  className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold"
                  style={{ background: "rgba(15,127,179,0.08)", color: "#0f7fb3" }}
                >
                  {group.notes.length}
                </span>
              </div>

              {/* Notes for this module */}
              <div className="space-y-2.5">
                {group.notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-[14px] px-5 py-4 transition-all duration-150"
                    style={{
                      background: note.status === "answered"
                        ? "linear-gradient(180deg,rgba(240,253,244,0.9) 0%,rgba(248,255,250,1) 100%)"
                        : "linear-gradient(180deg,#fff 0%,rgba(250,253,255,1) 100%)",
                      border: note.status === "answered"
                        ? "1px solid rgba(34,197,94,0.22)"
                        : "1px solid rgba(15,127,179,0.16)",
                      boxShadow: "0 2px 10px rgba(12,24,47,0.05)",
                    }}
                  >
                    {/* Note text */}
                    {note.selected_text && (
                      <div className="mb-2 rounded-[8px] px-3 py-2" style={{ background: "rgba(15,127,179,0.06)", border: "1px solid rgba(15,127,179,0.15)" }}>
                        <p className="text-[0.76rem] italic leading-[1.45]" style={{ color: "#335174" }}>
                          "{note.selected_text}"
                        </p>
                        {note.anchor_id && (
                          <Link
                            href={`/modules/${note.module_slug}#${encodeURIComponent(note.anchor_id)}`}
                            className="mt-1 inline-block text-[0.68rem] font-semibold"
                            style={{ color: "#0f7fb3" }}
                          >
                            Jump to section
                          </Link>
                        )}
                      </div>
                    )}
                    <p className="text-[0.88rem] leading-[1.65]" style={{ color: "#1a3152" }}>
                      {note.note_text}
                    </p>
                    {note.admin_reply && (
                      <div className="mt-2 rounded-[8px] px-3 py-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#15803d" }}>
                          Admin Reply
                        </p>
                        <p className="mt-1 text-[0.76rem] leading-[1.5]" style={{ color: "#1f5135" }}>
                          {note.admin_reply}
                        </p>
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[0.7rem]" style={{ color: "#7b9ab8" }}>
                        {formatDate(note.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Status toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(note)}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-semibold transition-all hover:opacity-80"
                          style={{
                            background: note.status === "answered"
                              ? "rgba(34,197,94,0.12)"
                              : "rgba(245,158,11,0.10)",
                            color: note.status === "answered" ? "#16a34a" : "#b45309",
                          }}
                        >
                          {note.status === "answered" ? (
                            <>
                              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1.5 5.5l2.5 2.5 4.5-5" />
                              </svg>
                              Answered
                            </>
                          ) : (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              Open - mark answered
                            </>
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-full transition-all hover:opacity-80"
                          style={{ background: "rgba(0,0,0,0.04)", color: "#93aec7" }}
                          aria-label="Delete note"
                        >
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M2 2l6 6M8 2L2 8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
