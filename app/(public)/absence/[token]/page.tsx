"use client";

import { use, useEffect, useState } from "react";
import { IconCheck, IconAlert, IconClock, IconAttendance } from "@/components/ui/icons";

type Emp = { id: number; fullName: string };
const STATUSES = [
  { value: "Izin", label: "Izin" },
  { value: "Sakit", label: "Sakit" },
  { value: "Cuti", label: "Cuti" },
];

function softChip(c: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} 16%, transparent)` };
}

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
        <div className="glass-2 relative z-10 w-full max-w-md rounded-3xl p-6 text-center shadow-2xl sm:p-8">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-success" style={softChip("var(--success)")}>
            <IconCheck className="text-[28px]" />
          </span>
          <h2 className="font-display text-xl font-bold text-fg">Terkirim!</h2>
          <p className="mt-1 text-muted">Laporan ketidakhadiran Anda telah dicatat.</p>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="glass-2 relative z-10 w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-2 text-on-primary shadow-lg shadow-primary/30">
            <IconAttendance className="text-[22px]" />
          </span>
          <h1 className="font-display text-xl font-bold text-fg">Formulir Ketidakhadiran</h1>
          <p className="text-sm text-muted">Laporkan izin, sakit, atau cuti Anda.</p>
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger" style={softChip("var(--danger)")}>
            <IconAlert className="text-[16px]" /> {error}
          </div>
        )}

        <label className="mb-3 block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Nama karyawan *</span>
          <select className="input h-11" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">— pilih —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
        </label>

        <label className="mb-3 block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Tanggal *</span>
          <input type="date" className="input h-11" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="mb-3">
          <span className="mb-1.5 block text-sm font-medium text-muted">Jenis *</span>
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                  status === s.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border-strong text-muted hover:bg-surface-2"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mb-4 block space-y-1.5 text-sm">
          <span className="font-medium text-muted">Alasan *</span>
          <textarea
            className="input"
            rows={3}
            maxLength={1000}
            placeholder="Tulis alasan Anda…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button onClick={submit} disabled={saving} className="btn-primary h-11 w-full">
          {saving ? "Mengirim…" : "Kirim"}
        </button>
      </div>
    </Centered>
  );
}

function ExpiredView() {
  return (
    <Centered>
      <div className="glass-2 relative z-10 w-full max-w-md rounded-3xl p-6 text-center shadow-2xl sm:p-8">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-warning" style={softChip("var(--warning)")}>
          <IconClock className="text-[26px]" />
        </span>
        <h2 className="font-display text-xl font-bold text-fg">Tautan Kadaluarsa</h2>
        <p className="mt-1 text-muted">Tautan ini sudah tidak berlaku. Hubungi HR untuk tautan baru.</p>
      </div>
    </Centered>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <main className="ambient relative flex min-h-screen items-center justify-center bg-bg p-4">{children}</main>;
}
function Spinner() {
  return <div className="relative z-10 h-8 w-8 animate-spin rounded-full border-4 border-border-strong border-t-primary" />;
}
