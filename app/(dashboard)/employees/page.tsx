"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Ref = { id: number; name: string };
type Employee = {
  id: number;
  employeeCode: string;
  machinePin: string | null;
  publicToken: string | null;
  fullName: string;
  nickname: string | null;
  isActive: boolean;
  departmentId: number | null;
  positionId: number | null;
  workScheduleId: number | null;
  department: { id: number; name: string } | null;
  position: { id: number; name: string } | null;
};

type FormState = {
  fullName: string;
  nickname: string;
  machinePin: string;
  departmentId: string;
  positionId: string;
  workScheduleId: string;
  joinDate: string;
  salary: string;
  email: string;
  phone: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  fullName: "",
  nickname: "",
  machinePin: "",
  departmentId: "",
  positionId: "",
  workScheduleId: "",
  joinDate: "",
  salary: "",
  email: "",
  phone: "",
  isActive: true,
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Request gagal");
  }
  return res.json();
}

export default function EmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const [departments, setDepartments] = useState<Ref[]>([]);
  const [positions, setPositions] = useState<Ref[]>([]);
  const [schedules, setSchedules] = useState<Ref[]>([]);

  const [modal, setModal] = useState<null | "add" | "edit" | "delete" | "qr">(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page) });
    if (search) q.set("search", search);
    if (deptFilter) q.set("department_id", deptFilter);
    if (statusFilter) q.set("is_active", statusFilter);
    try {
      const res = await api<{ data: Employee[]; total: number }>(
        `/api/employees?${q.toString()}`
      );
      setRows(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, deptFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<{ id: number; name: string }[]>("/api/departments").then((d) =>
      setDepartments(d.map((x) => ({ id: x.id, name: x.name })))
    );
    api<{ id: number; name: string }[]>("/api/positions").then((d) =>
      setPositions(d.map((x) => ({ id: x.id, name: x.name })))
    );
    api<{ id: number; name: string }[]>("/api/work-schedules").then((d) =>
      setSchedules(d.map((x) => ({ id: x.id, name: x.name })))
    );
  }, []);

  function openAdd() {
    setForm(emptyForm);
    setEditing(null);
    setError("");
    setModal("add");
  }

  function openEdit(e: Employee) {
    setEditing(e);
    setForm({
      fullName: e.fullName,
      nickname: e.nickname ?? "",
      machinePin: e.machinePin ?? "",
      departmentId: e.departmentId ? String(e.departmentId) : "",
      positionId: e.positionId ? String(e.positionId) : "",
      workScheduleId: e.workScheduleId ? String(e.workScheduleId) : "",
      joinDate: "",
      salary: "",
      email: "",
      phone: "",
      isActive: e.isActive,
    });
    setError("");
    setModal("edit");
  }

  function payloadFromForm() {
    return {
      fullName: form.fullName,
      nickname: form.nickname || null,
      machinePin: form.machinePin || null,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      positionId: form.positionId ? Number(form.positionId) : null,
      workScheduleId: form.workScheduleId ? Number(form.workScheduleId) : null,
      joinDate: form.joinDate || null,
      salary: form.salary ? Number(form.salary) : null,
      email: form.email || null,
      phone: form.phone || null,
      isActive: form.isActive,
    };
  }

  async function submitAdd() {
    setError("");
    try {
      await api("/api/employees", { method: "POST", body: JSON.stringify(payloadFromForm()) });
      setModal(null);
      setPage(1);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitEdit() {
    if (!editing) return;
    setError("");
    try {
      await api(`/api/employees/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(payloadFromForm()),
      });
      setModal(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function confirmDelete() {
    if (!editing) return;
    await api(`/api/employees/${editing.id}`, { method: "DELETE" });
    setModal(null);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Directory</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Karyawan
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl bg-white p-3 shadow-sm">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Cari nama / kode…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={deptFilter}
          onChange={(e) => {
            setPage(1);
            setDeptFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Semua departemen</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Semua status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">PIN</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Departemen</th>
              <th className="px-4 py-3">Posisi</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Memuat…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Belum ada karyawan.
                </td>
              </tr>
            ) : (
              rows.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{e.employeeCode}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {e.machinePin ?? <span className="text-red-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{e.fullName}</div>
                    {e.nickname && <div className="text-xs text-slate-400">{e.nickname}</div>}
                  </td>
                  <td className="px-4 py-3">{e.department?.name ?? "—"}</td>
                  <td className="px-4 py-3">{e.position?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        e.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {e.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => {
                          setEditing(e);
                          setModal("qr");
                        }}
                        className="text-slate-500 hover:text-slate-800"
                        disabled={!e.publicToken}
                      >
                        QR
                      </button>
                      <button
                        onClick={() => openEdit(e)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setEditing(e);
                          setModal("delete");
                        }}
                        className="text-red-600 hover:underline"
                      >
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

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} karyawan</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Tambah Karyawan" : "Edit Karyawan"}
          onClose={() => setModal(null)}
        >
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          {editing && (
            <div className="mb-2 text-xs text-slate-400">Kode: {editing.employeeCode}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama lengkap *" className="col-span-2">
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Nama panggilan">
              <input
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="PIN Mesin Absensi" className="col-span-2">
              <input
                value={form.machinePin}
                onChange={(e) => setForm({ ...form, machinePin: e.target.value })}
                className="input"
                placeholder="Nomor PIN terdaftar di mesin (mis. 5)"
              />
            </Field>
            <Field label="Departemen">
              <select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="input"
              >
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Posisi">
              <select
                value={form.positionId}
                onChange={(e) => setForm({ ...form, positionId: e.target.value })}
                className="input"
              >
                <option value="">—</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jadwal kerja">
              <select
                value={form.workScheduleId}
                onChange={(e) => setForm({ ...form, workScheduleId: e.target.value })}
                className="input"
              >
                <option value="">—</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal masuk">
              <input
                type="date"
                value={form.joinDate}
                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Gaji">
              <input
                type="number"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Email">
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Telepon">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
              />
            </Field>
            {modal === "edit" && (
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Aktif
              </label>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              onClick={modal === "add" ? submitAdd : submitEdit}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Simpan
            </button>
          </div>
        </Modal>
      )}

      {modal === "delete" && editing && (
        <Modal title="Hapus Karyawan" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">
            Yakin menghapus <b>{editing.fullName}</b>? (soft delete)
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}

      {modal === "qr" && editing?.publicToken && (
        <Modal title="QR Penilaian Publik" onClose={() => setModal(null)}>
          <div className="flex flex-col items-center gap-3">
            <QRCodeCanvas
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/rate/${editing.publicToken}`}
              size={200}
            />
            <code className="break-all text-xs text-slate-500">
              /rate/{editing.publicToken}
            </code>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`space-y-1 text-sm ${className ?? ""}`}>
      <span className="text-slate-600">{label}</span>
      {children}
    </label>
  );
}
