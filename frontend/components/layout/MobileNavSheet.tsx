"use client";

import { useEffect } from "react";

interface MobileNavSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function MobileNavSheet({ open, onClose, title, children }: MobileNavSheetProps) {
  // Prevent background scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 flex max-h-[75vh] flex-col rounded-t-[20px] shadow-[0_-8px_30px_rgba(0,0,0,0.18)]"
        style={{
          background: "var(--sidebar-bg)",
          borderTop: "1px solid var(--sidebar-border)",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          animation: "slideUp 0.25s ease-out",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-3">
          <div
            className="h-[4px] w-10 rounded-full"
            style={{ background: "var(--sidebar-label, rgba(100,130,170,0.4))" }}
          />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 pb-3 pt-1">
            <h3
              className="text-[0.82rem] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--sidebar-label)" }}
            >
              {title}
            </h3>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
