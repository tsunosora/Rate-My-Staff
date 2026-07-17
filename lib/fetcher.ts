"use client";

/** Client fetch helper: JSON in/out, lempar Error dengan message dari server. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request gagal (${res.status})`);
  }
  return res.json();
}
