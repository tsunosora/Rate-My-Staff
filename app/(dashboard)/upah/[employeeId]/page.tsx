import { auth } from "@/lib/auth";
import { canAdminUsers } from "@/lib/rbac";
import { RincianUpah } from "@/components/upah/RincianUpah";

type Props = {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const satu = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** Rincian upah satu orang satu periode: per hari, penyesuaian, tandai dibayar, slip. */
export default async function RincianUpahPage({ params, searchParams }: Props) {
  const [{ employeeId }, q, session] = await Promise.all([params, searchParams, auth()]);
  return (
    <RincianUpah
      employeeId={Number(employeeId)}
      dari={satu(q.dari)}
      sampai={satu(q.sampai)}
      bolehBatal={canAdminUsers(session?.user?.role)}
    />
  );
}
