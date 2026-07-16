"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";

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
  isHoliday: boolean;
};

type Form = {
  name: string;
  isHoliday: boolean;
  startTime: string;
  endTime: string;
  breakStartTime: string;
  breakEndTime: string;
  lateToleranceMinutes: string;
  dailyWage: string;
  holidayWage: string;
};

const empty: Form = {
  name: "",
  isHoliday: false,
  startTime: "08:00",
  endTime: "17:00",
  breakStartTime: "",
  breakEndTime: "",
  lateToleranceMinutes: "15",
  dailyWage: "0",
  holidayWage: "0",
};

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
      startTime: w.startTime ?? "",
      endTime: w.endTime ?? "",
      breakStartTime: w.breakStartTime ?? "",
      breakEndTime: w.breakEndTime ?? "",
      lateToleranceMinutes: String(w.lateToleranceMinutes),
      dailyWage: String(w.dailyWage ?? 0),
      holidayWage: String(w.holidayWage ?? 0),
    });
    setError("");
    setModal("edit");
  }

  function payload() {
    return {
      name: form.name,
      isHoliday: form.isHoliday,
      startTime: form.isHoliday ? "" : form.startTime,
      endTime: form.isHoliday ? "" : form.endTime,
      breakStartTime: form.breakStartTime,
      breakEndTime: form.breakEndTime,
      lateToleranceMinutes: Number(form.lateToleranceMinutes || 0),
      dailyWage: Number(form.dailyWage || 0),
      holidayWage: Number(form.holidayWage || 0),
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Jadwal Kerja</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Jadwal
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Jam kerja</th>
              <th className="px-4 py-3">Toleransi</th>
              <th className="px-4 py-3">Upah harian</th>
              <th className="px-4 py-3">Libur?</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Belum ada jadwal.
                </td>
              </tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{w.name}</td>
                  <td className="px-4 py-3">
                    {w.isHoliday ? "—" : `${w.startTime ?? "?"} – ${w.endTime ?? "?"}`}
                  </td>
                  <td className="px-4 py-3">{w.lateToleranceMinutes} mnt</td>
                  <td className="px-4 py-3">Rp {Number(w.dailyWage ?? 0).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3">{w.isHoliday ? "Ya" : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <button onClick={() => openEdit(w)} className="text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => remove(w)} className="text-red-600 hover:underline">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal === "add" ? "Tambah Jadwal" : "Edit Jadwal"}
          onClose={() => setModal(null)}
        >
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 space-y-1 text-sm">
              <span className="text-slate-600">Nama jadwal *</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.isHoliday}
                onChange={(e) => setForm({ ...form, isHoliday: e.target.checked })}
              />
              Jadwal hari libur (tanpa jam kerja)
            </label>
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
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600">Toleransi telat (menit)</span>
                  <input
                    type="number"
                    className="input"
                    value={form.lateToleranceMinutes}
                    onChange={(e) => setForm({ ...form, lateToleranceMinutes: e.target.value })}
                  />
                </label>
              </>
            )}
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Upah harian (Rp)</span>
              <input
                type="number"
                className="input"
                value={form.dailyWage}
                onChange={(e) => setForm({ ...form, dailyWage: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Upah libur (Rp)</span>
              <input
                type="number"
                className="input"
                value={form.holidayWage}
                onChange={(e) => setForm({ ...form, holidayWage: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              onClick={save}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Simpan
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
    <label className="space-y-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <input type="time" className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
