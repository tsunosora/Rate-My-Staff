"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";

type Scan = {
  id: number;
  scanDate: string;
  scanType: string | null;
  status: string;
  machineName: string | null;
  employee: { fullName: string; employeeCode: string };
};
type Metrics = { present: number; late: number; absent: number; recentLates: { name: string; minutes: number }[] };
type Emp = { id: number; fullName: string; employeeCode: string };

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const [date, setDate] = useState(todayStr());
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Scan[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ employeeId: "", clockIn: "", clockOut: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams({ date, page: String(page) });
    if (status !== "all") q.set("status", status);
    const [list, m] = await Promise.all([
      api<{ data: Scan[]; total: number }>(`/api/attendance?${q}`),
      api<Metrics>(`/api/attendance/metrics?date=${date}`),
    ]);
    setRows(list.data);
    setTotal(list.total);
    setMetrics(m);
  }, [date, status, page]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api<Emp[]>("/api/assessments/employees").then(setEmployees);
  }, []);

  async function saveManual() {
    setError("");
    try {
      await api("/api/attendance/manual", {
        method: "POST",
        body: JSON.stringify({
          employeeId: Number(form.employeeId),
          date,
          clockIn: form.clockIn || null,
          clockOut: form.clockOut || null,
        }),
      });
      setModal(false);
      setForm({ employeeId: "", clockIn: "", clockOut: "" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Absensi</h1>
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={date} onChange={(e) => { setPage(1); setDate(e.target.value); }} />
          <button onClick={() => setModal(true)} className="btn-primary">
            + Manual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Hadir" value={metrics?.present ?? 0} color="text-green-600" />
        <MetricCard label="Terlambat" value={metrics?.late ?? 0} color="text-yellow-600" />
        <MetricCard label="Absen" value={metrics?.absent ?? 0} color="text-red-600" />
        <MetricCard label="Telat terbaru" value={metrics?.recentLates.length ?? 0} color="text-slate-600" />
      </div>

      <div className="flex gap-2">
        <select className="input max-w-xs" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="all">Semua status</option>
          <option value="on_time">Tepat waktu</option>
          <option value="late">Terlambat</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Karyawan</th>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Mesin</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada data.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.employee.fullName}</div>
                    <div className="text-xs text-slate-400">{r.employee.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3">{new Date(r.scanDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-3">{r.scanType === "in" ? "Masuk" : r.scanType === "out" ? "Keluar" : r.scanType}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "late" ? "bg-yellow-100 text-yellow-700" : r.status === "on_time" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.machineName ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} scan</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">Prev</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>

      {modal && (
        <Modal title="Absensi Manual" onClose={() => setModal(false)}>
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600">Karyawan *</span>
              <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">— pilih —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Jam masuk</span>
                <input type="time" className="input" value={form.clockIn} onChange={(e) => setForm({ ...form, clockIn: e.target.value })} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Jam pulang</span>
                <input type="time" className="input" value={form.clockOut} onChange={(e) => setForm({ ...form, clockOut: e.target.value })} />
              </label>
            </div>
            <p className="text-xs text-slate-400">Tanggal: {date}</p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
            <button onClick={saveManual} className="btn-primary">Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
