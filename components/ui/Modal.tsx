"use client";

import { useEffect } from "react";
import { IconX } from "@/components/ui/icons";

export function Modal({
  title,
  onClose,
  children,
  size = "lg",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "lg" | "xl";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-[fadeIn_.15s_ease]"
        onClick={onClose}
      />
      <div
        className={`glass-2 relative z-10 w-full ${
          size === "xl" ? "max-w-3xl" : "max-w-lg"
        } max-h-[88vh] overflow-y-auto rounded-3xl p-6 shadow-2xl animate-[popIn_.18s_cubic-bezier(0.16,1,0.3,1)]`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-fg">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition hover:bg-surface-2 hover:text-fg"
          >
            <IconX className="text-[18px]" />
          </button>
        </div>
        {children}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(8px) scale(.98) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>
    </div>
  );
}
