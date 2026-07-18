"use client";

import { useCallback, useEffect, useState, type ComponentType, type SVGProps } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { AttendanceDonut } from "@/components/attendance/AttendanceDonut";
import {
  IconPlus,
  IconUpload,
  IconLink,
  IconCopy,
  IconAlert,
  IconPencil,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconClock,
  IconUsers,
} from "@/components/ui/icons";

type Scan = {
  id: number;
  employeeId: number;
  scanDate: string;
  scanType: string | null;
  status: string;
  machineName: string | null;
  employee: { fullName: string; employeeCode: string };
};
type Metrics = { present: number; late: number; absent: number; recentLates: { name: string; minutes: number }[] };
type Emp = { id: number; fullName: string; employeeCode: string };

type ImportPreviewRow = {
  pin: string; fileName: string; employeeId: number | null; employeeName: string | null;
  dateISO: string; clockIn: string | null; clockOut: string | null;
  status: string; shift: string | null; suggested: string | null; lateMinutes: number; overtimeMinutes: number;
  isHoliday: boolean; matched: boolean; conflict: boolean; existingSources: string[];
};
type ImportResult = {
  rows: ImportPreviewRow[];
  summary: { total: number; matched: number; unmatched: number; unmatchedPins: string[]; conflicts: number };
  committed: boolean; created?: number; skippedConflicts?: number; createdEmployees?: number;
};

