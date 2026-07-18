import { IconAlert } from "@/components/ui/icons";

export default function LinkExpiredPage() {
  return (
    <main className="ambient relative flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="glass-2 relative z-10 w-full max-w-md rounded-3xl p-6 text-center shadow-2xl sm:p-8">
        <span
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-warning"
          style={{ background: "color-mix(in oklab, var(--warning) 16%, transparent)" }}
        >
          <IconAlert className="text-[26px]" />
        </span>
        <h2 className="font-display text-xl font-bold text-fg">Tautan Kadaluarsa</h2>
        <p className="mt-1 text-muted">Tautan ini sudah tidak berlaku. Hubungi HR untuk tautan baru.</p>
      </div>
    </main>
  );
}
