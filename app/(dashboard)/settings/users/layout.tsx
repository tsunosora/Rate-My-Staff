import { guardAdmin } from "@/lib/guard";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  await guardAdmin();
  return children;
}
