import { guardAdmin } from "@/lib/guard";

export default async function LanggananLayout({ children }: { children: React.ReactNode }) {
  await guardAdmin();
  return children;
}
