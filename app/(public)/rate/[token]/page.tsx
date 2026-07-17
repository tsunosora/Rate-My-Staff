"use client";

import { use, useEffect, useState } from "react";

type Emp = { fullName: string; nickname: string | null; position: string | null; department: string | null };

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
    return <Centered><p className="text-slate-600">Tautan tidak valid atau karyawan tidak ditemukan.</p></Centered>;
  }
  if (!emp) return <Centered><Spinner /></Centered>;

  if (done) {
    return (
      <Centered>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
          <h2 className="text-xl font-bold text-slate-800">Terima kasih!</h2>
          <p className="mt-1 text-slate-500">Penilaian Anda untuk {emp.fullName} telah terkirim.</p>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="w-full max-w-sm rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur">
        <div className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-indigo-500">RateMyStaff</div>
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-800">{emp.fullName}</h1>
          <p className="text-sm text-slate-500">{emp.position ?? emp.department ?? "Karyawan"}</p>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <div className="mb-4 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className={`text-4xl transition ${(hover || rating) >= n ? "text-yellow-400" : "text-slate-300"}`}
              aria-label={`${n} bintang`}
            >
              ★
            </button>
          ))}
        </div>

        <input
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Nama Anda (opsional)"
          value={raterName}
          onChange={(e) => setRaterName(e.target.value)}
        />
        <textarea
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          maxLength={1000}
          placeholder="Masukan / feedback (opsional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? "Mengirim…" : "Kirim Penilaian"}
        </button>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-slate-100 to-purple-100 p-4">
      {children}
    </main>
  );
}
function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-500" />;
}
