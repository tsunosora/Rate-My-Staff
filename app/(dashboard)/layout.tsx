import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="ambient relative flex min-h-screen bg-bg">
      <Sidebar role={session.user?.role} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header name={session.user?.name} role={session.user?.role} />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
