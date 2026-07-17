"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";

type Notif = { id: string; type: string; data: { title?: string; message?: string }; readAt: string | null };

export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    const res = await api<{ items: Notif[]; unread: number }>("/api/notifications");
    setItems(res.items);
    setUnread(res.unread);
  }
  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    await api("/api/notifications/mark-all-read", { method: "POST" });
    load();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 hover:bg-slate-100" aria-label="Notifikasi">
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-semibold text-slate-700">Notifikasi</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-indigo-600 hover:underline">
                Tandai dibaca
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-slate-400">Tidak ada notifikasi.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`rounded-lg px-2 py-2 text-sm ${n.readAt ? "text-slate-500" : "bg-indigo-50 text-slate-800"}`}>
                  <div className="font-medium">{n.data.title ?? n.type}</div>
                  {n.data.message && <div className="text-xs text-slate-500">{n.data.message}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
