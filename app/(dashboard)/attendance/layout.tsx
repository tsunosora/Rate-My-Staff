import { guardManager } from "@/lib/guard";

export default async function AttendanceLayout({ children }: { children: React.ReactNode }) {
  await guardManager();
  return children;
}
