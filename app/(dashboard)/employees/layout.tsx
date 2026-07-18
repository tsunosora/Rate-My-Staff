import { guardManager } from "@/lib/guard";

export default async function EmployeesLayout({ children }: { children: React.ReactNode }) {
  await guardManager();
  return children;
}
