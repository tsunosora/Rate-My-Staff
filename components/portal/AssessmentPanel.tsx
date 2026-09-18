"use client";

import { IconStar } from "@/components/ui/icons";
import { Card, Empty, longDate, soft } from "./ui";
import type { Assessment, Overview, ScoreRow } from "./types";

/** Detail penilaian kinerja terakhir + riwayat skor + masukan tamu. */
export function AssessmentPanel({ data }: { data: Overview }) {
  const { latest, history, average } = data.assessment;
  const feedback = data.publicFeedback;

  return (
    <div className="space-y-4">
      {latest ? (
        <Card title="Penilaian terakhir">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="tabular font-display text-4xl font-extrabold text-fg">
              {latest.totalScore.toFixed(2)}
            </span>
            <div>
              <span className="badge" style={{ ...soft("var(--primary)", 18), color: "var(--primary)" }}>
                {latest.grade ?? "—"}
              </span>
              <p className="mt-1 text-xs text-muted">
                {latest.template} · {latest.period ?? longDate(latest.date)}
              </p>
            </div>
          </div>

          {latest.scores.length > 0 && <IndicatorList scores={latest.scores} />}

          <Notes latest={latest} />
        </Card>
      ) : (
        <Card title="Penilaian terakhir">
          <Empty>Belum ada penilaian kinerja untuk Anda.</Empty>
        </Card>
      )}

      {history.length > 1 && (
        <Card title={`Riwayat skor · rata-rata ${average.toFixed(2)}`}>
          <ul className="space-y-2">
            {[...history].reverse().map((h) => (
              <li key={h.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-muted">{h.period ?? longDate(h.date)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-2"
                    style={{ width: `${Math.min(100, (h.totalScore / 5) * 100)}%` }}
                  />
                </div>
                <span className="tabular w-10 shrink-0 text-right text-sm font-semibold text-fg">
                  {h.totalScore.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={`Masukan tamu (QR) · ${feedback.count > 0 ? `${feedback.average.toFixed(2)} ★` : "belum ada"}`}>
        {feedback.items.length === 0 ? (
          <Empty>Belum ada masukan dari pelanggan.</Empty>
        ) : (
          <ul className="space-y-3">
            {feedback.items.map((f) => (
              <li key={f.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <IconStar
                        key={i}
                        className="text-[13px]"
                        fill={i < f.stars ? "currentColor" : "none"}
                      />
                    ))}
                  </span>
                  <span className="text-xs text-subtle">{longDate(f.date)}</span>
                </div>
                {f.comment && <p className="mt-1.5 text-sm text-muted">“{f.comment}”</p>}
                <p className="mt-1 text-xs text-subtle">— {f.raterName ?? "Anonim"}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function IndicatorList({ scores }: { scores: ScoreRow[] }) {
  // Kelompokkan per kategori supaya mudah dibaca karyawan.
  const byCategory = scores.reduce<Record<string, ScoreRow[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-4">
      {Object.entries(byCategory).map(([category, list]) => (
        <div key={category}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">{category}</h3>
          <ul className="space-y-2.5">
            {list.map((s, i) => (
              <li key={`${s.indicator}-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-fg">{s.indicator}</span>
                  <span className="tabular shrink-0 text-sm font-semibold text-fg">
                    {s.score}
                    <span className="text-xs font-normal text-subtle">/5 · bobot {s.weight}%</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(s.score / 5) * 100}%`,
                      background: s.score >= 4 ? "var(--success)" : s.score >= 3 ? "var(--warning)" : "var(--danger)",
                    }}
                  />
                </div>
                {s.notes && <p className="mt-1 text-xs italic text-subtle">{s.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Notes({ latest }: { latest: Assessment }) {
  const blocks = [
    { title: "Catatan penilai", body: latest.evaluatorNotes },
    { title: "Rencana pengembangan", body: latest.developmentPlan },
    { title: "Rekomendasi", body: latest.recommendation },
  ].filter((b) => b.body);

  if (blocks.length === 0) return null;

  return (
    <div className="mt-5 space-y-3 border-t border-border pt-4">
      {blocks.map((b) => (
        <div key={b.title}>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle">{b.title}</h3>
          <p className="text-sm leading-relaxed text-muted">{b.body}</p>
        </div>
      ))}
    </div>
  );
}
