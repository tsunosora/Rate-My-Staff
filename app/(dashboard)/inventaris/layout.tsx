import { guardManager } from "@/lib/guard";

export default async function InventarisLayout({ children }: { children: React.ReactNode }) {
  await guardManager();
  return <>{children}</>;
}
