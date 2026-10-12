"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { IconLogin, IconAlert } from "@/components/ui/icons";
import { NamaMerek, UbinLogo } from "@/components/QendaliMark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Email atau password salah.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="ambient relative flex min-h-screen items-center justify-center bg-bg p-4">
      <form
        onSubmit={handleSubmit}
        className="glass-2 relative z-10 w-full max-w-sm space-y-5 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <span className="mb-3">
            <UbinLogo besar />
          </span>
          <h1>
            <NamaMerek className="text-2xl" />
          </h1>
          <p className="mt-1 text-sm text-muted">Masuk ke dashboard admin</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-danger" style={{ background: "color-mix(in oklab, var(--danger) 16%, transparent)" }}>
            <IconAlert className="shrink-0 text-[16px]" /> {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input h-11"
            placeholder="nama@usaha.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input h-11"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary h-11 w-full">
          <IconLogin className="text-[17px]" />
          {loading ? "Memproses…" : "Masuk"}
        </button>
      </form>
    </main>
  );
}
