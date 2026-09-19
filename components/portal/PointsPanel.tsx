"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { IconAlert, IconCheck, IconStar } from "@/components/ui/icons";
import { Card, Empty, LeaveStatusBadge, longDate, rupiah, shortDate, soft } from "./ui";

type Balance = { earned: number; redeemed: number; pending: number; available: number };

type PointsData = {
  enabled: boolean;
  period?: { label: string };
  breakdown?: {
    omzetPoints: number;
    jobPoints: number;
    taskPoints: number;
    attendancePoints: number;
    total: number;
  };
  days?: { date: string; omzet: number; points: number }[];
  balance?: Balance;
  /** Peran yang benar-benar dijalani orang ini (dari aktivitasnya, bukan jabatan). */
  roles?: string[];
  howTo?: {
    role: string;
    title: string;
    items: { label: string; value: string }[];
    note: string | null;
  }[];
};

type Reward = {
  id: number;
  name: string;
  description: string | null;
  type: "cash" | "product" | "voucher";
  pointCost: number;
  cashValue: number | null;
  stock: number | null;
};

type Redemption = {
  id: number;
  rewardName: string;
  pointCost: number;
  status: "pending" | "approved" | "rejected" | "delivered" | "cancelled";
  decisionNote: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<Reward["type"], string> = {
  cash: "Uang",
  product: "Produk",
  voucher: "Voucher",
};

/** Poin karyawan: saldo, cara mendapatkannya, dan penukaran hadiah. */
export function PointsPanel({ token, year, month }: { token: string; year: number; month: number }) {
  const [data, setData] = useState<PointsData | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [items, setItems] = useState<Redemption[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(0);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      api<PointsData>(`/api/public/portal/${token}/points?year=${year}&month=${month}`),
      api<{ enabled: boolean; balance?: Balance; rewards: Reward[]; items: Redemption[] }>(
        `/api/public/portal/${token}/redemptions`
      ),
    ]);
    setData(p);
    setRewards(r.rewards ?? []);
    setItems(r.items ?? []);
    setBalance(r.balance ?? p.balance ?? null);
  }, [token, year, month]);

  useEffect(() => {
    load().catch((e: unknown) =>
      setError(e instanceof Error ? e.message : "Gagal memuat poin.")
    );
  }, [load]);

  async function redeem(reward: Reward) {
    setError("");
    setOk("");
    setBusy(reward.id);
    try {
      await api(`/api/public/portal/${token}/redemptions`, {
        method: "POST",
        body: JSON.stringify({ rewardId: reward.id }),
      });
      setOk(`Pengajuan "${reward.name}" terkirim. Menunggu persetujuan owner.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengajukan penukaran.");
    } finally {
      setBusy(0);
    }
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="glass h-32 animate-pulse rounded-2xl" />
        <div className="glass h-64 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!data.enabled) {
    return (
      <Card title="Poin">
        <Empty>Sistem poin sedang dimatikan oleh owner.</Empty>
      </Card>
    );
  }

  const b = balance ?? data.balance;
  const bd = data.breakdown;
  // Hanya aturan yang benar-benar berlaku bagi orang ini. Menampilkan aturan peran
  // lain (mis. poin kasir di halaman desainer) justru membingungkan.
  const berlaku = (data.howTo ?? []).filter((g) => (data.roles ?? []).includes(g.role));

  return (
    <div className="space-y-4">
      {ok && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-success" style={soft("var(--success)")}>
          <IconCheck className="text-[16px] shrink-0" /> {ok}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="text-[16px] shrink-0" /> {error}
        </div>
      )}

      <Card title="Poin Anda">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
            style={{ ...soft("var(--warning)", 18), color: "var(--warning)" }}
          >
            <IconStar className="text-[26px]" fill="currentColor" />
          </span>
          <div>
            <div className="tabular font-display text-4xl font-extrabold text-fg">
              {b?.available ?? 0}
              <span className="ml-1 text-base font-bold text-muted">poin siap dipakai</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Total terkumpul {b?.earned ?? 0} · sudah ditukar {b?.redeemed ?? 0}
              {(b?.pending ?? 0) > 0 && ` · ${b?.pending} tertahan di pengajuan`}
            </p>
          </div>
        </div>

        {bd && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-4">
            <Mini label="Dari omzet" value={bd.omzetPoints} />
            <Mini label="Dari pekerjaan" value={bd.jobPoints} />
            <Mini label="Dari task" value={bd.taskPoints} />
            <Mini label="Dari kehadiran" value={bd.attendancePoints} />
          </div>
        )}
        <p className="mt-2 text-center text-xs text-subtle">
          {bd?.total ?? 0} poin didapat pada {data.period?.label}
        </p>
      </Card>

      {berlaku.length > 0 && (
        <Card title="Cara mengumpulkan poin">
          <div className="space-y-4">
            {berlaku.map((g) => (
              <div key={g.role}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg">
                  {g.title}
                </h3>
                <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {g.items.map((h) => (
                    <li key={h.label} className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted">{h.label}</span>
                      <span className="text-right font-medium text-fg">{h.value}</span>
                    </li>
                  ))}
                </ul>
                {g.note && <p className="mt-1 text-xs text-subtle">{g.note}</p>}
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-border pt-3 text-xs text-subtle">
            Hanya aturan yang sesuai pekerjaan Anda yang ditampilkan.
          </p>
        </Card>
      )}

      <Card title="Tukar poin">
        {rewards.length === 0 ? (
          <Empty>Owner belum menyiapkan daftar hadiah.</Empty>
        ) : (
          <ul className="space-y-2.5">
            {rewards.map((r) => {
              const cukup = (b?.available ?? 0) >= r.pointCost;
              const habis = r.stock !== null && r.stock <= 0;
              return (
                <li key={r.id} className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-fg">
                        {r.name}
                        <span className="ml-2 text-[11px] font-normal text-subtle">
                          {TYPE_LABEL[r.type]}
                          {r.cashValue ? ` · ${rupiah(r.cashValue)}` : ""}
                        </span>
                      </div>
                      {r.description && <p className="mt-0.5 text-xs text-muted">{r.description}</p>}
                      {r.stock !== null && (
                        <p className="mt-0.5 text-[11px] text-subtle">
                          {habis ? "stok habis" : `sisa ${r.stock}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="tabular font-display text-lg font-bold text-warning">
                        {r.pointCost} <span className="text-xs">poin</span>
                      </div>
                      <button
                        onClick={() => redeem(r)}
                        disabled={!cukup || habis || busy === r.id}
                        className="btn-primary mt-1 h-8 px-3 text-xs"
                      >
                        {busy === r.id ? "Mengirim…" : cukup ? "Tukar" : "Poin kurang"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Riwayat penukaran">
        {items.length === 0 ? (
          <Empty>Belum pernah menukar poin.</Empty>
        ) : (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-fg">
                    {r.rewardName} · {r.pointCost} poin
                  </span>
                  <LeaveStatusBadge status={r.status} />
                </div>
                <p className="mt-0.5 text-xs text-subtle">
                  Diajukan {longDate(r.createdAt.slice(0, 10))}
                </p>
                {r.decisionNote && (
                  <p className="mt-1.5 rounded-lg border border-border p-2 text-xs text-muted">
                    <b className="text-fg">Catatan owner:</b> {r.decisionNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.days && data.days.length > 0 && (
        <Card title={`Poin harian — ${data.period?.label}`}>
          <ul className="space-y-1.5 text-sm">
            {data.days.map((d) => (
              <li key={d.date} className="flex items-center justify-between gap-3">
                <span className="text-muted">{shortDate(d.date)}</span>
                <span className="flex items-center gap-3">
                  {d.omzet > 0 && <span className="tabular text-xs text-subtle">{rupiah(d.omzet)}</span>}
                  <span className="tabular w-16 text-right font-semibold text-fg">{d.points} pt</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="tabular font-display text-lg font-bold text-fg">{value}</div>
      <div className="text-[11px] text-subtle">{label}</div>
    </div>
  );
}
