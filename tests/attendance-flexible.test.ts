import { describe, expect, test } from "vitest";
import {
  computeFlexible,
  FLEX_WORK_MINUTES,
  FLEX_MEAL_THRESHOLD_MINUTES,
} from "@/lib/services/attendance/flexible";

const hm = (h: number, m = 0) => h * 60 + m;

describe("computeFlexible — lembur berbasis durasi (jam masuk bebas)", () => {
  test("konstanta: 8 jam kerja, ambang uang makan 10 jam", () => {
    expect(FLEX_WORK_MINUTES).toBe(480);
    expect(FLEX_MEAL_THRESHOLD_MINUTES).toBe(600);
  });

  test("tepat 8 jam -> tidak ada lembur, tidak ada uang makan", () => {
    // 08:00 -> 16:00 = 480 menit
    expect(computeFlexible(hm(8), hm(16))).toEqual({
      workedMinutes: 480,
      overtimeMinutes: 0,
      mealEligible: false,
      status: "on_time",
    });
  });

  test("kurang dari 8 jam -> lembur 0", () => {
    // 09:00 -> 16:00 = 420 menit
    expect(computeFlexible(hm(9), hm(16))).toMatchObject({
      workedMinutes: 420,
      overtimeMinutes: 0,
      mealEligible: false,
    });
  });

  test("jam masuk bebas: masuk siang tetap dihitung dari durasi, bukan jam dinding", () => {
    // masuk 11:00 pulang 19:30 = 8j30m -> lembur 30 menit
    expect(computeFlexible(hm(11), hm(19, 30))).toMatchObject({
      workedMinutes: 510,
      overtimeMinutes: 30,
      mealEligible: false,
    });
  });

  test("lembur per-menit (belum genap sejam tetap dihitung)", () => {
    // 08:00 -> 16:45 = 525 menit -> lembur 45 menit
    expect(computeFlexible(hm(8), hm(16, 45)).overtimeMinutes).toBe(45);
  });

  test("tepat 10 jam -> lembur 120 menit tapi BELUM dapat uang makan (harus di atas 10 jam)", () => {
    // 08:00 -> 18:00 = 600 menit
    expect(computeFlexible(hm(8), hm(18))).toMatchObject({
      workedMinutes: 600,
      overtimeMinutes: 120,
      mealEligible: false,
    });
  });

  test("di atas 10 jam -> dapat uang makan + lembur menit penuh", () => {
    // 08:00 -> 18:31 = 631 menit -> lembur 151 menit, meal true
    expect(computeFlexible(hm(8), hm(18, 31))).toMatchObject({
      workedMinutes: 631,
      overtimeMinutes: 151,
      mealEligible: true,
    });
  });

  test("lewat tengah malam (pulang < masuk) dihitung menyeberang hari", () => {
    // masuk 20:00 pulang 05:00 = 9 jam -> lembur 60 menit
    expect(computeFlexible(hm(20), hm(5))).toMatchObject({
      workedMinutes: 540,
      overtimeMinutes: 60,
      mealEligible: false,
    });
  });

  test("data tak lengkap (salah satu null) -> semua 0, tak eligible", () => {
    expect(computeFlexible(hm(8), null)).toEqual({
      workedMinutes: 0,
      overtimeMinutes: 0,
      mealEligible: false,
      status: "on_time",
    });
    expect(computeFlexible(null, hm(18))).toMatchObject({ workedMinutes: 0, overtimeMinutes: 0 });
  });
});
