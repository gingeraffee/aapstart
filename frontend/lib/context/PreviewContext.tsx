"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import type { Track } from "@/lib/types";

const STORAGE_KEY = "aapstart_preview_track";

interface PreviewContextValue {
  /** The user's real authenticated track — never changes */
  actualTrack: Track;
  /** The track to render the UI as (previewTrack when active, otherwise actualTrack) */
  effectiveTrack: Track;
  /** The preview track if set, or null when viewing as own role */
  previewTrack: Track | null;
  /** Whether preview mode is active (viewing a different track) */
  isPreviewing: boolean;
  /** Whether the current user is allowed to use the preview feature */
  canPreview: boolean;
  /** Set preview to a specific track, or null to reset */
  setPreviewTrack: (track: Track | null) => void;
}

const PreviewContext = createContext<PreviewContextValue>({
  actualTrack: "hr",
  effectiveTrack: "hr",
  previewTrack: null,
  isPreviewing: false,
  canPreview: false,
  setPreviewTrack: () => {},
});

export function usePreview() {
  return useContext(PreviewContext);
}

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const actualTrack: Track = user?.track ?? "administrative";
  const canPreview = !!user && actualTrack === "hr" && user.is_admin === true;

  const [previewTrack, setPreviewTrackState] = useState<Track | null>(null);

  // Load persisted preview track on mount
  useEffect(() => {
    if (!canPreview) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ["hr", "warehouse", "administrative", "management"].includes(stored)) {
        // Only restore if it's a different track than actual
        if (stored !== actualTrack) {
          setPreviewTrackState(stored as Track);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [canPreview, actualTrack]);

  const setPreviewTrack = useCallback(
    (track: Track | null) => {
      if (!canPreview) return;
      // If setting to own actual track, treat as clearing preview
      const effective = track === actualTrack ? null : track;
      setPreviewTrackState(effective);
      try {
        if (effective) {
          localStorage.setItem(STORAGE_KEY, effective);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Ignore storage errors
      }
    },
    [canPreview, actualTrack],
  );

  // Clear preview if user is not HR (e.g. after logout/login as different user)
  useEffect(() => {
    if (!canPreview && previewTrack) {
      setPreviewTrackState(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }, [canPreview, previewTrack]);

  const isPreviewing = canPreview && previewTrack !== null;
  const effectiveTrack: Track = isPreviewing ? previewTrack! : actualTrack;

  return (
    <PreviewContext.Provider
      value={{
        actualTrack,
        effectiveTrack,
        previewTrack,
        isPreviewing,
        canPreview,
        setPreviewTrack,
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
}
