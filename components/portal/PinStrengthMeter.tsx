"use client";

import { useMemo } from "react";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { checkPin, type PinStrength } from "@/lib/services/portal/pin-strength";

const STRENGTH_META: Record<PinStrength, { label: string; color: string; bars: number }> = {
  lemah: { label: "Lemah", color: "var(--danger)", bars: 1 },
  sedang: { label: "Sedang", color: "var(--warning)", bars: 2 },
  kuat: { label: "Kuat", color: "var(--success)", bars: 3 },
};

/** Meter kekuatan PIN — memperingatkan, tidak menghalangi. */
export function PinStrengthMeter({ pin }: { pin: string }) {
  const check = useMemo(() => checkPin(pin), [pin]);
  if (pin.length === 0) return null;

  if (!check.valid) {
    return <p className="mt-1.5 text-xs text-muted">{check.error}</p>;
  }

  const meta = STRENGTH_META[check.strength];
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: i <= meta.bars ? meta.color : "var(--surface-2)" }}
            />
          ))}
        </div>
        <span className="text-xs font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>
      {check.strength === "lemah" ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
          <IconAlert className="mt-0.5 shrink-0 text-[13px] text-danger" />
          <span>
            Mudah ditebak ({check.reasons.join(", ")}). <b className="text-fg">Tetap boleh dipakai</b>,
            tapi orang yang memegang tautan Anda bisa menebaknya.
          </span>
        </p>
      ) : (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <IconCheck className="shrink-0 text-[13px] text-success" /> PIN ini tidak mudah ditebak.
        </p>
      )}
    </div>
  );
}
