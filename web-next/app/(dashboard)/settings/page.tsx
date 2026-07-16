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
