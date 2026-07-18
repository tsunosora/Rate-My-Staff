"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconPlus } from "@/components/ui/icons";

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

function softChip(c: string) {
  return { background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c };
}

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
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Template Penilaian</h1>
          <p className="mt-0.5 text-sm text-muted">Susun indikator &amp; bobot penilaian per departemen.</p>
        </div>
        <button onClick={openAddTpl} className="btn-primary">
          <IconPlus className="text-[17px]" /> Template
        </button>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-subtle">
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Target Dept</th>
              <th className="px-4 py-3 font-medium">Indikator</th>
              <th className="px-4 py-3 font-medium">Total Bobot</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-subtle">
                  Belum ada template.
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const tw = totalWeight(t);
                return (
                  <tr key={t.id} className="border-t border-border transition hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-fg">{t.name}</td>
                    <td className="px-4 py-3 text-muted">{t.departmentType ?? "—"}</td>
                    <td className="tabular px-4 py-3 text-muted">{t.indicators.length}</td>
                    <td className={`tabular px-4 py-3 font-medium ${tw === 100 ? "text-success" : "text-danger"}`}>
                      {tw}%
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge" style={softChip(t.isActive ? "var(--success)" : "var(--fg-subtle)")}>
                        {t.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => openIndicators(t)} className="font-medium text-muted transition hover:text-fg hover:underline">
                          Indikator
                        </button>
                        <button onClick={() => openEditTpl(t)} className="font-medium text-primary hover:underline">
                          Edit
                        </button>
                        <button onClick={() => delTpl(t)} className="font-medium text-danger hover:underline">
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
              <span className="text-muted">Nama *</span>
              <input className="input" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted">Target departemen</span>
              <input className="input" value={tplForm.departmentType} onChange={(e) => setTplForm({ ...tplForm, departmentType: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted">Deskripsi</span>
              <textarea className="input" rows={2} value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={tplForm.isActive} onChange={(e) => setTplForm({ ...tplForm, isActive: e.target.checked })} />
              Aktif
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setTplModal(null)} className="btn-ghost">
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
    <Modal title={`Indikator — ${template.name}`} onClose={onClose} size="xl">
      <table className="mb-3 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-subtle">
          <tr>
            <th className="py-1 font-medium">#</th>
            <th className="py-1 font-medium">Kategori</th>
            <th className="py-1 font-medium">Nama</th>
            <th className="py-1 font-medium">Bobot</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {template.indicators.map((i) => (
            <tr key={i.id} className="border-t border-border">
              <td className="tabular py-1 text-muted">{i.sortOrder}</td>
              <td className="py-1 text-muted">{i.category}</td>
              <td className="py-1 text-fg">{i.name}</td>
              <td className="tabular py-1 text-muted">{Number(i.weight)}%</td>
              <td className="py-1 text-right text-xs">
                <button
                  onClick={() => {
                    setEditingId(i.id);
                    setForm({ category: i.category, name: i.name, weight: String(Number(i.weight)), sortOrder: String(i.sortOrder) });
                  }}
                  className="mr-2 font-medium text-primary hover:underline"
                >
                  Edit
                </button>
                <button onClick={() => del(i.id)} className="font-medium text-danger hover:underline">
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`mb-3 text-sm font-medium ${total === 100 ? "text-success" : "text-danger"}`}>
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
