"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";

type Emp = { id: number; fullName: string; employeeCode: string };
type Indicator = { id: number; category: string; name: string; weight: string | number };
type Template = { id: number; name: string; indicators: Indicator[] };

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

  const scoreColor =
    finalScore === 0 ? "bg-slate-100 text-slate-500" : finalScore >= 4 ? "bg-green-100 text-green-700" : finalScore >= 3 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Penilaian Baru</h1>
        <div className={`rounded-xl px-4 py-2 text-lg font-bold ${scoreColor}`}>
          Skor: {finalScore.toFixed(2)}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Karyawan *</span>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">— pilih —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName} ({e.employeeCode})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Template *</span>
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
          <span className="text-slate-600">Periode</span>
          <input className="input" placeholder="mis. Juli 2026" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </label>
      </div>

      {template && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Indikator</th>
                <th className="px-4 py-3">Bobot</th>
                <th className="px-4 py-3">Skor (1–5)</th>
                <th className="px-4 py-3">Nilai</th>
              </tr>
            </thead>
            <tbody>
              {template.indicators.map((i) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{i.name}</div>
                    <div className="text-xs text-slate-400">{i.category}</div>
                  </td>
                  <td className="px-4 py-3">{Number(i.weight)}%</td>
                  <td className="px-4 py-3">
                    <select
                      className="input w-24"
                      value={scores[i.id] ?? 0}
                      onChange={(e) => setScores({ ...scores, [i.id]: Number(e.target.value) })}
                    >
                      <option value={0}>—</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {(((scores[i.id] ?? 0) * Number(i.weight)) / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {template && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Catatan evaluator</span>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Rencana pengembangan</span>
            <textarea className="input" rows={3} value={devPlan} onChange={(e) => setDevPlan(e.target.value)} />
          </label>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          disabled={saving || !template}
          onClick={() => submit("draft")}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          Simpan Draft
        </button>
        <button disabled={saving || !template} onClick={() => submit("completed")} className="btn-primary disabled:opacity-50">
          Submit Penilaian
        </button>
      </div>
    </div>
  );
}
