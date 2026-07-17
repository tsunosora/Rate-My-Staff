"use client";

import { use, useEffect, useState } from "react";

type Emp = { id: number; fullName: string };
const STATUSES = [
  { value: "Izin", emoji: "📝" },
  { value: "Sakit", emoji: "🤒" },
  { value: "Cuti", emoji: "🏖️" },
];

export default function AbsencePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("Izin");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/public/absence-form/${token}`)
      .then(async (r) => {
        if (r.status === 410) {
          setExpired(true);
          return null;
        }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((d) => d && setEmployees(d.employees))
      .catch(() => setExpired(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    if (!employeeId || !reason.trim()) {
      setError("Lengkapi nama dan alasan.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/public/absence-form/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: Number(employeeId), date, status, reason }),
    });
    setSaving(false);
    if (res.ok) setDone(true);
    else if (res.status === 410) setExpired(true);
    else setError("Gagal mengirim. Coba lagi.");
  }

  if (loading) return <Centered><Spinner /></Centered>;
  if (expired) return <ExpiredView />;

  if (done) {
    return (
      <Centered>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
          <h2 className="text-xl font-bold text-slate-800">Terkirim!</h2>
          <p className="mt-1 text-slate-500">Laporan ketidakhadiran Anda telah dicatat.</p>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-5 text-center">
          <div className="text-2xl">🗓️</div>
          <h1 className="text-xl font-bold text-slate-800">Formulir Ketidakhadiran</h1>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <label className="mb-3 block space-y-1 text-sm">
          <span className="text-slate-600">Nama karyawan *</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">— pilih —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </label>

        <label className="mb-3 block space-y-1 text-sm">
          <span className="text-slate-600">Tanggal *</span>
          <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`rounded-lg border px-2 py-2 text-sm ${status === s.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600"}`}
            >
              {s.emoji} {s.value}
            </button>
          ))}
        </div>

        <textarea
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          maxLength={1000}
          placeholder="Alasan *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button onClick={submit} disabled={saving} className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
          {saving ? "Mengirim…" : "Kirim"}
        </button>
      </div>
    </Centered>
  );
}

function ExpiredView() {
  return (
    <Centered>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">⏰</div>
        <h2 className="text-xl font-bold text-slate-800">Tautan Kadaluarsa</h2>
        <p className="mt-1 text-slate-500">Tautan ini sudah tidak berlaku. Hubungi HR untuk tautan baru.</p>
      </div>
    </Centered>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-slate-100 to-purple-100 p-4">{children}</main>;
}
function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-500" />;
}
