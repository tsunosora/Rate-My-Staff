"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconAlert, IconCheck, IconPlus, IconTrash, IconStar, IconPencil } from "@/components/ui/icons";
import { LeaveStatusBadge, rupiah, soft } from "@/components/portal/ui";

type Row = {
  employeeId: number;
  fullName: string;
  department: string | null;
  points: number;
  omzet: number;
  days: number;
};

type Reward = {
  id: number;
  name: string;
  description: string | null;
  type: "cash" | "product" | "voucher";
  pointCost: number;
  cashValue: number | null;
  stock: number | null;
  isActive: boolean;
};

type Redemption = {
  id: number;
  employeeName: string;
  employeeCode: string;
  rewardName: string;
  pointCost: number;
  status: "pending" | "approved" | "rejected" | "delivered" | "cancelled";
  note: string | null;
  decisionNote: string | null;
  decidedBy: string | null;
  createdAt: string;
};

const emptyReward = {
  name: "",
  description: "",
  type: "product" as Reward["type"],
  pointCost: "",
  cashValue: "",
  stock: "",
  isActive: true,
};

function currentMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function PointsPage() {
  const [tab, setTab] = useState<"peringkat" | "hadiah" | "pengajuan">("peringkat");
  const [{ year, month }, setPeriod] = useState(currentMonth);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [reds, setReds] = useState<Redemption[] | null>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState<null | "reward">(null);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [form, setForm] = useState(emptyReward);

  const loadBoard = useCallback(
    async (recalc = false) => {
      setError("");
      try {
        const q = `year=${year}&month=${month}${recalc ? "&recalc=1" : ""}`;
        const d = await api<{ rows: Row[]; period?: { label: string } }>(
          `/api/points/leaderboard?${q}`
        );
        setRows(d.rows);
        setPeriodLabel(d.period?.label ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat peringkat.");
      }
    },
    [year, month]
  );

  const loadRewards = useCallback(async () => {
    setRewards(await api<Reward[]>("/api/rewards"));
  }, []);

  const loadReds = useCallback(async () => {
    const d = await api<{ items: Redemption[]; pending: number }>("/api/redemptions");
    setReds(d.items);
    setPending(d.pending);
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);
  useEffect(() => {
    loadRewards().catch(() => setRewards([]));
    loadReds().catch(() => setReds([]));
  }, [loadRewards, loadReds]);

  async function recalc() {
    setBusy(true);
    setNotice("");
    await loadBoard(true);
    setNotice("Poin dihitung ulang dari data absensi & PosPro terbaru.");
    setBusy(false);
  }

  function openReward(r: Reward | null) {
    setEditing(r);
    setForm(
      r
        ? {
            name: r.name,
            description: r.description ?? "",
            type: r.type,
            pointCost: String(r.pointCost),
            cashValue: r.cashValue ? String(r.cashValue) : "",
            stock: r.stock !== null ? String(r.stock) : "",
            isActive: r.isActive,
          }
        : emptyReward
    );
    setError("");
    setModal("reward");
  }

  async function saveReward() {
    setError("");
    try {
      const body = {
        name: form.name,
        description: form.description || null,
        type: form.type,
        pointCost: Number(form.pointCost),
        cashValue: form.cashValue ? Number(form.cashValue) : null,
        stock: form.stock === "" ? null : Number(form.stock),
        isActive: form.isActive,
      };
      if (editing) await api(`/api/rewards/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await api("/api/rewards", { method: "POST", body: JSON.stringify(body) });
      setModal(null);
      await loadRewards();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan hadiah.");
    }
  }

  async function removeReward(r: Reward) {
    if (!confirm(`Hapus hadiah "${r.name}"? Riwayat penukaran yang sudah ada tetap tersimpan.`)) return;
    await api(`/api/rewards/${r.id}`, { method: "DELETE" }).catch(() => {});
    await loadRewards();
  }

  async function decide(r: Redemption, action: "approve" | "reject" | "deliver" | "cancel") {
    setError("");
    try {
      await api(`/api/redemptions/${r.id}`, { method: "PATCH", body: JSON.stringify({ action }) });
      await Promise.all([loadReds(), loadBoard()]);
      setNotice(`Pengajuan ${r.employeeName} — ${r.rewardName}: ${action}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan keputusan.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Poin &amp; Hadiah</h1>
          <p className="mt-0.5 text-sm text-muted">
            Poin dari omzet, pekerjaan, task, dan kedisiplinan — bisa ditukar hadiah.
          </p>
        </div>
        <input
          type="month"
          className="input h-10 w-44"
          value={`${year}-${String(month).padStart(2, "0")}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            if (y && m) setPeriod({ year: y, month: m });
          }}
        />
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-success" style={soft("var(--success)")}>
          <IconCheck className="text-[16px] shrink-0" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-danger" style={soft("var(--danger)")}>
          <IconAlert className="text-[16px] shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          ["peringkat", "Peringkat"],
          ["hadiah", "Hadiah"],
          ["pengajuan", `Pengajuan${pending > 0 ? ` (${pending})` : ""}`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              tab === k
                ? "bg-gradient-to-r from-primary to-primary-2 text-on-primary shadow-lg shadow-primary/25"
                : "btn-ghost"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "peringkat" && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-sm font-bold text-fg">
              Peringkat {periodLabel || ""}
            </h2>
            <button onClick={recalc} disabled={busy} className="btn-ghost h-9 text-xs">
              {busy ? "Menghitung…" : "Hitung ulang"}
            </button>
          </div>

          {!rows ? (
            <div className="h-32 animate-pulse rounded-xl bg-surface-2" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">
              Belum ada poin di periode ini. Tekan <b className="text-fg">Hitung ulang</b> untuk
              menarik data absensi &amp; PosPro.
            </p>
          ) : (
            <ol className="space-y-2">
              {rows.map((r, i) => (
                <li key={r.employeeId} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold"
                    style={
                      i === 0
                        ? { ...soft("var(--warning)", 22), color: "var(--warning)" }
                        : { ...soft("var(--fg-subtle)", 14), color: "var(--fg-muted)" }
                    }
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-fg">{r.fullName}</div>
                    <div className="text-xs text-subtle">
                      {r.department ?? "—"} · {r.days} hari · omzet {rupiah(r.omzet)}
                    </div>
                  </div>
                  <span className="tabular flex shrink-0 items-center gap-1 font-display text-lg font-bold text-warning">
                    <IconStar className="text-[15px]" fill="currentColor" />
                    {r.points}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {tab === "hadiah" && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-sm font-bold text-fg">Katalog hadiah</h2>
            <button onClick={() => openReward(null)} className="btn-primary h-9 text-xs">
              <IconPlus className="text-[15px]" /> Tambah
            </button>
          </div>

          {!rewards ? (
            <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
          ) : rewards.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">
              Belum ada hadiah. Tambahkan uang, produk Voliko, produk lain, atau voucher.
            </p>
          ) : (
            <ul className="space-y-2">
              {rewards.map((r) => (
                <li key={r.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-fg">
                      {r.name}
                      <span className="ml-2 text-[11px] font-normal text-subtle">
                        {r.type === "cash" ? "Uang" : r.type === "voucher" ? "Voucher" : "Produk"}
                        {r.cashValue ? ` · ${rupiah(r.cashValue)}` : ""}
                        {r.stock !== null ? ` · stok ${r.stock}` : " · stok bebas"}
                        {!r.isActive && " · nonaktif"}
                      </span>
                    </div>
                    {r.description && <p className="mt-0.5 text-xs text-muted">{r.description}</p>}
                  </div>
                  <span className="tabular shrink-0 font-display font-bold text-warning">
                    {r.pointCost} pt
                  </span>
                  <button onClick={() => openReward(r)} className="btn-ghost h-8 px-2 text-xs">
                    <IconPencil className="text-[14px]" />
                  </button>
                  <button onClick={() => removeReward(r)} className="btn-ghost h-8 px-2 text-xs">
                    <IconTrash className="text-[14px]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "pengajuan" && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <h2 className="mb-4 font-display text-sm font-bold text-fg">Pengajuan tukar poin</h2>
          {!reds ? (
            <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
          ) : reds.length === 0 ? (
            <p className="py-8 text-center text-sm text-subtle">Belum ada pengajuan.</p>
          ) : (
            <ul className="space-y-2.5">
              {reds.map((r) => (
                <li key={r.id} className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-fg">
                        {r.employeeName}
                        <span className="ml-2 text-xs font-normal text-subtle">{r.employeeCode}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted">
                        {r.rewardName} · <b className="text-warning">{r.pointCost} poin</b>
                      </p>
                      {r.note && <p className="mt-0.5 text-xs italic text-subtle">“{r.note}”</p>}
                    </div>
                    <LeaveStatusBadge status={r.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
                    <span>{new Date(r.createdAt).toLocaleString("id-ID")}</span>
                    {r.decidedBy && <span>· diputus {r.decidedBy}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => decide(r, "approve")} className="btn-primary h-8 text-xs">
                          <IconCheck className="text-[14px]" /> Setujui
                        </button>
                        <button onClick={() => decide(r, "reject")} className="btn-ghost h-8 text-xs">
                          Tolak
                        </button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <>
                        <button onClick={() => decide(r, "deliver")} className="btn-primary h-8 text-xs">
                          <IconCheck className="text-[14px]" /> Sudah diserahkan
                        </button>
                        <button onClick={() => decide(r, "cancel")} className="btn-ghost h-8 text-xs">
                          Batalkan
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {modal === "reward" && (
        <Modal title={editing ? "Ubah hadiah" : "Tambah hadiah"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Nama hadiah *</span>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Keterangan</span>
              <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Jenis</span>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Reward["type"] })}>
                  <option value="product">Produk</option>
                  <option value="cash">Uang</option>
                  <option value="voucher">Voucher</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Harga poin *</span>
                <input type="number" className="input" value={form.pointCost} onChange={(e) => setForm({ ...form, pointCost: e.target.value })} />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Nilai rupiah</span>
                <input type="number" className="input" value={form.cashValue} onChange={(e) => setForm({ ...form, cashValue: e.target.value })} />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-muted">Stok (kosong = bebas)</span>
                <input type="number" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" className="accent-[color:var(--primary)]" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Tampilkan ke karyawan
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="btn-ghost h-10">Batal</button>
            <button onClick={saveReward} className="btn-primary h-10">Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
