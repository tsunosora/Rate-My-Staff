"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { IconCheck } from "@/components/ui/icons";

type Emp = { id: number; fullName: string; employeeCode: string };
type Indicator = { id: number; category: string; name: string; weight: string | number };
type Template = { id: number; name: string; indicators: Indicator[] };

function softChip(color: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${color} 16%, transparent)`, color };
}

export default function CreateSinglePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [template, setTemplate] = useState<Template | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [period, setPeriod] = useState("");
  const [notes, setNotes] = useState("");
  const [devPlan, setDevPlan] = useState("");
  const [error, setError] = useState("");
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
      setScores({});
      return;
    }
    api<Template>(`/api/assessment-templates/${templateId}`).then((t) => {
      setTemplate(t);
      setScores(Object.fromEntries(t.indicators.map((i) => [i.id, 0])));
    });
  }, [templateId]);

  const finalScore = useMemo(() => {
    if (!template) return 0;
    const total = template.indicators.reduce(
      (sum, i) => sum + ((scores[i.id] ?? 0) * Number(i.weight)) / 100,
      0
    );
    return Math.round(total * 100) / 100;
  }, [template, scores]);

  const scoreTone =
    finalScore === 0 ? "var(--fg-subtle)" : finalScore >= 4 ? "var(--success)" : finalScore >= 3 ? "var(--warning)" : "var(--danger)";

  async function submit(status: "draft" | "completed") {
    setError("");
    if (!employeeId || !templateId || !template) {
      setError("Pilih karyawan dan template dulu.");
      return;
    }
    if (status === "completed" && template.indicators.some((i) => !scores[i.id])) {
      setError("Semua indikator harus diberi skor 1–5 untuk submit.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/assessments/single", {
        method: "POST",
        body: JSON.stringify({
          employeeId: Number(employeeId),
          templateId: Number(templateId),
          period: period || null,
          evaluatorNotes: notes || null,
          developmentPlan: devPlan || null,
          status,
          scores: template.indicators
            .filter((i) => scores[i.id])
            .map((i) => ({ indicatorId: i.id, score: scores[i.id] })),
        }),
      });
      router.push("/reports");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Penilaian Baru</h1>
          <p className="mt-0.5 text-sm text-muted">Nilai kinerja karyawan berdasarkan template indikator.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={softChip(scoreTone)}>
          <span className="text-xs font-medium opacity-80">Skor akhir</span>
          <span className="tabular font-display text-2xl font-extrabold">{finalScore.toFixed(2)}</span>
        </div>
      </div>

      {error && <div className="rounded-xl px-3 py-2.5 text-sm text-danger" style={softChip("var(--danger)")}>{error}</div>}

      <div className="glass grid gap-4 rounded-2xl p-5 md:grid-cols-3">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-muted">Karyawan *</span>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">— pilih —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-muted">Template *</span>
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">— pilih —</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-muted">Periode</span>
          <input className="input" placeholder="mis. Juli 2026" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </label>
      </div>

      {template && (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                  <th className="px-4 py-3 font-medium">Indikator</th>
                  <th className="px-4 py-3 font-medium">Bobot</th>
                  <th className="px-4 py-3 font-medium">Skor (1–5)</th>
                  <th className="px-4 py-3 font-medium">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {template.indicators.map((i) => (
                  <tr key={i.id} className="border-t border-border transition hover:bg-surface">
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{i.name}</div>
                      <div className="text-xs text-subtle">{i.category}</div>
                    </td>
                    <td className="px-4 py-3 tabular text-muted">{Number(i.weight)}%</td>
                    <td className="px-4 py-3">
                      <select
                        className="input w-24"
                        value={scores[i.id] ?? 0}
                        onChange={(e) => setScores({ ...scores, [i.id]: Number(e.target.value) })}
                      >
                        <option value={0}>—</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 tabular font-medium text-fg">
                      {(((scores[i.id] ?? 0) * Number(i.weight)) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {template && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="glass space-y-1.5 rounded-2xl p-4 text-sm">
            <span className="font-medium text-muted">Catatan evaluator</span>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label className="glass space-y-1.5 rounded-2xl p-4 text-sm">
            <span className="font-medium text-muted">Rencana pengembangan</span>
            <textarea className="input" rows={3} value={devPlan} onChange={(e) => setDevPlan(e.target.value)} />
          </label>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button disabled={saving || !template} onClick={() => submit("draft")} className="btn-ghost disabled:opacity-50">
          Simpan Draft
        </button>
        <button disabled={saving || !template} onClick={() => submit("completed")} className="btn-primary disabled:opacity-50">
          <IconCheck className="text-[16px]" /> Submit Penilaian
        </button>
      </div>
    </div>
  );
}
