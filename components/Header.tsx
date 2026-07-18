import { signOut } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LiveClock } from "@/components/LiveClock";
import { MobileSidebar } from "@/components/MobileSidebar";
import { IconSearch, IconLogout } from "@/components/ui/icons";

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function Header({ name, role }: { name?: string | null; role?: string | null }) {
  return (
    <header className="glass sticky top-0 z-30 flex items-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-6">
      <MobileSidebar />

      {/* Global search (scaffold for upcoming team/project search) */}
      <label className="relative hidden max-w-sm flex-1 items-center md:flex">
        <IconSearch className="pointer-events-none absolute left-3 text-[17px] text-subtle" />
        <input
          type="search"
          placeholder="Cari orang, proyek, absensi…"
          className="input h-10 pl-10"
        />
      </label>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <LiveClock />
        <ThemeToggle />
        <NotificationBell />

        <div className="mx-1 hidden h-8 w-px bg-border sm:block" />

        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-2 text-sm font-bold text-on-primary">
            {initials(name)}
          </span>
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-semibold text-fg">{name}</div>
            <div className="text-xs capitalize text-subtle">{role}</div>
          </div>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            aria-label="Keluar"
            title="Keluar"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border-strong text-muted transition hover:border-danger hover:text-danger active:scale-95"
          >
            <IconLogout className="text-[18px]" />
          </button>
        </form>
      </div>
    </header>
  );
}
