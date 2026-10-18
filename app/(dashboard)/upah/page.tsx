import { RekapUpah } from "@/components/upah/RekapUpah";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const satu = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** Rekap upah tukang per periode (hr.upah). Periode bawaan minggu ini, Senin–Minggu. */
export default async function UpahPage({ searchParams }: Props) {
  const q = await searchParams;
  return <RekapUpah awal={{ dari: satu(q.dari), sampai: satu(q.sampai), timId: satu(q.timId) }} />;
}
