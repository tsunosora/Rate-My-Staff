"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconTrash } from "@/components/ui/icons";

type Dept = { id: number; name: string; _count?: { employees: number } };
type Pos = { id: number; name: string; department?: { name: string } | null };
type Holiday = { id: number; date: string; name: string };
type Settings = Record<string, string | null>;

function softChip(c: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c };
}

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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Pengaturan</h1>
          <p className="mt-0.5 text-sm text-muted">Departemen, posisi, hari libur, shift &amp; integrasi.</p>
        </div>
        {msg && <span className="text-sm text-success">{msg}</span>}
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
          <ul className="divide-y divide-border text-sm">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <span className="text-fg">
                  {d.name}
                  {d._count && (
                    <span className="ml-2 text-xs text-subtle">
                      ({d._count.employees} karyawan)
                    </span>
                  )}
                </span>
                <DeleteLink onClick={() => delDept(d.id)} />
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
          <ul className="divide-y divide-border text-sm">
            {positions.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="text-fg">
                  {p.name}
                  {p.department && (
                    <span className="ml-2 text-xs text-subtle">{p.department.name}</span>
                  )}
                </span>
                <DeleteLink onClick={() => delPos(p.id)} />
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
          <ul className="divide-y divide-border text-sm">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span className="text-fg">
                  {new Date(h.date).toLocaleDateString("id-ID")} — {h.name}
                </span>
                <DeleteLink onClick={() => delHoliday(h.id)} />
              </li>
            ))}
          </ul>
        </Card>

        <ChangePasswordCard />

        <Card title="Sistem & Integrasi">
          <div className="space-y-3 text-sm">
            <label className="space-y-1">
              <span className="text-muted">Engine perhitungan lembur</span>
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
            <label className="flex items-center gap-2 text-muted">
              <input
                type="checkbox"
                className="accent-[color:var(--primary)]"
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
              <span className="text-muted">SN Mesin Fingerspot</span>
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
              <span className="text-muted">Buka toko / shift pagi mulai</span>
              <input
                type="time"
                className="input"
                value={settings.store_open_time ?? "08:00"}
                onChange={(e) => setSettings({ ...settings, store_open_time: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">Tutup toko / shift siang selesai</span>
              <input
                type="time"
                className="input"
                value={settings.store_close_time ?? "21:00"}
                onChange={(e) => setSettings({ ...settings, store_close_time: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">Shift pagi selesai</span>
              <input
                type="time"
                className="input"
                value={settings.shift_morning_end ?? "16:00"}
                onChange={(e) => setSettings({ ...settings, shift_morning_end: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">Shift siang mulai (batas pagi/siang)</span>
              <input
                type="time"
                className="input"
                value={settings.shift_afternoon_start ?? "13:00"}
                onChange={(e) => setSettings({ ...settings, shift_afternoon_start: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">Longshift bila masuk pagi & pulang ≥</span>
              <input
                type="time"
                className="input"
                value={settings.longshift_min_out ?? "20:00"}
                onChange={(e) => setSettings({ ...settings, longshift_min_out: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">Toleransi telat (menit)</span>
              <input
                type="number"
                min={0}
                className="input"
                value={settings.shift_late_tolerance ?? "15"}
                onChange={(e) => setSettings({ ...settings, shift_late_tolerance: e.target.value })}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-subtle">
            Shift dideteksi otomatis dari jam scan: masuk sebelum &quot;shift siang mulai&quot; = pagi;
            masuk pagi lalu pulang ≥ ambang longshift = longshift. Lembur = menit kerja melebihi jam
            selesai shift (pagi: shift pagi selesai; siang/longshift: tutup toko).
          </p>
          <button onClick={saveSettings} className="btn-primary mt-3">
            Simpan pengaturan
          </button>
        </Card>

        <Card title="Tarif Lembur & Struk">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-muted">Lembur Harian (per hari longshift)</span>
              <input
                type="number"
                min={0}
                step={1000}
                className="input"
                placeholder="20000"
                value={settings.receipt_rate_daily ?? ""}
                onChange={(e) => setSettings({ ...settings, receipt_rate_daily: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">Lembur Libur (per hari libur masuk)</span>
              <input
                type="number"
                min={0}
                step={1000}
                className="input"
                placeholder="70000"
                value={settings.receipt_rate_holiday ?? ""}
                onChange={(e) => setSettings({ ...settings, receipt_rate_holiday: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">Lembur Cetak (per jam)</span>
              <input
                type="number"
                min={0}
                step={1000}
                className="input"
                placeholder="10000"
                value={settings.receipt_rate_cetak ?? ""}
                onChange={(e) => setSettings({ ...settings, receipt_rate_cetak: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted">Perhitungan jam lembur</span>
              <select
                className="input"
                value={settings.overtime_rounding ?? "hour"}
                onChange={(e) => setSettings({ ...settings, overtime_rounding: e.target.value })}
              >
                <option value="hour">Per jam penuh (buang sisa menit)</option>
                <option value="decimal">Desimal (menit dihitung)</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-muted">Uang makan (jam masuk bebas, di atas 10 jam)</span>
              <input
                type="number"
                min={0}
                step={1000}
                className="input"
                placeholder="10000"
                value={settings.flex_meal_allowance ?? ""}
                onChange={(e) => setSettings({ ...settings, flex_meal_allowance: e.target.value })}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-subtle">
            Tarif kosong memakai default (20.000 / 70.000 / 10.000) atau nilai dari kategori lembur.
            Mode <strong>per jam penuh</strong>: lembur hanya dihitung tiap 1 jam — sisa menit di
            bawah 60 (mis. 30 atau 50 menit) tidak dihitung.{" "}
            <strong>Uang makan</strong> hanya berlaku untuk jadwal “jam masuk bebas” dan dibayar flat
            sekali per hari bila durasi kerja melewati 10 jam (lemburnya dihitung per-menit). Kosong =
            default Rp10.000.
          </p>

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium text-muted">Ubah istilah di struk</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="space-y-1">
                <span className="text-muted">Istilah “Lembur Harian”</span>
                <input
                  className="input"
                  placeholder="Lembur Harian"
                  value={settings.label_lembur_harian ?? ""}
                  onChange={(e) => setSettings({ ...settings, label_lembur_harian: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-muted">Istilah “Lembur Libur”</span>
                <input
                  className="input"
                  placeholder="Lembur Libur"
                  value={settings.label_lembur_libur ?? ""}
                  onChange={(e) => setSettings({ ...settings, label_lembur_libur: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-muted">Istilah “Lembur Cetak”</span>
                <input
                  className="input"
                  placeholder="Lembur Cetak"
                  value={settings.label_lembur_cetak ?? ""}
                  onChange={(e) => setSettings({ ...settings, label_lembur_cetak: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-muted">Istilah lembur “jam masuk bebas”</span>
                <input
                  className="input"
                  placeholder="Lembur (per jam)"
                  value={settings.label_lembur_flex ?? ""}
                  onChange={(e) => setSettings({ ...settings, label_lembur_flex: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-muted">Istilah “Uang Makan”</span>
                <input
                  className="input"
                  placeholder="Uang Makan"
                  value={settings.label_uang_makan ?? ""}
                  onChange={(e) => setSettings({ ...settings, label_uang_makan: e.target.value })}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-subtle">
              Kosongkan untuk memakai istilah bawaan. Perubahan berlaku di struk (layar, PDF, Excel).
            </p>
          </div>

          <button onClick={saveSettings} className="btn-primary mt-3">
            Simpan pengaturan
          </button>
        </Card>
      </div>
    </div>
  );
}

function DeleteLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"
    >
      <IconTrash className="text-[13px]" /> Hapus
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-3 text-lg font-semibold text-fg">{title}</h2>
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
        {msg && (
          <div className="rounded-xl px-3 py-2 text-success" style={softChip("var(--success)")}>
            {msg}
          </div>
        )}
        {err && (
          <div className="rounded-xl px-3 py-2 text-danger" style={softChip("var(--danger)")}>
            {err}
          </div>
        )}
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
