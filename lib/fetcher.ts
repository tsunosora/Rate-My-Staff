"use client";

type ErrorBody = {
  message?: unknown;
  errors?: unknown;
};

/** Ambil pesan pertama dari sebuah daftar error. */
function firstOf(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const m = firstOf(v);
      if (m) return m;
    }
  }
  return null;
}

/**
 * Pesan yang layak ditampilkan dari body error server.
 *
 * Route validasi membalas 422 dengan `{ errors: ... }` (lihat badRequest di lib/http.ts),
 * dalam dua bentuk: hasil `zod.flatten()` (`{ formErrors, fieldErrors }`) atau peta
 * sederhana (`{ pin: ["..."] }`). Tanpa ini pengguna cuma melihat "Request gagal (422)"
 * padahal server sudah menjelaskan penyebabnya.
 */
export function errorMessageFrom(body: ErrorBody, status: number): string {
  const direct = firstOf(body.message);
  if (direct) return direct;

  const errors = body.errors;
  if (errors && typeof errors === "object") {
    const e = errors as Record<string, unknown>;

    const formError = firstOf(e.formErrors);
    if (formError) return formError;

    const fieldErrors = e.fieldErrors;
    if (fieldErrors && typeof fieldErrors === "object") {
      for (const v of Object.values(fieldErrors as Record<string, unknown>)) {
        const m = firstOf(v);
        if (m) return m;
      }
    }

    for (const [key, v] of Object.entries(e)) {
      if (key === "formErrors" || key === "fieldErrors") continue;
      const m = firstOf(v);
      if (m) return m;
    }
  }

  return `Request gagal (${status})`;
}

/** Client fetch helper: JSON in/out, lempar Error dengan pesan terbaik dari server. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new Error(errorMessageFrom(body, res.status));
  }
  return res.json();
}
