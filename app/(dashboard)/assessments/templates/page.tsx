"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";

type Indicator = {
  id: number;
  category: string;
  name: string;
  weight: string | number;
  sortOrder: number;
  description?: string | null;
};
type Template = {
  id: number;
  name: string;
  description: string | null;
  departmentType: string | null;
  isActive: boolean;
  indicators: Indicator[];
  _count?: { assessments: number };
};

export default function TemplatesPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [tplModal, setTplModal] = useState<null | "add" | "edit">(null);
  const [indModal, setIndModal] = useState(false);
  const [current, setCurrent] = useState<Template | null>(null);
  const [tplForm, setTplForm] = useState({ name: "", departmentType: "", description: "", isActive: true });

  const load = useCallback(async () => {
    setRows(await api<Template[]>("/api/assessment-templates"));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function totalWeight(t: Template) {
    return t.indicators.reduce((s, i) => s + Number(i.weight), 0);
  }

  function openAddTpl() {
    setTplForm({ name: "", departmentType: "", description: "", isActive: true });
    setCurrent(null);
    setTplModal("add");
  }
  function openEditTpl(t: Template) {
    setCurrent(t);
    setTplForm({
      name: t.name,
      departmentType: t.departmentType ?? "",
      description: t.description ?? "",
      isActive: t.isActive,
    });
    setTplModal("edit");
  }
  async function saveTpl() {
    const payload = {
      name: tplForm.name,
      departmentType: tplForm.departmentType || null,
      description: tplForm.description || null,
      isActive: tplForm.isActive,
    };
    if (tplModal === "add") {
      await api("/api/assessment-templates", { method: "POST", body: JSON.stringify(payload) });
    } else if (current) {
      await api(`/api/assessment-templates/${current.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }
    setTplModal(null);
    load();
  }
  async function delTpl(t: Template) {
    if (!confirm(`Hapus template "${t.name}"? Semua penilaian terkait ikut terhapus.`)) return;
    await api(`/api/assessment-templates/${t.id}`, { method: "DELETE" });
    load();
  }

  async function openIndicators(t: Template) {
    const fresh = await api<Template>(`/api/assessment-templates/${t.id}`);
    setCurrent(fresh);
    setIndModal(true);
  }
  async function refreshCurrent() {
    if (!current) return;
    const fresh = await api<Template>(`/api/assessment-templates/${current.id}`);
    setCurrent(fresh);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Template Penilaian</h1>
        <button onClick={openAddTpl} className="btn-primary">
          + Template
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Target Dept</th>
              <th className="px-4 py-3">Indikator</th>
              <th className="px-4 py-3">Total Bobot</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Belum ada template.
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const tw = totalWeight(t);
                return (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                    <td className="px-4 py-3">{t.departmentType ?? "—"}</td>
                    <td className="px-4 py-3">{t.indicators.length}</td>
                    <td className={`px-4 py-3 font-medium ${tw === 100 ? "text-green-600" : "text-red-600"}`}>
                      {tw}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          t.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {t.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => openIndicators(t)} className="text-slate-600 hover:underline">
                          Indikator
                        </button>
                        <button onClick={() => openEditTpl(t)} className="text-blue-600 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => delTpl(t)} className="text-red-600 hover:underline">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {tplModal && (
        <Modal title={tplModal === "add" ? "Tambah Template" : "Edit Template"} onClose={() => setTplModal(null)}>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600">Nama *</span>
              <input className="input" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600">Target departemen</span>
              <input className="input" value={tplForm.departmentType} onChange={(e) => setTplForm({ ...tplForm, departmentType: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600">Deskripsi</span>
              <textarea className="input" rows={2} value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={tplForm.isActive} onChange={(e) => setTplForm({ ...tplForm, isActive: e.target.checked })} />
              Aktif
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setTplModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Batal
            </button>
            <button onClick={saveTpl} className="btn-primary">
              Simpan
            </button>
          </div>
        </Modal>
      )}

      {indModal && current && (
        <IndicatorsModal template={current} onClose={() => setIndModal(false)} onChange={refreshCurrent} />
      )}
    </div>
  );
}

function IndicatorsModal({
  template,
  onClose,
  onChange,
}: {
  template: Template;
  onClose: () => void;
  onChange: () => void;
}) {
  const [form, setForm] = useState({ category: "", name: "", weight: "", sortOrder: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const total = template.indicators.reduce((s, i) => s + Number(i.weight), 0);

  async function save() {
    if (!form.category || !form.name || !form.weight) return;
    const payload = {
      category: form.category,
      name: form.name,
      weight: Number(form.weight),
      sortOrder: Number(form.sortOrder || template.indicators.length + 1),
    };
    if (editingId) {
      await api(`/api/assessment-indicators/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await api(`/api/assessment-templates/${template.id}/indicators`, { method: "POST", body: JSON.stringify(payload) });
    }
    setForm({ category: "", name: "", weight: "", sortOrder: "" });
    setEditingId(null);
    onChange();
  }
  async function del(id: number) {
    await api(`/api/assessment-indicators/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <Modal title={`Indikator — ${template.name}`} onClose={onClose}>
      <table className="mb-3 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-1">#</th>
            <th className="py-1">Kategori</th>
            <th className="py-1">Nama</th>
            <th className="py-1">Bobot</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {template.indicators.map((i) => (
            <tr key={i.id} className="border-t border-slate-100">
              <td className="py-1">{i.sortOrder}</td>
              <td className="py-1">{i.category}</td>
              <td className="py-1">{i.name}</td>
              <td className="py-1">{Number(i.weight)}%</td>
              <td className="py-1 text-right text-xs">
                <button
                  onClick={() => {
                    setEditingId(i.id);
                    setForm({ category: i.category, name: i.name, weight: String(Number(i.weight)), sortOrder: String(i.sortOrder) });
                  }}
                  className="mr-2 text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button onClick={() => del(i.id)} className="text-red-600 hover:underline">
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`mb-3 text-sm font-medium ${total === 100 ? "text-green-600" : "text-red-600"}`}>
        Total bobot: {total}% {total !== 100 && "(harus 100%)"}
      </div>
      <div className="grid grid-cols-4 gap-2">
        <input className="input" placeholder="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="input" placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" type="number" placeholder="Bobot" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
        <button onClick={save} className="btn-primary">
          {editingId ? "Update" : "Tambah"}
        </button>
      </div>
    </Modal>
  );
}
