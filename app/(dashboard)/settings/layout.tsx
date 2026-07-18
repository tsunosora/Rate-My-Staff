import { guardManager } from "@/lib/guard";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await guardManager();
  return children;
}
