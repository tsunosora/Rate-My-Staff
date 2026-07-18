"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";

type Dept = { id: number; name: string; _count?: { employees: number } };
type Pos = { id: number; name: string; department?: { name: string } | null };
type Holiday = { id: number; date: string; name: string };
type Settings = Record<string, string | null>;

export default function SettingsPage() {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [positions, setPositions] = useState<Pos[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [msg, setMsg] = useState("");

  const [newDept, setNewDept] = useState("");
  const [newPos, setNewPos] = useState("");
  const [newPosDept, setNewPosDept] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");

  const loadAll = useCallback(async () => {
    const [d, p, h, s] = await Promise.all([
      api<Dept[]>("/api/departments"),
      api<Pos[]>("/api/positions"),
      api<Holiday[]>("/api/holidays"),
      api<Settings>("/api/settings"),
    ]);
    setDepartments(d);
    setPositions(p);
    setHolidays(h);
    setSettings(s);
  }, []);
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function addDept() {
    if (!newDept.trim()) return;
    await api("/api/departments", { method: "POST", body: JSON.stringify({ name: newDept }) });
    setNewDept("");
    loadAll();
  }
  async function delDept(id: number) {
    try {
      await api(`/api/departments/${id}`, { method: "DELETE" });
      loadAll();
    } catch (e) {
      alert((e as Error).message);
    }
  }
  async function addPos() {
    if (!newPos.trim()) return;
    await api("/api/positions", {
      method: "POST",
      body: JSON.stringify({ name: newPos, departmentId: newPosDept ? Number(newPosDept) : null }),
    });
    setNewPos("");
    setNewPosDept("");
    loadAll();
  }
  async function delPos(id: number) {
    try {
      await api(`/api/positions/${id}`, { method: "DELETE" });
      loadAll();
    } catch (e) {
      alert((e as Error).message);
    }
  }
  async function addHoliday() {
    if (!holidayDate || !holidayName.trim()) return;
    await api("/api/holidays", {
      method: "POST",
      body: JSON.stringify({ date: holidayDate, name: holidayName }),
    });
    setHolidayDate("");
    setHolidayName("");
    loadAll();
  }
  async function delHoliday(id: number) {
    await api(`/api/holidays/${id}`, { method: "DELETE" });
    loadAll();
  }
  async function saveSettings() {
    const updated = await api<Settings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
    setSettings(updated);
    setMsg("Pengaturan tersimpan.");
    setTimeout(() => setMsg(""), 2500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan</h1>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Departemen">
          <div className="mb-3 flex gap-2">
            <input
              className="input"
              placeholder="Nama departemen"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
            />
            <button onClick={addDept} className="btn-primary">
              Tambah
            </button>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <span>
                  {d.name}
                  {d._count && (
                    <span className="ml-2 text-xs text-slate-400">
                      ({d._count.employees} karyawan)
                    </span>
                  )}
                </span>
                <button onClick={() => delDept(d.id)} className="text-xs text-red-600 hover:underline">
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Posisi / Jabatan">
          <div className="mb-3 flex gap-2">
            <input
              className="input"
              placeholder="Nama posisi"
              value={newPos}
              onChange={(e) => setNewPos(e.target.value)}
            />
            <select
              className="input max-w-[40%]"
              value={newPosDept}
              onChange={(e) => setNewPosDept(e.target.value)}
            >
              <option value="">Dept…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button onClick={addPos} className="btn-primary">
              Tambah
            </button>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {positions.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span>
                  {p.name}
                  {p.department && (
                    <span className="ml-2 text-xs text-slate-400">{p.department.name}</span>
                  )}
                </span>
                <button onClick={() => delPos(p.id)} className="text-xs text-red-600 hover:underline">
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Hari Libur">
          <div className="mb-3 flex gap-2">
            <input
              type="date"
              className="input"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
            />
            <input
              className="input"
              placeholder="Keterangan"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
            />
            <button onClick={addHoliday} className="btn-primary">
              Tambah
            </button>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span>
                  {new Date(h.date).toLocaleDateString("id-ID")} — {h.name}
                </span>
                <button
                  onClick={() => delHoliday(h.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <ChangePasswordCard />

        <Card title="Sistem & Integrasi">
          <div className="space-y-3 text-sm">
            <label className="space-y-1">
              <span className="text-slate-600">Engine perhitungan lembur</span>
              <select
                className="input"
                value={settings.overtime_engine_context ?? "default"}
                onChange={(e) =>
                  setSettings({ ...settings, overtime_engine_context: e.target.value })
                }
              >
                <option value="default">Standard</option>
                <option value="rate_my_staff_custom">RateMyStaff Custom</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={settings.auto_sunday_holiday === "true"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auto_sunday_holiday: e.target.checked ? "true" : "false",
                  })
                }
              />
              Minggu otomatis hari libur
            </label>
            <label className="space-y-1">
              <span className="text-slate-600">SN Mesin Fingerspot</span>
              <input
                className="input"
                value={settings.fingerspot_sn ?? ""}
                onChange={(e) => setSettings({ ...settings, fingerspot_sn: e.target.value })}
              />
            </label>
            <button onClick={saveSettings} className="btn-primary">
              Simpan pengaturan
            </button>
          </div>
        </Card>

        <Card title="Jam Toko & Shift">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-slate-600">Buka toko / shift pagi mulai</span>
              <input
                type="time"
                className="input"
                value={settings.store_open_time ?? "08:00"}
                onChange={(e) => setSettings({ ...settings, store_open_time: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600">Tutup toko / shift siang selesai</span>
              <input
                type="time"
                className="input"
                value={settings.store_close_time ?? "21:00"}
                onChange={(e) => setSettings({ ...settings, store_close_time: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600">Shift pagi selesai</span>
              <input
                type="time"
                className="input"
                value={settings.shift_morning_end ?? "16:00"}
                onChange={(e) => setSettings({ ...settings, shift_morning_end: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600">Shift siang mulai (batas pagi/siang)</span>
              <input
                type="time"
                className="input"
                value={settings.shift_afternoon_start ?? "13:00"}
                onChange={(e) => setSettings({ ...settings, shift_afternoon_start: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600">Longshift bila masuk pagi & pulang ≥</span>
              <input
                type="time"
                className="input"
                value={settings.longshift_min_out ?? "20:00"}
                onChange={(e) => setSettings({ ...settings, longshift_min_out: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-600">Toleransi telat (menit)</span>
              <input
                type="number"
                min={0}
                className="input"
                value={settings.shift_late_tolerance ?? "15"}
                onChange={(e) => setSettings({ ...settings, shift_late_tolerance: e.target.value })}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Shift dideteksi otomatis dari jam scan: masuk sebelum &quot;shift siang mulai&quot; = pagi;
            masuk pagi lalu pulang ≥ ambang longshift = longshift. Lembur = menit kerja melebihi jam
            selesai shift (pagi: shift pagi selesai; siang/longshift: tutup toko).
          </p>
          <button onClick={saveSettings} className="btn-primary mt-3">
            Simpan pengaturan
          </button>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit() {
    setMsg("");
    setErr("");
    if (next !== confirm) {
      setErr("Konfirmasi password tidak cocok.");
      return;
    }
    try {
      await api("/api/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setMsg("Password berhasil diganti.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Card title="Ganti Password">
      <div className="space-y-3 text-sm">
        {msg && <div className="rounded-lg bg-green-50 px-3 py-2 text-green-700">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-red-600">{err}</div>}
        <input type="password" className="input" placeholder="Password saat ini" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <input type="password" className="input" placeholder="Password baru (min 6)" value={next} onChange={(e) => setNext(e.target.value)} />
        <input type="password" className="input" placeholder="Konfirmasi password baru" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button onClick={submit} className="btn-primary">
          Simpan password
        </button>
      </div>
    </Card>
  );
}
