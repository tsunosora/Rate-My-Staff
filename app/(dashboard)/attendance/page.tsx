"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Absensi</h1>
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={date} onChange={(e) => { setPage(1); setDate(e.target.value); }} />
          <button onClick={shareLeaveLink} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
            Bagikan Link Izin
          </button>
          <button onClick={() => setImportOpen(true)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
            Import Scanlog
          </button>
          <button
            onClick={() => { setEditing(null); setForm({ employeeId: "", clockIn: "", clockOut: "" }); setError(""); setModal(true); }}
            className="btn-primary"
          >
            + Manual
          </button>
        </div>
      </div>

      {leaveUrl && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm">
          <span className="break-all text-indigo-700">{leaveUrl}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(leaveUrl)}
            className="shrink-0 rounded border border-indigo-300 px-2 py-1 text-xs text-indigo-700"
          >
            Salin
          </button>
        </div>
      )}

      {incomplete.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <span className="text-amber-800">
            ⚠ {incomplete.length} absensi tidak komplit (masuk/pulang tidak lengkap) pada {date}.
          </span>
          <button
            onClick={() => openComplete(incomplete)}
            className="shrink-0 rounded border border-amber-400 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            Lengkapi manual
          </button>
        </div>
      )}

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
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Tidak ada data.</td></tr>
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
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "late" ? "bg-yellow-100 text-yellow-700" : r.status === "on_time" ? "bg-green-100 text-green-700" : r.status === "longshift" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.machineName ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  </td>
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
        <Modal title={editing ? "Edit Absensi" : "Absensi Manual"} onClose={() => { setModal(false); setEditing(null); }}>
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-3">
            {editing ? (
              <div className="text-sm">
                <span className="text-slate-600">Karyawan: </span>
                <span className="font-medium text-slate-800">{editing.name}</span>
              </div>
            ) : (
              <label className="block space-y-1 text-sm">
                <span className="text-slate-600">Karyawan *</span>
                <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                  <option value="">— pilih —</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </select>
              </label>
            )}
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
            <button onClick={() => { setModal(false); setEditing(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
            <button onClick={saveManual} className="btn-primary">Simpan</button>
          </div>
        </Modal>
      )}

      {importOpen && (
        <Modal title="Import Scanlog Mesin (HTML)" onClose={closeImport}>
          {importError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{importError}</div>}
          <div className="space-y-3">
            <input
              type="file"
              accept=".html,.htm,text/html"
              className="block w-full text-sm"
              onChange={(e) => { setImportResult(null); setImportFile(e.target.files?.[0] ?? null); }}
            />
            <div className="flex gap-2">
              <button disabled={!importFile || importBusy} onClick={() => runImport(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">
                {importBusy ? "Memproses…" : "Preview"}
              </button>
            </div>

            {importResult && (
              <>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Total {importResult.summary.total} baris · Cocok {importResult.summary.matched} · Tak cocok {importResult.summary.unmatched}
                  {importResult.summary.conflicts > 0 && (
                    <span className="text-amber-600"> · Bentrok {importResult.summary.conflicts}</span>
                  )}
                  {importResult.summary.unmatchedPins.length > 0 && (
                    <span className="text-red-600"> · PIN tak dikenal: {importResult.summary.unmatchedPins.join(", ")}</span>
                  )}
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                      <tr><th className="px-2 py-1">Karyawan</th><th className="px-2 py-1">Tanggal</th><th className="px-2 py-1">Masuk</th><th className="px-2 py-1">Pulang</th><th className="px-2 py-1">Shift</th><th className="px-2 py-1">Status</th></tr>
                    </thead>
                    <tbody>
                      {importResult.rows.map((r, i) => (
                        <tr key={i} className={`border-t border-slate-100 ${!r.matched ? "bg-red-50" : r.conflict ? "bg-amber-50" : ""}`}>
                          <td className="px-2 py-1">{r.employeeName ?? `${r.fileName} (PIN ${r.pin})`}</td>
                          <td className="px-2 py-1">
                            {r.dateISO}
                            {r.isHoliday && <span className="ml-1 rounded bg-indigo-100 px-1 text-[10px] text-indigo-600">libur</span>}
                          </td>
                          <td className="px-2 py-1">{r.clockIn ?? "—"}</td>
                          <td className="px-2 py-1">{r.clockOut ?? "—"}</td>
                          <td className="px-2 py-1">
                            {r.shift ? (
                              <span className={`rounded px-1 text-[10px] ${r.shift === "longshift" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                                {r.shift}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-2 py-1">
                            {r.matched ? r.status : "tak cocok"}
                            {r.conflict && <span className="ml-1 text-amber-600" title={`Sudah ada dari: ${r.existingSources.join(", ")}`}>⚠ bentrok</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importResult.committed ? (
                  <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                    Berhasil menyimpan {importResult.created ?? 0} record.
                    {(importResult.skippedConflicts ?? 0) > 0 && (
                      <> {importResult.skippedConflicts} hari bentrok dilewati (tidak ditimpa).</>
                    )}
                  </div>
                ) : (
                  <>
                    {(importResult.createdEmployees ?? 0) > 0 && (
                      <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                        {importResult.createdEmployees} karyawan baru dibuat dari file (Nama + PIN). Lengkapi jadwal kerja & departemen di menu Karyawan.
                      </div>
                    )}
                    {importResult.summary.unmatchedPins.length > 0 && (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                        <span>{importResult.summary.unmatchedPins.length} PIN belum terdaftar sebagai karyawan.</span>
                        <button
                          disabled={importBusy}
                          onClick={() => runImport(false, true)}
                          className="shrink-0 rounded border border-red-300 px-2 py-1 font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                        >
                          {importBusy ? "Membuat…" : "Buat karyawan otomatis"}
                        </button>
                      </div>
                    )}
                    {importResult.summary.conflicts > 0 && (
                      <label className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={overwriteConflicts}
                          onChange={(e) => setOverwriteConflicts(e.target.checked)}
                        />
                        <span>Timpa {importResult.summary.conflicts} hari yang sudah punya absensi dari mesin/sumber lain. Tanpa dicentang, hari bentrok akan dilewati.</span>
                      </label>
                    )}
                    <div className="flex justify-end gap-2">
                      <button onClick={closeImport} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
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
        <Modal title="Lengkapi Absensi Tidak Komplit" onClose={() => setIncompleteOpen(false)}>
          {incompleteError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{incompleteError}</div>}
          {completeList.length === 0 ? (
            <p className="text-sm text-slate-500">Semua absensi sudah komplit. 🎉</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Isi jam yang hilang (ditandai kotak input) untuk tiap karyawan, lalu Simpan.</p>
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                    <tr><th className="px-2 py-1">Karyawan</th><th className="px-2 py-1">Tanggal</th><th className="px-2 py-1">Masuk</th><th className="px-2 py-1">Pulang</th><th className="px-2 py-1"></th></tr>
                  </thead>
                  <tbody>
                    {completeList.map((r) => {
                      const key = `${r.employeeId}|${r.date}`;
                      return (
                        <tr key={key} className="border-t border-slate-100">
                          <td className="px-2 py-1">
                            <div className="font-medium text-slate-800">{r.fullName}</div>
                            <div className="text-xs text-slate-400">{r.employeeCode}</div>
                          </td>
                          <td className="px-2 py-1">{r.date}</td>
                          <td className="px-2 py-1">
                            {r.missing === "in" ? (
                              <input type="time" className="input" value={fillTimes[key] ?? ""}
                                onChange={(e) => setFillTimes({ ...fillTimes, [key]: e.target.value })} />
                            ) : (
                              <span className="text-slate-700">{r.clockIn ?? "—"}</span>
                            )}
                          </td>
                          <td className="px-2 py-1">
                            {r.missing === "out" ? (
                              <input type="time" className="input" value={fillTimes[key] ?? ""}
                                onChange={(e) => setFillTimes({ ...fillTimes, [key]: e.target.value })} />
                            ) : (
                              <span className="text-slate-700">{r.clockOut ?? "—"}</span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-right">
                            <button disabled={!fillTimes[key]} onClick={() => saveComplete(r)}
                              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-slate-100">
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
          <div className="mt-4 flex justify-between gap-2">
            <button onClick={() => setIncompleteOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Tutup</button>
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

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
