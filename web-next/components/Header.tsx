import { signOut } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";

export function Header({ name, role }: { name?: string | null; role?: string | null }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur">
      <div className="text-sm text-slate-500">Panel Admin</div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="text-right">
          <div className="text-sm font-medium text-slate-800">{name}</div>
          <div className="text-xs text-slate-400">{role}</div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            Keluar
          </button>
        </form>
      </div>
    </header>
  );
}
