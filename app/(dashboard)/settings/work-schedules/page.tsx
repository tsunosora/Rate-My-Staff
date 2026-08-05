"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconPlus, IconPencil, IconTrash, IconCheck } from "@/components/ui/icons";

type WorkSchedule = {
  id: number;
  name: string;
  startTime: string | null;
  endTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  lateToleranceMinutes: number;
  dailyWage: string | number;
  holidayWage: string | number;
  overtimeWagePerHour: string | number;
  isHoliday: boolean;
  flexibleHours: boolean;
};

type Form = {
  name: string;
  isHoliday: boolean;
  flexibleHours: boolean;
  startTime: string;
  endTime: string;
  breakStartTime: string;
  breakEndTime: string;
  lateToleranceMinutes: string;
  dailyWage: string;
  holidayWage: string;
  overtimeWagePerHour: string;
};

const empty: Form = {
  name: "",
  isHoliday: false,
  flexibleHours: false,
  startTime: "08:00",
  endTime: "17:00",
  breakStartTime: "",
  breakEndTime: "",
  lateToleranceMinutes: "15",
  dailyWage: "0",
  holidayWage: "0",
  overtimeWagePerHour: "0",
};

function softChip(c: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c };
}

export default function WorkSchedulesPage() {
  const [rows, setRows] = useState<WorkSchedule[]>([]);
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const [editing, setEditing] = useState<WorkSchedule | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setRows(await api<WorkSchedule[]>("/api/work-schedules"));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setForm(empty);
    setEditing(null);
    setError("");
    setModal("add");
  }
  function openEdit(w: WorkSchedule) {
    setEditing(w);
    setForm({
      name: w.name,
      isHoliday: w.isHoliday,
      flexibleHours: w.flexibleHours ?? false,
      startTime: w.startTime ?? "",
      endTime: w.endTime ?? "",
      breakStartTime: w.breakStartTime ?? "",
      breakEndTime: w.breakEndTime ?? "",
      lateToleranceMinutes: String(w.lateToleranceMinutes),
      dailyWage: String(w.dailyWage ?? 0),
      holidayWage: String(w.holidayWage ?? 0),
      overtimeWagePerHour: String(w.overtimeWagePerHour ?? 0),
    });
    setError("");
    setModal("edit");
  }

  function payload() {
    return {
      name: form.name,
      isHoliday: form.isHoliday,
      flexibleHours: form.flexibleHours,
      startTime: form.isHoliday ? "" : form.startTime,
      endTime: form.isHoliday ? "" : form.endTime,
      breakStartTime: form.breakStartTime,
      breakEndTime: form.breakEndTime,
      lateToleranceMinutes: Number(form.lateToleranceMinutes || 0),
      dailyWage: Number(form.dailyWage || 0),
      holidayWage: Number(form.holidayWage || 0),
      overtimeWagePerHour: Number(form.overtimeWagePerHour || 0),
    };
  }

  async function save() {
    setError("");
    try {
      if (modal === "add") {
        await api("/api/work-schedules", { method: "POST", body: JSON.stringify(payload()) });
      } else if (editing) {
        await api(`/api/work-schedules/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload()),
        });
      }
      setModal(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(w: WorkSchedule) {
    if (!confirm(`Hapus jadwal "${w.name}"?`)) return;
    try {
      await api(`/api/work-schedules/${w.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Jadwal Kerja</h1>
          <p className="mt-0.5 text-sm text-muted">Shift, toleransi telat &amp; upah harian.</p>
        </div>
        <button onClick={openAdd} className="btn-primary h-10">
          <IconPlus className="text-[17px]" /> Jadwal
        </button>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Jam kerja</th>
                <th className="px-4 py-3 font-medium">Toleransi</th>
                <th className="px-4 py-3 font-medium">Upah harian</th>
                <th className="px-4 py-3 font-medium">Libur?</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-subtle">
                    Belum ada jadwal.
                  </td>
                </tr>
              ) : (
                rows.map((w) => (
                  <tr key={w.id} className="border-t border-border transition hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-fg">{w.name}</td>
                    <td className="px-4 py-3 tabular text-muted">
                      {w.isHoliday ? "—" : `${w.startTime ?? "?"} – ${w.endTime ?? "?"}`}
                    </td>
                    <td className="px-4 py-3 tabular text-muted">{w.lateToleranceMinutes} mnt</td>
                    <td className="px-4 py-3 tabular text-muted">Rp {Number(w.dailyWage ?? 0).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3">
                      {w.isHoliday ? (
                        <span className="badge" style={softChip("var(--warning)")}>Ya</span>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(w)}
                          aria-label="Edit"
                          title="Edit"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong text-muted transition hover:border-primary hover:text-primary"
                        >
                          <IconPencil className="text-[15px]" />
                        </button>
                        <button
                          onClick={() => remove(w)}
                          aria-label="Hapus"
                          title="Hapus"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border-strong text-muted transition hover:border-danger hover:text-danger"
                        >
                          <IconTrash className="text-[15px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={modal === "add" ? "Tambah Jadwal" : "Edit Jadwal"}
          onClose={() => setModal(null)}
          size="xl"
        >
          {error && (
            <div className="mb-3 rounded-xl px-3 py-2.5 text-sm text-danger" style={softChip("var(--danger)")}>{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 space-y-1.5 text-sm">
              <span className="font-medium text-muted">Nama jadwal *</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                className="accent-[color:var(--primary)]"
                checked={form.isHoliday}
                onChange={(e) => setForm({ ...form, isHoliday: e.target.checked })}
              />
              Jadwal hari libur (tanpa jam kerja)
            </label>
            {!form.isHoliday && (
              <label className="col-span-2 flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  className="accent-[color:var(--primary)]"
                  checked={form.flexibleHours}
                  onChange={(e) => setForm({ ...form, flexibleHours: e.target.checked })}
                />
                Jam masuk bebas — lembur dihitung dari durasi (di atas 8 jam) + uang makan (di atas 10 jam)
              </label>
            )}
            {!form.isHoliday && (
              <>
                <TimeField
                  label="Jam masuk"
                  value={form.startTime}
                  onChange={(v) => setForm({ ...form, startTime: v })}
                />
                <TimeField
                  label="Jam keluar"
                  value={form.endTime}
                  onChange={(v) => setForm({ ...form, endTime: v })}
                />
                <TimeField
                  label="Mulai istirahat"
                  value={form.breakStartTime}
                  onChange={(v) => setForm({ ...form, breakStartTime: v })}
                />
                <TimeField
                  label="Selesai istirahat"
                  value={form.breakEndTime}
                  onChange={(v) => setForm({ ...form, breakEndTime: v })}
                />
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-muted">Toleransi telat (menit)</span>
                  <input
                    type="number"
                    className="input"
                    value={form.lateToleranceMinutes}
                    onChange={(e) => setForm({ ...form, lateToleranceMinutes: e.target.value })}
                  />
                </label>
              </>
            )}
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-muted">Upah harian (Rp)</span>
              <input
                type="number"
                className="input"
                value={form.dailyWage}
                onChange={(e) => setForm({ ...form, dailyWage: e.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-muted">Upah libur (Rp)</span>
              <input
                type="number"
                className="input"
                value={form.holidayWage}
                onChange={(e) => setForm({ ...form, holidayWage: e.target.value })}
              />
            </label>
            {form.flexibleHours && !form.isHoliday && (
              <label className="col-span-2 space-y-1.5 text-sm">
                <span className="font-medium text-muted">Tarif lembur / jam (Rp)</span>
                <input
                  type="number"
                  className="input"
                  value={form.overtimeWagePerHour}
                  onChange={(e) => setForm({ ...form, overtimeWagePerHour: e.target.value })}
                />
                <span className="text-xs text-subtle">
                  Dihitung per-menit (proporsional). Mis. 10000 = Rp10.000/jam.
                </span>
              </label>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="btn-ghost">
              Batal
            </button>
            <button onClick={save} className="btn-primary">
              <IconCheck className="text-[16px]" /> Simpan
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium text-muted">{label}</span>
      <input type="time" className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
