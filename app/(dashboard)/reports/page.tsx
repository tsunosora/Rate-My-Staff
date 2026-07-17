"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";

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

  function exportUrl(kind: "excel" | "pdf") {
    const q = new URLSearchParams();
    if (department) q.set("department", department);
    if (category) q.set("performance_category", category);
    if (search) q.set("search", search);
    return `/api/reports/export-${kind}?${q}`;
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Laporan Penilaian</h1>
        <div className="flex gap-2">
          <a href={exportUrl("excel")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
            Export Excel
          </a>
          <a href={exportUrl("pdf")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
            Export PDF
          </a>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total penilaian" value={summary.total} />
          <Stat label="Rata-rata skor" value={summary.average.toFixed(2)} />
          <Stat label="High performer" value={summary.highPerformers} />
          <Stat label="Perlu perbaikan" value={summary.needsImprovement} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl bg-white p-3 shadow-sm text-sm">
        <input className="input flex-1" placeholder="Cari nama…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <select className="input" value={department} onChange={(e) => { setPage(1); setDepartment(e.target.value); }}>
          <option value="">Semua dept</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input" value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }}>
          <option value="">Semua kategori</option>
          <option value="high">High (≥4.0)</option>
          <option value="average">Average (3.0–3.99)</option>
          <option value="needs_improvement">Perlu perbaikan (&lt;3.0)</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Karyawan</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3">Skor</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada penilaian selesai.</td></tr>
            ) : (
              rows.map((a) => {
                const s = Number(a.totalScore ?? 0);
                return (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{new Date(a.assessmentDate).toLocaleDateString("id-ID")}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.employee.fullName}</div>
                      <div className="text-xs text-slate-400">{a.employee.department?.name ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">{a.template.name}</td>
                    <td className="px-4 py-3">{a.period ?? "—"}</td>
                    <td className={`px-4 py-3 font-medium ${s >= 4 ? "text-green-600" : s >= 3 ? "text-yellow-600" : "text-red-600"}`}>
                      {s.toFixed(2)} <span className="text-xs text-slate-400">{a.grade}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={async () => setDetail(await api<Detail>(`/api/reports/assessment/${a.id}`))}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} penilaian</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">Prev</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>

      {detail && (
        <Modal title={`Penilaian — ${detail.employee.fullName}`} onClose={() => setDetail(null)}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Template</span>
              <span>{detail.template.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Skor total</span>
              <span className="font-semibold">{Number(detail.totalScore ?? 0).toFixed(2)} ({detail.grade})</span>
            </div>
            <table className="mt-2 w-full">
              <thead className="text-left text-xs text-slate-400">
                <tr><th className="py-1">Indikator</th><th>Bobot</th><th>Skor</th><th>Nilai</th></tr>
              </thead>
              <tbody>
                {detail.scores.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-1">{s.indicator.name}</td>
                    <td>{Number(s.indicator.weight)}%</td>
                    <td>{s.score}</td>
                    <td>{Number(s.weightedValue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.evaluatorNotes && (
              <div className="mt-2">
                <div className="text-xs text-slate-400">Catatan evaluator</div>
                <div>{detail.evaluatorNotes}</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
