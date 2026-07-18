"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";

type Row = {
  employeeId: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  status: string;
  fullName: string;
  department: string | null;
};
type Summary = {
  totalRows: number;
  late: number;
  absent: number;
  onTime: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
};
type Ref = { id: number; name?: string; fullName?: string };

const todayStr = () => new Date().toISOString().slice(0, 10);
function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function AttendanceReportPage() {
  const [startDate, setStartDate] = useState(weekAgo());
  const [endDate, setEndDate] = useState(todayStr());
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [departments, setDepartments] = useState<Ref[]>([]);
  const [employees, setEmployees] = useState<Ref[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({ clockIn: "", clockOut: "" });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (departmentId) q.set("department_id", departmentId);
    if (employeeId) q.set("employee_id", employeeId);
    try {
      const res = await api<{ rows: Row[]; summary: Summary }>(`/api/attendance/report?${q}`);
      setRows(statusFilter ? res.rows.filter((r) => r.status === statusFilter) : res.rows);
      setSummary(res.summary);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, departmentId, employeeId, statusFilter]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api<Ref[]>("/api/departments").then(setDepartments);
    api<Ref[]>("/api/assessments/employees").then(setEmployees);
  }, []);

  const exportUrl = (() => {
    const q = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (departmentId) q.set("department_id", departmentId);
    if (employeeId) q.set("employee_id", employeeId);
    return `/api/attendance/report/export-excel?${q}`;
  })();

  function openEditRow(r: Row) {
    setEditRow(r);
    setEditForm({ clockIn: r.clockIn ?? "", clockOut: r.clockOut ?? "" });
    setEditError("");
  }

  async function saveEdit() {
    if (!editRow) return;
    setSaving(true);
    setEditError("");
    try {
      await api("/api/attendance/manual", {
        method: "POST",
        body: JSON.stringify({
          employeeId: editRow.employeeId,
          date: editRow.date,
          clockIn: editForm.clockIn || null,
          clockOut: editForm.clockOut || null,
        }),
      });
      setEditRow(null);
      load();
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Laporan Absensi</h1>
        <a href={exportUrl} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
          Export Excel
        </a>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 shadow-sm text-sm">
        <label className="space-y-1">
          <span className="block text-slate-500">Dari</span>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="block text-slate-500">Sampai</span>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Semua dept</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Semua karyawan</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Semua status</option>
          <option value="on_time">Tepat waktu</option>
          <option value="late">Terlambat</option>
          <option value="absent">Absen</option>
        </select>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Tepat waktu" value={summary.onTime} />
          <Stat label="Terlambat" value={`${summary.late} (${summary.totalLateMinutes}m)`} />
          <Stat label="Absen" value={summary.absent} />
          <Stat label="Total lembur" value={`${summary.totalOvertimeMinutes}m`} />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Karyawan</th>
              <th className="px-4 py-3">Masuk</th>
              <th className="px-4 py-3">Pulang</th>
              <th className="px-4 py-3">Telat</th>
              <th className="px-4 py-3">Lembur</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Memuat…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Tidak ada data.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.employeeId}-${r.date}-${i}`} className="border-t border-slate-100">
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.fullName}</div>
                    <div className="text-xs text-slate-400">{r.department ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">{r.clockIn ?? "—"}</td>
                  <td className="px-4 py-3">{r.clockOut ?? "—"}</td>
                  <td className="px-4 py-3">{r.lateMinutes ? `${r.lateMinutes}m` : "—"}</td>
                  <td className="px-4 py-3">{r.overtimeMinutes ? `${r.overtimeMinutes}m` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "late" ? "bg-yellow-100 text-yellow-700" : r.status === "on_time" ? "bg-green-100 text-green-700" : r.status === "absent" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEditRow(r)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editRow && (
        <Modal title="Edit Absensi" onClose={() => setEditRow(null)}>
          {editError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{editError}</div>}
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-600">Karyawan: </span>
              <span className="font-medium text-slate-800">{editRow.fullName}</span>
              <span className="text-slate-400"> · {editRow.date}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-slate-600">Jam masuk</span>
                <input type="time" className="input" value={editForm.clockIn} onChange={(e) => setEditForm({ ...editForm, clockIn: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-slate-600">Jam pulang</span>
                <input type="time" className="input" value={editForm.clockOut} onChange={(e) => setEditForm({ ...editForm, clockOut: e.target.value })} />
              </label>
            </div>
            <p className="text-xs text-slate-400">Status, telat, lembur & shift (mis. longshift) dihitung ulang otomatis dari jam ini.</p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setEditRow(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
            <button onClick={saveEdit} disabled={saving || (!editForm.clockIn && !editForm.clockOut)} className="btn-primary disabled:opacity-40">
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
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
