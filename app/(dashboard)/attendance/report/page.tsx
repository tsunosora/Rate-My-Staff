"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconDownload, IconPencil, IconCheck } from "@/components/ui/icons";

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

function softChip(color: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${color} 16%, transparent)`, color };
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
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Laporan Absensi</h1>
          <p className="mt-0.5 text-sm text-muted">Rekap kehadiran per rentang tanggal.</p>
        </div>
        <a href={exportUrl} className="btn-ghost h-10">
          <IconDownload className="text-[17px]" /> Export Excel
        </a>
      </div>

      <div className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4 text-sm">
        <label className="space-y-1.5">
          <span className="block font-medium text-muted">Dari</span>
          <input type="date" className="input h-10 w-auto" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="block font-medium text-muted">Sampai</span>
          <input type="date" className="input h-10 w-auto" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="block font-medium text-muted">Departemen</span>
          <select className="input h-10 w-auto" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Semua dept</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block font-medium text-muted">Karyawan</span>
          <select className="input h-10 w-auto" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Semua karyawan</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block font-medium text-muted">Status</span>
          <select className="input h-10 w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Semua status</option>
            <option value="on_time">Tepat waktu</option>
            <option value="late">Terlambat</option>
            <option value="absent">Absen</option>
          </select>
        </label>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Tepat waktu" value={summary.onTime} tone="var(--success)" />
          <Stat label="Terlambat" value={`${summary.late} (${summary.totalLateMinutes}m)`} tone="var(--warning)" />
          <Stat label="Absen" value={summary.absent} tone="var(--danger)" />
          <Stat label="Total lembur" value={`${summary.totalOvertimeMinutes}m`} tone="var(--info)" />
        </div>
      )}

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Karyawan</th>
                <th className="px-4 py-3 font-medium">Masuk</th>
                <th className="px-4 py-3 font-medium">Pulang</th>
                <th className="px-4 py-3 font-medium">Telat</th>
                <th className="px-4 py-3 font-medium">Lembur</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-subtle">Memuat…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-subtle">Tidak ada data.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.employeeId}-${r.date}-${i}`} className="border-t border-border transition hover:bg-surface">
                    <td className="px-4 py-3 tabular text-muted">{r.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{r.fullName}</div>
                      <div className="text-xs text-subtle">{r.department ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 tabular text-muted">{r.clockIn ?? "—"}</td>
                    <td className="px-4 py-3 tabular text-muted">{r.clockOut ?? "—"}</td>
                    <td className="px-4 py-3 tabular text-muted">{r.lateMinutes ? `${r.lateMinutes}m` : "—"}</td>
                    <td className="px-4 py-3 tabular text-muted">{r.overtimeMinutes ? `${r.overtimeMinutes}m` : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditRow(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-muted transition hover:border-primary hover:text-primary">
                        <IconPencil className="text-[14px]" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editRow && (
        <Modal title="Edit Absensi" onClose={() => setEditRow(null)}>
          {editError && <div className="mb-3 rounded-xl px-3 py-2.5 text-sm text-danger" style={softChip("var(--danger)")}>{editError}</div>}
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
              <span className="text-muted">Karyawan: </span>
              <span className="font-medium text-fg">{editRow.fullName}</span>
              <span className="text-subtle"> · {editRow.date}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="font-medium text-muted">Jam masuk</span>
                <input type="time" className="input" value={editForm.clockIn} onChange={(e) => setEditForm({ ...editForm, clockIn: e.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="font-medium text-muted">Jam pulang</span>
                <input type="time" className="input" value={editForm.clockOut} onChange={(e) => setEditForm({ ...editForm, clockOut: e.target.value })} />
              </label>
            </div>
            <p className="text-xs text-subtle">Status, telat, lembur &amp; shift (mis. longshift) dihitung ulang otomatis dari jam ini.</p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setEditRow(null)} className="btn-ghost">Batal</button>
            <button onClick={saveEdit} disabled={saving || (!editForm.clockIn && !editForm.clockOut)} className="btn-primary disabled:opacity-40">
              <IconCheck className="text-[16px]" /> {saving ? "Menyimpan…" : "Simpan"}
            </button>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: string; t: string }> = {
    on_time: { v: "var(--success)", t: "Tepat waktu" },
    late: { v: "var(--warning)", t: "Terlambat" },
    absent: { v: "var(--danger)", t: "Absen" },
    longshift: { v: "var(--primary-2)", t: "Long shift" },
  };
  const m = map[status] ?? { v: "var(--fg-subtle)", t: status };
  return <span className="badge" style={softChip(m.v)}>{m.t}</span>;
}
