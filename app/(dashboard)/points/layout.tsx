import { guardManager } from "@/lib/guard";

export default async function PointsLayout({ children }: { children: React.ReactNode }) {
  await guardManager();
  return <>{children}</>;
}
