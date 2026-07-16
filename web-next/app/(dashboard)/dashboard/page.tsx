import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-slate-600">
          Masuk sebagai <b>{session?.user?.name}</b> ({session?.user?.email}) — role{" "}
          <b>{session?.user?.role}</b>
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Metrics & chart dibangun di Fase 12.
        </p>
      </div>
    </div>
  );
}
