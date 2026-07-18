"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { Modal } from "@/components/ui/Modal";
import { IconPlus, IconCheck, IconUsers } from "@/components/ui/icons";

type Role = "OWNER" | "ADMIN" | "HR" | "EVALUATOR";
type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

const ROLES: Role[] = ["OWNER", "ADMIN", "HR", "EVALUATOR"];

function softChip(color: string): React.CSSProperties {
  return { background: `color-mix(in oklab, ${color} 16%, transparent)`, color };
}
function roleColor(r: Role) {
  return r === "OWNER" ? "var(--primary-2)" : r === "ADMIN" ? "var(--primary)" : r === "HR" ? "var(--info)" : "var(--fg-subtle)";
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EVALUATOR" as Role });
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [rowErr, setRowErr] = useState("");

  const load = useCallback(async () => {
    setUsers(await api<User[]>("/api/users"));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createUser() {
    setSaving(true);
    setFormErr("");
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify(form) });
      setAddOpen(false);
      setForm({ name: "", email: "", password: "", role: "EVALUATOR" });
      load();
    } catch (e) {
      setFormErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function patch(u: User, data: Partial<Pick<User, "role" | "isActive">>) {
    setRowErr("");
    try {
      await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify(data) });
      load();
    } catch (e) {
      setRowErr((e as Error).message);
      load();
    }
  }

  async function resetPassword() {
    if (!resetFor) return;
    setSaving(true);
    setResetErr("");
    try {
      await api(`/api/users/${resetFor.id}/password`, { method: "POST", body: JSON.stringify({ password: newPw }) });
      setResetFor(null);
      setNewPw("");
    } catch (e) {
      setResetErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Akun &amp; Peran</h1>
          <p className="mt-0.5 text-sm text-muted">Kelola pengguna aplikasi dan hak aksesnya.</p>
        </div>
        <button onClick={() => { setForm({ name: "", email: "", password: "", role: "EVALUATOR" }); setFormErr(""); setAddOpen(true); }} className="btn-primary h-10">
          <IconPlus className="text-[17px]" /> Tambah User
        </button>
      </div>

      {rowErr && <div className="rounded-xl px-3 py-2.5 text-sm text-danger" style={softChip("var(--danger)")}>{rowErr}</div>}

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Peran</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!users ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-subtle">Memuat…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-subtle">Belum ada user.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-border transition hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-fg">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => patch(u, { role: e.target.value as Role })}
                        className="rounded-lg border-0 px-2 py-1 text-xs font-semibold outline-none"
                        style={softChip(roleColor(u.role))}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge" style={softChip(u.isActive ? "var(--success)" : "var(--danger)")}>
                        {u.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => patch(u, { isActive: !u.isActive })}
                          className="rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-muted transition hover:text-fg hover:bg-surface-2"
                        >
                          {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          onClick={() => { setResetFor(u); setNewPw(""); setResetErr(""); }}
                          className="rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-muted transition hover:border-primary hover:text-primary"
                        >
                          Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-subtle">
        <IconUsers className="text-[14px]" />
        Peran: <b className="text-muted">OWNER/ADMIN</b> = akses penuh + kelola akun · <b className="text-muted">HR</b> = kelola data, absensi, penilaian · <b className="text-muted">EVALUATOR</b> = penilaian &amp; lihat saja.
      </p>

      {addOpen && (
        <Modal title="Tambah User" onClose={() => setAddOpen(false)}>
          {formErr && <div className="mb-3 rounded-xl px-3 py-2.5 text-sm text-danger" style={softChip("var(--danger)")}>{formErr}</div>}
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Nama *</span>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Email *</span>
              <input type="email" autoComplete="off" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Password * <span className="text-subtle">(min 8 karakter)</span></span>
              <input type="password" autoComplete="new-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted">Peran *</span>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setAddOpen(false)} className="btn-ghost">Batal</button>
            <button onClick={createUser} disabled={saving} className="btn-primary disabled:opacity-50">
              <IconCheck className="text-[16px]" /> {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </Modal>
      )}

      {resetFor && (
        <Modal title={`Reset Password — ${resetFor.name}`} onClose={() => setResetFor(null)}>
          {resetErr && <div className="mb-3 rounded-xl px-3 py-2.5 text-sm text-danger" style={softChip("var(--danger)")}>{resetErr}</div>}
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted">Password baru <span className="text-subtle">(min 8 karakter)</span></span>
            <input type="password" autoComplete="new-password" className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setResetFor(null)} className="btn-ghost">Batal</button>
            <button onClick={resetPassword} disabled={saving || newPw.length < 8} className="btn-primary disabled:opacity-50">
              {saving ? "Menyimpan…" : "Simpan Password"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
