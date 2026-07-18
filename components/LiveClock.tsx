"use client";

import { useEffect, useState } from "react";
import { IconClock } from "@/components/ui/icons";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm text-muted sm:flex">
      <IconClock className="text-[16px] text-primary" />
      <span className="tabular font-medium text-fg">
        {now
          ? now.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "--:--:--"}
      </span>
    </div>
  );
}
