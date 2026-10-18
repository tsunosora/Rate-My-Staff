import { guardManager } from "@/lib/guard";

export default async function UpahLayout({ children }: { children: React.ReactNode }) {
  await guardManager();
  return children;
}
