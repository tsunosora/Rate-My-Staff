"use client";

import { use, useEffect, useState } from "react";
import { IconStar, IconCheck, IconAlert } from "@/components/ui/icons";

type Emp = { fullName: string; nickname: string | null; position: string | null; department: string | null };

function softChip(c: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} 16%, transparent)` };
}

export default function RatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [emp, setEmp] = useState<Emp | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [raterName, setRaterName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/public/employee/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setEmp)
      .catch(() => setNotFound(true));
  }, [token]);

  async function submit() {
    if (!rating) {
      setError("Pilih bintang dulu.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/public/employee/${token}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, raterName: raterName || null, feedback: feedback || null }),
    });
    setSaving(false);
    if (res.ok) setDone(true);
    else setError("Gagal mengirim. Coba lagi.");
  }

  if (notFound) {
    return (
      <Centered>
        <div className="glass-2 relative z-10 w-full max-w-md rounded-3xl p-6 text-center shadow-2xl sm:p-8">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl text-danger" style={softChip("var(--danger)")}>
            <IconAlert className="text-[26px]" />
          </span>
          <p className="text-muted">Tautan tidak valid atau karyawan tidak ditemukan.</p>
        </div>
      </Centered>
    );
  }
  if (!emp) return <Centered><Spinner /></Centered>;

  if (done) {
    return (
      <Centered>
        <div className="glass-2 relative z-10 w-full max-w-md rounded-3xl p-6 text-center shadow-2xl sm:p-8">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-success" style={softChip("var(--success)")}>
            <IconCheck className="text-[28px]" />
          </span>
          <h2 className="font-display text-xl font-bold text-fg">Terima kasih!</h2>
          <p className="mt-1 text-muted">Penilaian Anda untuk {emp.fullName} telah terkirim.</p>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="glass-2 relative z-10 w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-2 text-on-primary shadow-lg shadow-primary/30">
            <span className="font-display text-xl font-extrabold">R</span>
          </span>
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">RateMyStaff</div>
          <h1 className="mt-2 font-display text-xl font-bold text-fg">{emp.fullName}</h1>
          <p className="text-sm text-muted">{emp.position ?? emp.department ?? "Karyawan"}</p>
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger" style={softChip("var(--danger)")}>
            <IconAlert className="text-[16px]" /> {error}
          </div>
        )}

        <div className="mb-5 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className={`text-4xl transition ${(hover || rating) >= n ? "text-warning" : "text-subtle"}`}
              aria-label={`${n} bintang`}
            >
              <IconStar className="text-[36px]" fill={(hover || rating) >= n ? "currentColor" : "none"} />
            </button>
          ))}
        </div>

        <label className="mb-3 block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Nama Anda (opsional)</span>
          <input
            className="input h-11"
            placeholder="Nama Anda"
            value={raterName}
            onChange={(e) => setRaterName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="mb-4 block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Masukan / feedback (opsional)</span>
          <textarea
            className="input"
            rows={3}
            maxLength={1000}
            placeholder="Tulis masukan Anda…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </label>
        <button
          onClick={submit}
          disabled={saving}
          className="btn-primary h-11 w-full"
        >
          {saving ? "Mengirim…" : "Kirim Penilaian"}
        </button>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="ambient relative flex min-h-screen items-center justify-center bg-bg p-4">
      {children}
    </main>
  );
}
function Spinner() {
  return <div className="relative z-10 h-8 w-8 animate-spin rounded-full border-4 border-border-strong border-t-primary" />;
}
