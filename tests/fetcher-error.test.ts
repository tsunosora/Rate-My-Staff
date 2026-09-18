import { describe, expect, test } from "vitest";
import { errorMessageFrom } from "@/lib/fetcher";

describe("errorMessageFrom", () => {
  test("pakai message bila ada", () => {
    expect(errorMessageFrom({ message: "Tautan kadaluarsa" }, 410)).toBe("Tautan kadaluarsa");
  });

  test("peta error sederhana (badRequest({ pin: [...] }))", () => {
    expect(
      errorMessageFrom({ errors: { pin: ["PIN terlalu mudah ditebak (angka berurutan)."] } }, 422)
    ).toBe("PIN terlalu mudah ditebak (angka berurutan).");
  });

  test("hasil zod.flatten() — fieldErrors", () => {
    expect(
      errorMessageFrom(
        { errors: { formErrors: [], fieldErrors: { reason: ["Alasan minimal 3 karakter"] } } },
        422
      )
    ).toBe("Alasan minimal 3 karakter");
  });

  test("hasil zod.flatten() — formErrors didahulukan", () => {
    expect(
      errorMessageFrom(
        { errors: { formErrors: ["Konfirmasi PIN tidak sama."], fieldErrors: { pin: ["x"] } } },
        422
      )
    ).toBe("Konfirmasi PIN tidak sama.");
  });

  test("message menang atas errors", () => {
    expect(errorMessageFrom({ message: "Akses ditolak", errors: { a: ["b"] } }, 403)).toBe(
      "Akses ditolak"
    );
  });

  test("body kosong -> pesan umum dengan status", () => {
    expect(errorMessageFrom({}, 500)).toBe("Request gagal (500)");
  });

  test("errors kosong/tak berisi pesan -> pesan umum", () => {
    expect(errorMessageFrom({ errors: { formErrors: [], fieldErrors: {} } }, 422)).toBe(
      "Request gagal (422)"
    );
  });

  test("nilai bersarang tetap terbaca", () => {
    expect(errorMessageFrom({ errors: { a: [["jauh di dalam"]] } }, 422)).toBe("jauh di dalam");
  });
});
