import { describe, expect, test } from "vitest";
import { canManage } from "@/lib/rbac";

describe("canManage", () => {
  test("ADMIN, OWNER, HR bisa mengelola", () => {
    expect(canManage("ADMIN")).toBe(true);
    expect(canManage("OWNER")).toBe(true);
    expect(canManage("HR")).toBe(true);
  });

  test("EVALUATOR tidak bisa mengelola", () => {
    expect(canManage("EVALUATOR")).toBe(false);
  });

  test("role kosong/undefined tidak bisa mengelola", () => {
    expect(canManage(undefined)).toBe(false);
    expect(canManage(null)).toBe(false);
    expect(canManage("")).toBe(false);
  });
});
