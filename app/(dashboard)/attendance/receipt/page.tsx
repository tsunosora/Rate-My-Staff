"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconDownload, IconPencil, IconCheck } from "@/components/ui/icons";

type ReceiptDayRow = {
  date: string;
  dayName: string;
  isHoliday: boolean;
  clockIn: string | null;
  clockOut: string | null;
  shiftLabel: string;
  lateMinutes: number;
  overtimeHours: number;
  ls: number;
  lc: number;
  ll: number;
  worked: boolean;
};
type ReceiptData = {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  monthLabel: string;
  rows: ReceiptDayRow[];
  totals: {
    lsCount: number;
    lcHours: number;
    llCount: number;
    dailyAmount: number;
    holidayAmount: number;
    cetakAmount: number;
    grandTotal: number;
  };
  rates: { daily: number; holiday: number; cetak: number };
};
type SummaryRow = {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  totals: ReceiptData["totals"];
};
type Ref = { id: number; name?: string; fullName?: string };

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const NOW = new Date();
const YEARS = Array.from({ length: 7 }, (_, i) => NOW.getFullYear() - 5 + i);

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function AttendanceReceiptPage() {
  const [month, setMonth] = useState(NOW.getMonth() + 1); // 1-12
  const [year, setYear] = useState(NOW.getFullYear());
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employees, setEmployees] = useState<Ref[]>([]);
  const [departments, setDepartments] = useState<Ref[]>([]);
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryRow[] | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    api<Ref[]>("/api/departments").then(setDepartments).catch(() => {});
    api<Ref[]>("/api/assessments/employees").then(setEmployees).catch(() => {});
  }, []);

  const reqId = useRef(0);
  const load = useCallback(async () => {
    if (!employeeId) return; // pratinjau disembunyikan oleh render guard; data lama diabaikan
    const id = ++reqId.current;
    setLoading(true);
    const q = new URLSearchParams({ employee_id: employeeId, year: String(year), month: String(month) });
    try {
      const res = await api<ReceiptData>(`/api/attendance/receipt?${q}`);
      if (id !== reqId.current) return;
      setData(res);
    } catch {
      if (id === reqId.current) setData(null);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [employeeId, year, month]);
  useEffect(() => {
    load();
  }, [load]);

  // Pratinjau daftar karyawan (rekap) saat belum memilih satu karyawan — sebelum export massal.
  const loadSummary = useCallback(async () => {
    if (employeeId) return;
    const id = ++reqId.current;
    setSummaryLoading(true);
    const q = new URLSearchParams({ year: String(year), month: String(month) });
    if (departmentId) q.set("department_id", departmentId);
    try {
      const res = await api<SummaryRow[]>(`/api/attendance/receipt/summary?${q}`);
      if (id !== reqId.current) return;
      setSummary(res);
    } catch {
      if (id === reqId.current) setSummary(null);
    } finally {
      if (id === reqId.current) setSummaryLoading(false);
    }
  }, [employeeId, year, month, departmentId]);
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [exportMsg, setExportMsg] = useState("");

  async function downloadExport(kind: "pdf" | "excel") {
    const q = new URLSearchParams({ year: String(year), month: String(month) });
    if (employeeId) q.set("employee_id", employeeId);
    else if (departmentId) q.set("department_id", departmentId);
    const ep = kind === "pdf" ? "export-pdf" : "export-excel";
    const ext = kind === "pdf" ? "pdf" : "xlsx";
    const scope = employeeId ? `struk-${employeeId}` : "struk-massal";
    setExporting(kind);
    setExportMsg("");
    try {
      const res = await fetch(`/api/attendance/receipt/${ep}?${q}`, { credentials: "same-origin" });
      if (!res.ok) {
        const msg =
          res.status === 404
            ? "Tidak ada data untuk periode/filter ini."
            : `Gagal export (${res.status}).`;
        setExportMsg(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${scope}-${year}-${month}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportMsg("Gagal export. Coba lagi.");
    } finally {
      setExporting(null);
    }
  }

  const [editRow, setEditRow] = useState<ReceiptDayRow | null>(null);
  const [editForm, setEditForm] = useState({ clockIn: "", clockOut: "" });
  const [editErr, setEditErr] = useState("");
  const [saving, setSaving] = useState(false);

  function openEdit(r: ReceiptDayRow) {
    setEditRow(r);
    setEditForm({ clockIn: r.clockIn ?? "", clockOut: r.clockOut ?? "" });
    setEditErr("");
  }

  async function saveEdit() {
    if (!editRow || !data) return;
    setSaving(true);
    setEditErr("");
    try {
      await api("/api/attendance/manual", {
        method: "POST",
        body: JSON.stringify({
          employeeId: data.employeeId,
          date: editRow.date,
          clockIn: editForm.clockIn || null,
          clockOut: editForm.clockOut || null,
        }),
      });
      setEditRow(null);
      load(); // muat ulang struk: jam, shift, LS/LC/LL & total dihitung ulang
    } catch (e) {
      setEditErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const scopeLabel = employeeId ? "" : " (massal)";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Struk Absensi</h1>
          <p className="mt-0.5 text-sm text-muted">
            Rekap bulanan per karyawan (LS/LC/LL) — export PDF atau Excel, satuan maupun massal.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-2">
            <button
              onClick={() => downloadExport("pdf")}
              disabled={exporting !== null}
              className="btn-ghost h-10 disabled:opacity-50"
            >
              <IconDownload className="text-[17px]" /> {exporting === "pdf" ? "Menyiapkan…" : `PDF${scopeLabel}`}
            </button>
            <button
              onClick={() => downloadExport("excel")}
              disabled={exporting !== null}
              className="btn-ghost h-10 disabled:opacity-50"
            >
              <IconDownload className="text-[17px]" /> {exporting === "excel" ? "Menyiapkan…" : `Excel${scopeLabel}`}
            </button>
          </div>
          {exportMsg && <span className="text-xs text-danger">{exportMsg}</span>}
        </div>
      </div>

      <div className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4 text-sm">
        <label className="space-y-1.5">
          <span className="block font-medium text-muted">Bulan</span>
          <select className="input h-10 w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block font-medium text-muted">Tahun</span>
          <select className="input h-10 w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block font-medium text-muted">Karyawan</span>
          <select className="input h-10 w-auto" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">— (pilih untuk pratinjau / kosong = massal)</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.fullName}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block font-medium text-muted">Departemen (massal)</span>
          <select
            className="input h-10 w-auto"
            value={departmentId}
            disabled={Boolean(employeeId)}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Semua dept</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>

      {!employeeId ? (
        summaryLoading ? (
          <div className="glass rounded-2xl p-10 text-center text-subtle">Memuat daftar karyawan…</div>
        ) : !summary || summary.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-subtle">
            Tidak ada karyawan untuk periode/filter ini.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              Pratinjau {summary.length} karyawan — klik <strong className="text-fg">Lihat</strong> untuk
              detail &amp; edit jam, atau <strong className="text-fg">export massal</strong> di atas.
            </p>
            <div className="glass overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                      <th className="px-4 py-3 font-medium">Karyawan</th>
                      <th className="px-4 py-3 text-right font-medium">LS</th>
                      <th className="px-4 py-3 text-right font-medium">LC</th>
                      <th className="px-4 py-3 text-right font-medium">LL</th>
                      <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                      <th className="px-4 py-3 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((s) => (
                      <tr key={s.employeeId} className="border-t border-border transition hover:bg-surface">
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">{s.employeeName}</div>
                          <div className="text-xs text-subtle">{s.department ?? s.employeeCode}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular text-muted">{s.totals.lsCount || "—"}</td>
                        <td className="px-4 py-3 text-right tabular text-muted">{s.totals.lcHours || "—"}</td>
                        <td className="px-4 py-3 text-right tabular text-muted">{s.totals.llCount || "—"}</td>
                        <td className="px-4 py-3 text-right tabular font-medium text-fg">{rp(s.totals.grandTotal)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setEmployeeId(String(s.employeeId))}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-muted transition hover:border-primary hover:text-primary"
                          >
                            Lihat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border-strong">
                      <td className="px-4 py-3 font-semibold text-fg">Total ({summary.length})</td>
                      <td className="px-4 py-3 text-right tabular text-muted">
                        {summary.reduce((a, s) => a + s.totals.lsCount, 0)}
                      </td>
                      <td className="px-4 py-3 text-right tabular text-muted">
                        {Math.round(summary.reduce((a, s) => a + s.totals.lcHours, 0) * 100) / 100}
                      </td>
                      <td className="px-4 py-3 text-right tabular text-muted">
                        {summary.reduce((a, s) => a + s.totals.llCount, 0)}
                      </td>
                      <td className="px-4 py-3 text-right tabular font-bold text-primary">
                        {rp(summary.reduce((a, s) => a + s.totals.grandTotal, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )
      ) : loading ? (
        <div className="glass rounded-2xl p-10 text-center text-subtle">Memuat…</div>
      ) : !data ? (
        <div className="glass rounded-2xl p-10 text-center text-subtle">Tidak ada data.</div>
      ) : (
        <div className="space-y-4">
          <div className="glass flex items-center justify-between gap-3 rounded-2xl px-5 py-4">
            <div>
              <div className="font-display text-lg font-bold text-fg">{data.employeeName}</div>
              <div className="text-sm text-muted">
                {(data.department ?? "—") + " · " + data.monthLabel + " · " + data.employeeCode}
              </div>
            </div>
            <button onClick={() => setEmployeeId("")} className="btn-ghost h-9 shrink-0 text-sm">
              ← Semua karyawan
            </button>
          </div>

          <div className="glass overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                    <th className="px-3 py-3 font-medium">Hari</th>
                    <th className="px-3 py-3 font-medium">Tanggal</th>
                    <th className="px-3 py-3 font-medium">Masuk</th>
                    <th className="px-3 py-3 font-medium">Pulang</th>
                    <th className="px-3 py-3 font-medium">Shift</th>
                    <th className="px-3 py-3 text-right font-medium">Telat</th>
                    <th className="px-3 py-3 text-right font-medium">Lembur</th>
                    <th className="px-3 py-3 text-right font-medium">LS</th>
                    <th className="px-3 py-3 text-right font-medium">LC</th>
                    <th className="px-3 py-3 text-right font-medium">LL</th>
                    <th className="px-3 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr
                      key={r.date}
                      className="border-t border-border"
                      style={r.isHoliday && !r.worked ? { background: "color-mix(in oklab, var(--danger) 14%, transparent)" } : undefined}
                    >
                      <td className="px-3 py-2.5 text-muted">{r.dayName}</td>
                      <td className="px-3 py-2.5 tabular text-muted">{r.date}</td>
                      <td className="px-3 py-2.5 tabular text-muted">{r.clockIn ?? "—"}</td>
                      <td className="px-3 py-2.5 tabular text-muted">{r.clockOut ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted">{r.shiftLabel}</td>
                      <td className="px-3 py-2.5 text-right tabular text-muted">{r.lateMinutes || "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular text-muted">{r.overtimeHours ? r.overtimeHours.toFixed(2) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular text-fg">{r.ls || "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular text-fg">{r.lc ? r.lc.toFixed(2) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular text-fg">{r.ll || "—"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-muted transition hover:border-primary hover:text-primary"
                        >
                          <IconPencil className="text-[14px]" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass grid gap-4 rounded-2xl p-5 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <SubTotal label="Lembur Harian" rate={data.rates.daily} qty={data.totals.lsCount} amount={data.totals.dailyAmount} />
              <SubTotal label="Lembur Libur" rate={data.rates.holiday} qty={data.totals.llCount} amount={data.totals.holidayAmount} />
              <SubTotal label="Lembur Cetak" rate={data.rates.cetak} qty={data.totals.lcHours} amount={data.totals.cetakAmount} />
            </div>
            <div className="flex flex-col items-end justify-center rounded-xl border border-border bg-surface p-5">
              <span className="text-sm text-muted">Jumlah</span>
              <span className="tabular font-display text-3xl font-extrabold text-primary">{rp(data.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {editRow && data && (
        <Modal title="Edit Jam Absensi" onClose={() => setEditRow(null)}>
          {editErr && (
            <div
              className="mb-3 rounded-xl px-3 py-2.5 text-sm text-danger"
              style={{ background: "color-mix(in oklab, var(--danger) 16%, transparent)" }}
            >
              {editErr}
            </div>
          )}
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
              <span className="text-muted">Karyawan: </span>
              <span className="font-medium text-fg">{data.employeeName}</span>
              <span className="text-subtle"> · {editRow.dayName}, {editRow.date}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="font-medium text-muted">Jam masuk</span>
                <input
                  type="time"
                  className="input"
                  value={editForm.clockIn}
                  onChange={(e) => setEditForm({ ...editForm, clockIn: e.target.value })}
                />
              </label>
              <label className="space-y-1.5">
                <span className="font-medium text-muted">Jam pulang</span>
                <input
                  type="time"
                  className="input"
                  value={editForm.clockOut}
                  onChange={(e) => setEditForm({ ...editForm, clockOut: e.target.value })}
                />
              </label>
            </div>
            <p className="text-xs text-subtle">
              Shift, telat, lembur &amp; LS/LC/LL dihitung ulang otomatis dari jam ini. Kosongkan salah
              satu bila hanya ingin mengisi satu sisi.
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setEditRow(null)} className="btn-ghost">
              Batal
            </button>
            <button
              onClick={saveEdit}
              disabled={saving || (!editForm.clockIn && !editForm.clockOut)}
              className="btn-primary disabled:opacity-40"
            >
              <IconCheck className="text-[16px]" /> {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SubTotal({ label, rate, qty, amount }: { label: string; rate: number; qty: number; amount: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="tabular text-xs text-subtle">
        {`Rp${rate.toLocaleString("id-ID")}`} × {qty}
      </span>
      <span className="tabular font-medium text-fg">{`Rp${amount.toLocaleString("id-ID")}`}</span>
    </div>
  );
}
