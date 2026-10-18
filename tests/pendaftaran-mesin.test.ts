import { describe, expect, it } from "vitest";
import { pilihCaraSinkron } from "@/lib/services/fingerspot/pendaftaran";

const cloud = { id: 1, name: "Mesin Utama", mode: "cloud", ip: null };
const lan = { id: 2, name: "Mesin Gudang", mode: "lan", ip: "192.168.1.20" };

describe("pilihCaraSinkron", () => {
  it("mesin cloud saja = cloud (tombol tarik tidak ditampilkan)", () => {
    expect(pilihCaraSinkron([cloud, { ...cloud, id: 5 }], null)).toBe("cloud");
  });
  it("ada satu mesin LAN ber-IP = lan", () => {
    expect(pilihCaraSinkron([cloud, lan], null)).toBe("lan");
  });
  it("mesin LAN tanpa IP tidak dihitung", () => {
    expect(pilihCaraSinkron([cloud, { ...lan, ip: "  " }], "")).toBe("cloud");
  });
  it("setelan IP lama tetap dihormati", () => {
    expect(pilihCaraSinkron([cloud], "192.168.1.9")).toBe("lan");
    expect(pilihCaraSinkron([], "192.168.1.9")).toBe("lan");
  });
  it("belum ada mesin sama sekali = kosong (tidak ada yang ditampilkan)", () => {
    expect(pilihCaraSinkron([], null)).toBe("kosong");
  });
});
