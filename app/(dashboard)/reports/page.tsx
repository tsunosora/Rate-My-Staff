"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconDownload, IconChevronLeft, IconChevronRight, IconArrowRight } from "@/components/ui/icons";

type Assessment = {
  id: number;
  assessmentDate: string;
  period: string | null;
  totalScore: string | number | null;
  grade: string | null;
  employee: { fullName: string; employeeCode: string; department: { name: string } | null };
  template: { name: string };
};
type Summary = { total: number; average: number; highPerformers: number; needsImprovement: number };
type Ref = { id: number; name?: string };
type Detail = Assessment & {
  evaluatorNotes: string | null;
  developmentPlan: string | null;
  evaluator: { name: string } | null;
  scores: { id: number; score: number; weightedValue: string | number; indicator: { name: string; category: string; weight: string | number } }[];
};

function softChip(color: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${color} 16%, transparent)`, color };
}
function scoreColor(s: number) {
  return s >= 4 ? "var(--success)" : s >= 3 ? "var(--warning)" : "var(--danger)";
}

export default function ReportsPage() {
  const [rows, setRows] = useState<Assessment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [departments, setDepartments] = useState<Ref[]>([]);
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ page: String(page) });
    if (department) q.set("department", department);
    if (category) q.set("performance_category", category);
    if (search) q.set("search", search);
    const res = await api<{ data: Assessment[]; total: number; summary: Summary }>(`/api/reports?${q}`);
    setRows(res.data);
    setTotal(res.total);
    setSummary(res.summary);
  }, [page, department, category, search]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api<Ref[]>("/api/departments").then(setDepartments);
  }, []);
  // Pra-isi pencarian dari URL (mis. dari kartu skor di dashboard).
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("search");
    if (s) setSearch(s);
  }, []);

  function exportUrl(kind: "excel" | "pdf") {
    const q = new URLSearchParams();
    if (department) q.set("department", department);
    if (category) q.set("performance_category", category);
    if (search) q.set("search", search);
    return `/api/reports/export-${kind}?${q}`;
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Laporan Penilaian</h1>
          <p className="mt-0.5 text-sm text-muted">Rekap hasil penilaian kinerja karyawan.</p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl("excel")} className="btn-ghost h-10"><IconDownload className="text-[17px]" /> Excel</a>
          <a href={exportUrl("pdf")} className="btn-ghost h-10"><IconDownload className="text-[17px]" /> PDF</a>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total penilaian" value={summary.total} tone="var(--primary)" />
          <Stat label="Rata-rata skor" value={summary.average.toFixed(2)} tone="var(--info)" />
          <Stat label="High performer" value={summary.highPerformers} tone="var(--success)" />
          <Stat label="Perlu perbaikan" value={summary.needsImprovement} tone="var(--danger)" />
        </div>
      )}

      <div className="glass flex flex-wrap gap-3 rounded-2xl p-3 text-sm">
        <input className="input h-10 flex-1" placeholder="Cari nama…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <select className="input h-10 w-auto" value={department} onChange={(e) => { setPage(1); setDepartment(e.target.value); }}>
          <option value="">Semua dept</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input h-10 w-auto" value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }}>
          <option value="">Semua kategori</option>
          <option value="high">High (≥4.0)</option>
          <option value="average">Average (3.0–3.99)</option>
          <option value="needs_improvement">Perlu perbaikan (&lt;3.0)</option>
        </select>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Karyawan</th>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Periode</th>
                <th className="px-4 py-3 font-medium">Skor</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-subtle">Belum ada penilaian selesai.</td></tr>
              ) : (
                rows.map((a) => {
                  const s = Number(a.totalScore ?? 0);
                  return (
                    <tr key={a.id} className="border-t border-border transition hover:bg-surface">
                      <td className="px-4 py-3 tabular text-muted">{new Date(a.assessmentDate).toLocaleDateString("id-ID")}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-fg">{a.employee.fullName}</div>
                        <div className="text-xs text-subtle">{a.employee.department?.name ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-muted">{a.template.name}</td>
                      <td className="px-4 py-3 text-muted">{a.period ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="tabular font-semibold" style={{ color: scoreColor(s) }}>{s.toFixed(2)}</span>
                        {a.grade && <span className="ml-1 text-xs text-subtle">{a.grade}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={async () => setDetail(await api<Detail>(`/api/reports/assessment/${a.id}`))}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Detail <IconArrowRight className="text-[13px]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-muted">
          <span className="tabular">{total} penilaian</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong transition hover:bg-surface-2 disabled:opacity-40">
              <IconChevronLeft className="text-[16px]" />
            </button>
            <span className="tabular px-1">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong transition hover:bg-surface-2 disabled:opacity-40">
              <IconChevronRight className="text-[16px]" />
            </button>
          </div>
        </div>
      </div>

      {detail && (
        <Modal title={`Penilaian — ${detail.employee.fullName}`} onClose={() => setDetail(null)} size="xl">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
              <span className="text-muted">Template</span>
              <span className="text-fg">{detail.template.name}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
              <span className="text-muted">Skor total</span>
              <span className="tabular font-semibold" style={{ color: scoreColor(Number(detail.totalScore ?? 0)) }}>
                {Number(detail.totalScore ?? 0).toFixed(2)} <span className="text-subtle">({detail.grade})</span>
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                    <th className="px-3 py-2 font-medium">Indikator</th>
                    <th className="px-3 py-2 font-medium">Bobot</th>
                    <th className="px-3 py-2 font-medium">Skor</th>
                    <th className="px-3 py-2 font-medium">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.scores.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 text-fg">{s.indicator.name}</td>
                      <td className="px-3 py-2 tabular text-muted">{Number(s.indicator.weight)}%</td>
                      <td className="px-3 py-2 tabular text-muted">{s.score}</td>
                      <td className="px-3 py-2 tabular text-muted">{Number(s.weightedValue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detail.evaluatorNotes && (
              <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
                <div className="text-xs text-subtle">Catatan evaluator</div>
                <div className="mt-0.5 text-fg">{detail.evaluatorNotes}</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="tabular mt-1 font-display text-2xl font-extrabold" style={{ color: tone }}>{value}</div>
    </div>
  );
}
