"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconAlert, IconCheck, IconTrash } from "@/components/ui/icons";

type Enrollment = {
  id: number;
  pin: string;
  deviceName: string | null;
  employeeId: number;
  employeeName: string;
};

type Pending = {
  pin: string;
  count: number;
  firstAt: string | null;
  lastAt: string | null;
  suggestion: { employeeId: number; fullName: string; machineName: string } | null;
};

type Payload = {
  machine: { id: number; name: string; mode: string };
  enrollments: Enrollment[];
  pending: Pending[];
  otherMachines: { id: number; name: string; enrollments: number }[];
};

function soft(c: string, pct = 16): React.CSSProperties {
  return { background: `color-mix(in oklab, ${c} ${pct}%, transparent)` };
}

/**
 * Kelola PIN mesin: petakan PIN ke karyawan, salin dari mesin lain, dan tarik ulang
 * scan yang sempat terbuang. Berlaku untuk mesin mode cloud maupun LAN.
 */
export function MachineEnrollmentsModal({
  machineId,
  employees,
  onClose,
  onChanged,
}: {
  machineId: number;
  employees: { id: number; name: string }[];
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [pilih, setPilih] = useState<Record<string, string>>({});
  const [asal, setAsal] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await api<Payload>(`/api/machines/${machineId}/enrollments`);
    setData(d);
    // Usulan dari mesin lain langsung terisi agar owner tinggal menekan Simpan.
    setPilih((prev) => {
      const next = { ...prev };
      for (const p of d.pending) {
        if (!next[p.pin] && p.suggestion) next[p.pin] = String(p.suggestion.employeeId);
      }
      return next;
    });
    if (!asal && d.otherMachines.length > 0) setAsal(String(d.otherMachines[0].id));
  }, [machineId, asal]);

  useEffect(() => {
    load().catch((e: unknown) => setErr(e instanceof Error ? e.message : "Gagal memuat."));
  }, [load]);

  async function kirim(body: Record<string, unknown>, sukses: (r: Hasil) => string) {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await api<Hasil>(`/api/machines/${machineId}/enrollments`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMsg(sukses(r));
      await load();
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  const totalTertahan = (data?.pending ?? []).reduce((a, p) => a + p.count, 0);

  return (
    <Modal title={`PIN Mesin — ${data?.machine.name ?? ""}`} onClose={onClose} size="xl">
      {err && (
        <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="text-[16px] shrink-0" /> {err}
        </div>
      )}
      {msg && (
        <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-success" style={soft("var(--success)")}>
          <IconCheck className="text-[16px] shrink-0" /> {msg}
        </div>
      )}

      {!data ? (
        <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
      ) : (
        <div className="space-y-5">
          {data.pending.length > 0 && (
            <section
              className="rounded-xl border p-3"
              style={{ ...soft("var(--danger)", 10), borderColor: "color-mix(in oklab, var(--danger) 35%, transparent)" }}
            >
              <h3 className="text-sm font-bold text-fg">
                {data.pending.length} PIN belum dipetakan — {totalTertahan} scan tertahan
              </h3>
              <p className="mt-0.5 mb-3 text-xs text-muted">
                Orang-orang ini sudah absen di mesin ini, tapi scan-nya belum masuk karena PIN-nya
                belum dikenali. Pilih karyawannya lalu Simpan — scan yang tertahan langsung ditarik.
              </p>
              <ul className="space-y-2">
                {data.pending.map((p) => (
                  <li key={p.pin} className="flex flex-wrap items-center gap-2">
                    <span className="w-14 shrink-0 font-mono text-sm text-fg">PIN {p.pin}</span>
                    <span className="w-24 shrink-0 text-xs text-muted">{p.count} scan</span>
                    <select
                      className="input h-9 flex-1"
                      value={pilih[p.pin] ?? ""}
                      onChange={(e) => setPilih({ ...pilih, [p.pin]: e.target.value })}
                    >
                      <option value="">— pilih karyawan —</option>
                      {employees.map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                    <button
                      disabled={busy || !pilih[p.pin]}
                      onClick={() =>
                        kirim(
                          { action: "map", pin: p.pin, employeeId: Number(pilih[p.pin]) },
                          (r) => `PIN ${p.pin} dipetakan · ${r.synced ?? 0} scan masuk.`
                        )
                      }
                      className="btn-primary h-9 px-3 text-xs"
                    >
                      Simpan
                    </button>
                    {p.suggestion && (
                      <span className="w-full text-[11px] text-subtle">
                        usulan: {p.suggestion.fullName} (PIN sama di {p.suggestion.machineName})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.otherMachines.length > 0 && (
            <section className="rounded-xl border border-border p-3">
              <h3 className="mb-2 text-sm font-bold text-fg">Salin pendaftaran dari mesin lain</h3>
              <div className="flex flex-wrap items-center gap-2">
                <select className="input h-9 flex-1" value={asal} onChange={(e) => setAsal(e.target.value)}>
                  {data.otherMachines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.enrollments} PIN)</option>
                  ))}
                </select>
                <button
                  disabled={busy || !asal}
                  onClick={() =>
                    kirim(
                      { action: "copy", fromMachineId: Number(asal) },
                      (r) => `${r.copied ?? 0} PIN disalin, ${r.skipped ?? 0} dilewati · ${r.synced ?? 0} scan masuk.`
                    )
                  }
                  className="btn-primary h-9 px-3 text-xs"
                >
                  Salin
                </button>
              </div>
              <p className="mt-1.5 text-xs text-subtle">
                Berguna bila karyawan memakai PIN yang sama di kedua mesin. PIN yang sudah ada di
                mesin ini tidak ditimpa.
              </p>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-fg">
                Sudah terdaftar ({data.enrollments.length})
              </h3>
              <button
                disabled={busy}
                onClick={() =>
                  kirim({ action: "reingest" }, (r) => `${r.synced ?? 0} scan ditarik dari ${r.total ?? 0} rekaman.`)
                }
                className="btn-ghost h-8 px-2.5 text-xs"
              >
                Tarik ulang scan
              </button>
            </div>
            {data.enrollments.length === 0 ? (
              <p className="py-4 text-center text-sm text-subtle">Belum ada PIN terdaftar.</p>
            ) : (
              <ul className="max-h-60 space-y-1 overflow-y-auto">
                {data.enrollments.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-2">
                    <span className="w-14 shrink-0 font-mono text-xs text-muted">PIN {e.pin}</span>
                    <span className="flex-1 truncate text-fg">{e.employeeName}</span>
                    {e.deviceName && e.deviceName !== e.employeeName && (
                      <span className="shrink-0 text-[11px] text-subtle">di mesin: {e.deviceName}</span>
                    )}
                    <button
                      disabled={busy}
                      onClick={() => kirim({ action: "unmap", pin: e.pin }, () => `PIN ${e.pin} dilepas.`)}
                      className="shrink-0 rounded-md p-1 text-subtle transition hover:text-danger"
                      aria-label="Lepas pemetaan"
                    >
                      <IconTrash className="text-[14px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

type Hasil = {
  ok?: boolean;
  copied?: number;
  skipped?: number;
  total?: number;
  synced?: number;
  stillUnmatched?: string[];
};
