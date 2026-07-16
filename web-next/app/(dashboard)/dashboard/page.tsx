import { auth, signOut } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-600">
          Masuk sebagai <b>{session?.user?.name}</b> ({session?.user?.email}) —
          role <b>{session?.user?.role}</b>
        </p>
        <p className="text-sm text-slate-400">
          Placeholder — layout & metrics dibangun di Fase 4 & 12.
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Keluar
          </button>
        </form>
      </div>
    </main>
  );
}
