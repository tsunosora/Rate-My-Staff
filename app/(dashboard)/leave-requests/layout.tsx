import { guardManager } from "@/lib/guard";

export default async function LeaveRequestsLayout({ children }: { children: React.ReactNode }) {
  await guardManager();
  return <>{children}</>;
}
