"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/Sidebar";
import { IconMenu, IconX } from "@/components/ui/icons";

/** Hamburger + slide-in drawer for < lg screens (desktop keeps the fixed aside). */
export function MobileSidebar({ role }: { role?: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever navigation happens.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        className="grid h-9 w-9 place-items-center rounded-xl border border-border-strong text-muted transition hover:bg-surface-2 hover:text-fg active:scale-95"
      >
        <IconMenu className="text-[19px]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-[fadeIn_.15s_ease]"
            onClick={() => setOpen(false)}
          />
          <div className="glass-2 absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto rounded-none border-y-0 border-l-0 p-4 animate-[slideIn_.2s_cubic-bezier(0.16,1,0.3,1)]">
            <button
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-subtle transition hover:bg-surface-2 hover:text-fg"
            >
              <IconX className="text-[18px]" />
            </button>
            <SidebarNav role={role} />
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes slideIn { from { transform: translateX(-100%) } to { transform: translateX(0) } }
          `}</style>
        </div>
      )}
    </div>
  );
}
