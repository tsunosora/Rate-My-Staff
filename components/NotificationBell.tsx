"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconBell } from "@/components/ui/icons";

type Notif = { id: string; type: string; data: { title?: string; message?: string }; readAt: string | null };

export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await api<{ items: Notif[]; unread: number }>("/api/notifications");
    setItems(res.items);
    setUnread(res.unread);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAll() {
    await api("/api/notifications/mark-all-read", { method: "POST" });
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-border-strong text-muted transition hover:bg-surface-2 hover:text-fg active:scale-95"
        aria-label="Notifikasi"
      >
        <IconBell className="text-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-[color:var(--bg)]">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="glass-2 absolute right-0 z-50 mt-2 w-80 rounded-2xl p-2 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold text-fg">Notifikasi</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">
                Tandai dibaca
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-subtle">Tidak ada notifikasi.</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`mb-1 rounded-xl px-3 py-2 text-sm transition ${
                    n.readAt
                      ? "text-muted hover:bg-surface"
                      : "bg-surface-2 text-fg"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.readAt && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div>
                      <div className="font-medium">{n.data.title ?? n.type}</div>
                      {n.data.message && (
                        <div className="text-xs text-subtle">{n.data.message}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
