"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";

type Emp = { id: number; fullName: string; employeeCode: string; department?: { name: string } | null };
type Indicator = { id: number; name: string; weight: string | number };
type Template = { id: number; name: string; indicators: Indicator[] };

function softChip(c: string) {
  return { background: `color-mix(in oklab, ${c} 16%, transparent)`, color: c };
}

export default function BulkPage() {
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [template, setTemplate] = useState<Template | null>(null);
  const [scores, setScores] = useState<Record<number, Record<number, number>>>({});
  const [period, setPeriod] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Emp[]>("/api/assessments/employees").then(setEmployees);
    api<{ id: number; name: string }[]>("/api/assessment-templates").then((t) =>
      setTemplates(t.map((x) => ({ id: x.id, name: x.name })))
    );
  }, []);

  useEffect(() => {
    if (!templateId) {
      setTemplate(null);
      return;
    }
    (async () => {
      const t = await api<Template>(`/api/assessment-templates/${templateId}`);
      setTemplate(t);
      const prev = await api<Record<number, Record<number, number>>>(
        `/api/assessment-templates/${templateId}/scores`
      );
      setScores(prev ?? {});
    })();
  }, [templateId]);

  function setScore(empId: number, indId: number, val: number) {
    setScores((s) => ({ ...s, [empId]: { ...(s[empId] ?? {}), [indId]: val } }));
  }
  function rowComplete(empId: number) {
    if (!template) return false;
    return template.indicators.every((i) => scores[empId]?.[i.id]);
  }
  function rowFinal(empId: number) {
    if (!template) return 0;
    const t = template.indicators.reduce(
      (sum, i) => sum + ((scores[empId]?.[i.id] ?? 0) * Number(i.weight)) / 100,
      0
    );
    return Math.round(t * 100) / 100;
  }

  async function saveAll(status: "draft" | "completed") {
    if (!template) return;
    const targets = employees.filter((e) =>
      status === "completed" ? rowComplete(e.id) : template.indicators.some((i) => scores[e.id]?.[i.id])
    );
    if (targets.length === 0) {
      setMsg("Tidak ada baris yang bisa disimpan.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      await Promise.all(
        targets.map((e) =>
          api("/api/assessments/single", {
            method: "POST",
            body: JSON.stringify({
              employeeId: e.id,
              templateId: template.id,
              period: period || null,
              status,
              scores: template.indicators
                .filter((i) => scores[e.id]?.[i.id])
                .map((i) => ({ indicatorId: i.id, score: scores[e.id][i.id] })),
            }),
          })
        )
      );
      setMsg(`${targets.length} penilaian tersimpan (${status}).`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Penilaian Massal</h1>
          <p className="mt-0.5 text-sm text-muted">Nilai banyak karyawan sekaligus dengan satu template.</p>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-sm text-muted">{msg}</span>}
          <button disabled={saving || !template} onClick={() => saveAll("draft")} className="btn-ghost disabled:opacity-50">
            Simpan Draft
          </button>
          <button disabled={saving || !template} onClick={() => saveAll("completed")} className="btn-primary disabled:opacity-50">
            Submit Semua
          </button>
        </div>
      </div>

      <div className="glass grid gap-3 rounded-2xl p-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted">Template *</span>
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">— pilih —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Periode</span>
          <input className="input" placeholder="mis. Juli 2026" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </label>
      </div>

      {template && (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                <th className="px-3 py-2 font-medium">Karyawan</th>
                {template.indicators.map((i) => (
                  <th key={i.id} className="px-3 py-2 font-medium" title={`${Number(i.weight)}%`}>
                    {i.name}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">Skor</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const fin = rowFinal(e.id);
                const done = rowComplete(e.id);
                return (
                  <tr key={e.id} className="border-t border-border transition hover:bg-surface">
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">{e.fullName}</div>
                      <div className="text-xs text-subtle">{e.department?.name ?? "—"}</div>
                    </td>
                    {template.indicators.map((i) => (
                      <td key={i.id} className="px-3 py-2">
                        <select
                          className="input w-16"
                          value={scores[e.id]?.[i.id] ?? 0}
                          onChange={(ev) => setScore(e.id, i.id, Number(ev.target.value))}
                        >
                          <option value={0}>—</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                    <td className={`tabular px-3 py-2 font-medium ${fin >= 4 ? "text-success" : fin >= 3 ? "text-warning" : fin > 0 ? "text-danger" : "text-subtle"}`}>
                      {fin.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge" style={softChip(done ? "var(--success)" : "var(--fg-subtle)")}>
                        {done ? "Siap" : "Belum"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