type IncompleteRow = {
  employeeId: number; fullName: string; employeeCode: string; date: string;
  clockIn: string | null; clockOut: string | null; missing: "in" | "out"; suggested: string | null;
};

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
  const [editing, setEditing] = useState<{ employeeId: number; name: string } | null>(null);
  const [error, setError] = useState("");
  const [leaveUrl, setLeaveUrl] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [overwriteConflicts, setOverwriteConflicts] = useState(false);
  const [incomplete, setIncomplete] = useState<IncompleteRow[]>([]);
  const [completeList, setCompleteList] = useState<IncompleteRow[]>([]);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [fillTimes, setFillTimes] = useState<Record<string, string>>({});
  const [incompleteError, setIncompleteError] = useState("");
  const [incompleteSaving, setIncompleteSaving] = useState(false);

  async function shareLeaveLink() {
    const link = await api<{ token: string }>("/api/attendance/leave-link", { method: "POST" });
    setLeaveUrl(`${window.location.origin}/absence/${link.token}`);
  }

  const load = useCallback(async () => {
    const q = new URLSearchParams({ date, page: String(page) });
    if (status !== "all") q.set("status", status);
    const [list, m, inc] = await Promise.all([
      api<{ data: Scan[]; total: number }>(`/api/attendance?${q}`),
      api<Metrics>(`/api/attendance/metrics?date=${date}`),
      api<IncompleteRow[]>(`/api/attendance/incomplete?date=${date}`),
    ]);
    setRows(list.data);
    setTotal(list.total);
    setMetrics(m);
    setIncomplete(inc);
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
      setEditing(null);
      setForm({ employeeId: "", clockIn: "", clockOut: "" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runImport(commit: boolean, createMissing = false) {
    if (!importFile) return;
    setImportBusy(true);
    setImportError("");
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("commit", commit ? "true" : "false");
      fd.append("overwriteConflicts", overwriteConflicts ? "true" : "false");
      fd.append("createMissing", createMissing ? "true" : "false");
      const res = await fetch("/api/attendance/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.errors?.file?.[0] ?? data?.message ?? "Gagal impor");
      setImportResult(data as ImportResult);
      if (commit) {
        setImportFile(null);
        load();
        // Absensi tidak komplit (lintas tanggal) dari hasil import → modal lengkapi manual otomatis.
        const inc: IncompleteRow[] = (data as ImportResult).rows
          .filter((r) => r.matched && r.employeeId != null && (!!r.clockIn !== !!r.clockOut))
          .map((r) => ({
            employeeId: r.employeeId as number,
            fullName: r.employeeName ?? `${r.fileName} (PIN ${r.pin})`,
            employeeCode: r.pin,
            date: r.dateISO,
            clockIn: r.clockIn,
            clockOut: r.clockOut,
            missing: r.clockIn ? "out" : "in",
            suggested: r.suggested,
          }));
        if (inc.length > 0) {
          setImportOpen(false);
          openComplete(inc);
        }
      }
    } catch (e) {
      setImportError((e as Error).message);
    } finally {
      setImportBusy(false);
    }
  }

  function openComplete(list: IncompleteRow[]) {
    const init: Record<string, string> = {};
    for (const r of list) init[`${r.employeeId}|${r.date}`] = r.suggested ?? "";
    setFillTimes(init);
    setCompleteList(list);
    setIncompleteError("");
    setIncompleteOpen(true);
  }

  async function openEdit(r: Scan) {
    setError("");
    try {
      const day = await api<{ clockIn: string | null; clockOut: string | null }>(
        `/api/attendance/day?date=${date}&employeeId=${r.employeeId}`
      );
      setEditing({ employeeId: r.employeeId, name: r.employee.fullName });
      setForm({ employeeId: String(r.employeeId), clockIn: day.clockIn ?? "", clockOut: day.clockOut ?? "" });
      setModal(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveComplete(row: IncompleteRow) {
    const key = `${row.employeeId}|${row.date}`;
    const time = fillTimes[key];
    if (!time) return;
    setIncompleteError("");
    try {
      await api("/api/attendance/manual", {
        method: "POST",
        body: JSON.stringify({
          employeeId: row.employeeId,
          date: row.date,
          clockIn: row.missing === "in" ? time : row.clockIn,
          clockOut: row.missing === "out" ? time : row.clockOut,
        }),
      });
      setFillTimes((f) => {
        const n = { ...f };
        delete n[key];
        return n;
      });
      setCompleteList((list) => list.filter((x) => `${x.employeeId}|${x.date}` !== key));
      await load();
    } catch (e) {
      setIncompleteError((e as Error).message);
    }
  }

  async function saveAllComplete() {
    const targets = completeList.filter((r) => fillTimes[`${r.employeeId}|${r.date}`]);
    if (targets.length === 0) return;
    setIncompleteSaving(true);
    setIncompleteError("");
    try {
      await Promise.all(
        targets.map((row) => {
          const time = fillTimes[`${row.employeeId}|${row.date}`];
          return api("/api/attendance/manual", {
            method: "POST",
            body: JSON.stringify({
              employeeId: row.employeeId,
              date: row.date,
              clockIn: row.missing === "in" ? time : row.clockIn,
              clockOut: row.missing === "out" ? time : row.clockOut,
            }),
          });
        })
      );
      const savedKeys = new Set(targets.map((r) => `${r.employeeId}|${r.date}`));
      setCompleteList((list) => list.filter((x) => !savedKeys.has(`${x.employeeId}|${x.date}`)));
      setFillTimes((f) => {
        const n = { ...f };
        for (const k of savedKeys) delete n[k];
        return n;
      });
      await load();
    } catch (e) {
      setIncompleteError((e as Error).message);
      await load();
    } finally {
      setIncompleteSaving(false);
    }
  }

  function closeImport() {
    setImportOpen(false);
    setImportFile(null);
    setImportResult(null);
    setImportError("");
    setOverwriteConflicts(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const prettyDate = formatLongDate(date);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Absensi</h1>
          <p className="mt-0.5 text-sm text-muted">{prettyDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="input h-10 w-auto"
            value={date}
            onChange={(e) => { setPage(1); setDate(e.target.value); }}
          />
          <button onClick={shareLeaveLink} className="btn-ghost h-10">
            <IconLink className="text-[17px]" /> Link Izin
          </button>
          <button onClick={() => setImportOpen(true)} className="btn-ghost h-10">
            <IconUpload className="text-[17px]" /> Import Scanlog
          </button>
          <button
            onClick={() => { setEditing(null); setForm({ employeeId: "", clockIn: "", clockOut: "" }); setError(""); setModal(true); }}
            className="btn-primary h-10"
          >
            <IconPlus className="text-[17px]" /> Manual
          </button>
        </div>
      </div>

      {leaveUrl && (
        <div className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary" style={softChip("var(--primary)")}>
              <IconLink className="text-[16px]" />
            </span>
            <span className="truncate text-primary">{leaveUrl}</span>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(leaveUrl)}
            className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
          >
            <IconCopy className="text-[15px]" /> Salin
          </button>
        </div>
      )}

      {incomplete.length > 0 && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm"
          style={{ borderColor: "color-mix(in oklab, var(--warning) 35%, transparent)", background: "color-mix(in oklab, var(--warning) 10%, transparent)" }}
        >
          <div className="flex items-center gap-2.5">
            <IconAlert className="shrink-0 text-[18px] text-warning" />
            <span className="text-fg">
              <b className="font-semibold text-warning">{incomplete.length}</b> absensi tidak komplit (masuk/pulang tidak lengkap) pada {date}.
            </span>
          </div>
          <button
            onClick={() => openComplete(incomplete)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-warning transition hover:brightness-110"
            style={{ background: "color-mix(in oklab, var(--warning) 18%, transparent)" }}
          >
            Lengkapi manual
          </button>
        </div>
      )}

      {/* Hero: donut + metrics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-muted">Ringkasan Kehadiran</h2>
          <AttendanceDonut
            present={metrics?.present ?? 0}
            late={metrics?.late ?? 0}
            absent={metrics?.absent ?? 0}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <MetricCard label="Hadir" value={metrics?.present ?? 0} tone="success" icon={IconCheck} />
          <MetricCard label="Terlambat" value={metrics?.late ?? 0} tone="warning" icon={IconClock} />
          <MetricCard label="Absen" value={metrics?.absent ?? 0} tone="danger" icon={IconAlert} />
          <MetricCard
            label="Telat terbaru"
            value={metrics?.recentLates.length ?? 0}
            tone="info"
            icon={IconUsers}
            sub={metrics?.recentLates[0] ? `${metrics.recentLates[0].name} +${metrics.recentLates[0].minutes}m` : "—"}
          />
        </div>
      </div>

      {/* Table card */}
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-fg">Log Absensi</h2>
          <Segmented
            value={status}
            onChange={(v) => { setPage(1); setStatus(v); }}
            options={[
              { value: "all", label: "Semua" },
              { value: "on_time", label: "Tepat waktu" },
              { value: "late", label: "Terlambat" },
            ]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                <th className="px-5 py-3 font-medium">Karyawan</th>
                <th className="px-5 py-3 font-medium">Waktu</th>
                <th className="px-5 py-3 font-medium">Tipe</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Mesin</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-subtle">
                    Tidak ada data absensi untuk tanggal ini.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border transition hover:bg-surface">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-primary" style={softChip("var(--primary)")}>
                          {initials(r.employee.fullName)}
                        </span>
                        <div>
                          <div className="font-medium text-fg">{r.employee.fullName}</div>
                          <div className="text-xs text-subtle">{r.employee.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular text-muted">
                      {new Date(r.scanDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {r.scanType === "in" ? "Masuk" : r.scanType === "out" ? "Keluar" : r.scanType}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3 text-muted">{r.machineName ?? "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-muted transition hover:border-primary hover:text-primary"
                      >
                        <IconPencil className="text-[14px]" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3 text-sm text-muted">
          <span className="tabular">{total} scan</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong transition hover:bg-surface-2 disabled:opacity-40"
            >
              <IconChevronLeft className="text-[16px]" />
            </button>
            <span className="tabular px-1">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong transition hover:bg-surface-2 disabled:opacity-40"
            >
              <IconChevronRight className="text-[16px]" />
            </button>
          </div>
        </div>
      </div>

      {modal && (
        <Modal title={editing ? "Edit Absensi" : "Absensi Manual"} onClose={() => { setModal(false); setEditing(null); }}>
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="space-y-3">
            {editing ? (
              <div className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
                <span className="text-muted">Karyawan: </span>
                <span className="font-medium text-fg">{editing.name}</span>
              </div>
            ) : (
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Karyawan *</span>
                <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                  <option value="">— pilih —</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-muted">Jam masuk</span>
                <input type="time" className="input" value={form.clockIn} onChange={(e) => setForm({ ...form, clockIn: e.target.value })} />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-muted">Jam pulang</span>
                <input type="time" className="input" value={form.clockOut} onChange={(e) => setForm({ ...form, clockOut: e.target.value })} />
              </label>
            </div>
            <p className="text-xs text-subtle">Tanggal: {date}</p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => { setModal(false); setEditing(null); }} className="btn-ghost">Batal</button>
            <button onClick={saveManual} className="btn-primary"><IconCheck className="text-[16px]" /> Simpan</button>
          </div>
        </Modal>
      )}

      {importOpen && (
        <Modal title="Import Scanlog Mesin (HTML)" onClose={closeImport} size="xl">
          {importError && <ErrorBox>{importError}</ErrorBox>}
          <div className="space-y-3">
            <input
              type="file"
              accept=".html,.htm,text/html"
              className="block w-full cursor-pointer rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
              onChange={(e) => { setImportResult(null); setImportFile(e.target.files?.[0] ?? null); }}
            />
            <div className="flex gap-2">
              <button disabled={!importFile || importBusy} onClick={() => runImport(false)} className="btn-ghost">
                {importBusy ? "Memproses…" : "Preview"}
              </button>
            </div>

            {importResult && (
              <>
                <div className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-muted">
                  Total <b className="tabular text-fg">{importResult.summary.total}</b> baris · Cocok <b className="tabular text-success">{importResult.summary.matched}</b> · Tak cocok <b className="tabular">{importResult.summary.unmatched}</b>
                  {importResult.summary.conflicts > 0 && (
                    <span className="text-warning"> · Bentrok {importResult.summary.conflicts}</span>
                  )}
                  {importResult.summary.unmatchedPins.length > 0 && (
                    <span className="text-danger"> · PIN tak dikenal: {importResult.summary.unmatchedPins.join(", ")}</span>
                  )}
                </div>
                <div className="max-h-72 overflow-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-solid text-left text-subtle">
                      <tr>
                        <th className="px-3 py-2 font-medium">Karyawan</th><th className="px-3 py-2 font-medium">Tanggal</th><th className="px-3 py-2 font-medium">Masuk</th><th className="px-3 py-2 font-medium">Pulang</th><th className="px-3 py-2 font-medium">Shift</th><th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.rows.map((r, i) => (
                        <tr key={i} className="border-t border-border" style={rowTint(r.matched, r.conflict)}>
                          <td className="px-3 py-2 text-fg">{r.employeeName ?? `${r.fileName} (PIN ${r.pin})`}</td>
                          <td className="px-3 py-2 text-muted">
                            {r.dateISO}
                            {r.isHoliday && <span className="badge ml-1" style={softChip("var(--primary)")}>libur</span>}
                          </td>
                          <td className="px-3 py-2 tabular text-muted">{r.clockIn ?? "—"}</td>
                          <td className="px-3 py-2 tabular text-muted">{r.clockOut ?? "—"}</td>
                          <td className="px-3 py-2">
                            {r.shift ? (
                              <span className="badge" style={softChip(r.shift === "longshift" ? "var(--primary-2)" : "var(--fg-subtle)")}>
                                {r.shift}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {r.matched ? <span className="text-muted">{r.status}</span> : <span className="text-danger">tak cocok</span>}
                            {r.conflict && <span className="ml-1 text-warning" title={`Sudah ada dari: ${r.existingSources.join(", ")}`}>⚠ bentrok</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importResult.committed ? (
                  <div className="rounded-xl px-3 py-2.5 text-sm text-success" style={softChip("var(--success)")}>
                    Berhasil menyimpan {importResult.created ?? 0} record.
                    {(importResult.skippedConflicts ?? 0) > 0 && (
                      <> {importResult.skippedConflicts} hari bentrok dilewati (tidak ditimpa).</>
                    )}
                  </div>
                ) : (
                  <>
                    {(importResult.createdEmployees ?? 0) > 0 && (
                      <div className="rounded-xl px-3 py-2.5 text-xs text-success" style={softChip("var(--success)")}>
                        {importResult.createdEmployees} karyawan baru dibuat dari file (Nama + PIN). Lengkapi jadwal kerja &amp; departemen di menu Karyawan.
                      </div>
                    )}
                    {importResult.summary.unmatchedPins.length > 0 && (
                      <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs text-danger" style={softChip("var(--danger)")}>
                        <span>{importResult.summary.unmatchedPins.length} PIN belum terdaftar sebagai karyawan.</span>
                        <button
                          disabled={importBusy}
                          onClick={() => runImport(false, true)}
                          className="shrink-0 rounded-lg border border-current px-2.5 py-1 font-semibold transition hover:brightness-110 disabled:opacity-40"
                        >
                          {importBusy ? "Membuat…" : "Buat karyawan otomatis"}
                        </button>
                      </div>
                    )}
                    {importResult.summary.conflicts > 0 && (
                      <label className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs text-warning" style={softChip("var(--warning)")}>
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-[color:var(--warning)]"
                          checked={overwriteConflicts}
                          onChange={(e) => setOverwriteConflicts(e.target.checked)}
                        />
                        <span>Timpa {importResult.summary.conflicts} hari yang sudah punya absensi dari mesin/sumber lain. Tanpa dicentang, hari bentrok akan dilewati.</span>
                      </label>
                    )}
                    <div className="flex justify-end gap-2">
                      <button onClick={closeImport} className="btn-ghost">Batal</button>
                      <button disabled={importBusy || importResult.summary.matched === 0} onClick={() => runImport(true)} className="btn-primary">
                        {importBusy ? "Menyimpan…" : `Konfirmasi & Simpan (${importResult.summary.matched})`}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {incompleteOpen && (
        <Modal title="Lengkapi Absensi Tidak Komplit" onClose={() => setIncompleteOpen(false)} size="xl">
          {incompleteError && <ErrorBox>{incompleteError}</ErrorBox>}
          {completeList.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full text-success" style={softChip("var(--success)")}>
                <IconCheck className="text-[22px]" />
              </span>
              <p className="text-sm text-muted">Semua absensi sudah komplit.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-subtle">Isi jam yang hilang (ditandai kotak input) untuk tiap karyawan, lalu Simpan.</p>
              <div className="max-h-80 overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-solid text-left text-subtle">
                    <tr>
                      <th className="px-3 py-2 font-medium">Karyawan</th><th className="px-3 py-2 font-medium">Tanggal</th><th className="px-3 py-2 font-medium">Masuk</th><th className="px-3 py-2 font-medium">Pulang</th><th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {completeList.map((r) => {
                      const key = `${r.employeeId}|${r.date}`;
                      return (
                        <tr key={key} className="border-t border-border">
                          <td className="px-3 py-2">
                            <div className="font-medium text-fg">{r.fullName}</div>
                            <div className="text-xs text-subtle">{r.employeeCode}</div>
                          </td>
                          <td className="px-3 py-2 tabular text-muted">{r.date}</td>
                          <td className="px-3 py-2">
                            {r.missing === "in" ? (
                              <input type="time" className="input" value={fillTimes[key] ?? ""}
                                onChange={(e) => setFillTimes({ ...fillTimes, [key]: e.target.value })} />
                            ) : (
                              <span className="tabular text-fg">{r.clockIn ?? "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {r.missing === "out" ? (
                              <input type="time" className="input" value={fillTimes[key] ?? ""}
                                onChange={(e) => setFillTimes({ ...fillTimes, [key]: e.target.value })} />
                            ) : (
                              <span className="tabular text-fg">{r.clockOut ?? "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button disabled={!fillTimes[key]} onClick={() => saveComplete(r)}
                              className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">
                              Simpan
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="mt-5 flex justify-between gap-2">
            <button onClick={() => setIncompleteOpen(false)} className="btn-ghost">Tutup</button>
            {completeList.length > 0 && (
              <button
                onClick={saveAllComplete}
                disabled={incompleteSaving || completeList.every((r) => !fillTimes[`${r.employeeId}|${r.date}`])}
                className="btn-primary disabled:opacity-40"
              >
                {incompleteSaving ? "Menyimpan…" : `Simpan Semua (${completeList.filter((r) => fillTimes[`${r.employeeId}|${r.date}`]).length})`}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- presentational helpers ---------- */

type IconType = ComponentType<SVGProps<SVGSVGElement>>;
const TONE: Record<string, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
};

function softChip(color: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${color} 16%, transparent)`, color };
}

function rowTint(matched: boolean, conflict: boolean): React.CSSProperties {
  if (!matched) return { background: "color-mix(in oklab, var(--danger) 10%, transparent)" };
  if (conflict) return { background: "color-mix(in oklab, var(--warning) 10%, transparent)" };
  return {};
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function formatLongDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function MetricCard({
  label, value, tone, icon: Icon, sub,
}: {
  label: string; value: number; tone: keyof typeof TONE | string; icon: IconType; sub?: string;
}) {
  const color = TONE[tone] ?? "var(--primary)";
  return (
    <div className="glass group flex flex-col justify-between gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={softChip(color)}>
          <Icon className="text-[18px]" />
        </span>
      </div>
      <div>
        <div className="tabular font-display text-3xl font-extrabold text-fg">{value}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-subtle">{sub}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: string; t: string }> = {
    on_time: { v: "var(--success)", t: "Tepat waktu" },
    late: { v: "var(--warning)", t: "Terlambat" },
    longshift: { v: "var(--primary-2)", t: "Long shift" },
    absent: { v: "var(--danger)", t: "Absen" },
  };
  const m = map[status] ?? { v: "var(--fg-subtle)", t: status };
  return <span className="badge" style={softChip(m.v)}>{m.t}</span>;
}

function Segmented({
  value, onChange, options,
}: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            value === o.value
              ? "bg-gradient-to-r from-primary to-primary-2 text-on-primary shadow"
              : "text-muted hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-xl px-3 py-2.5 text-sm text-danger" style={softChip("var(--danger)")}>
      {children}
    </div>
  );
}
