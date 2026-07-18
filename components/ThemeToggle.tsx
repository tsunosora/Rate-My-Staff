"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/ui/icons";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const c = document.documentElement.classList;
    c.toggle("dark", next);
    c.toggle("light", !next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={dark ? "Mode terang" : "Mode gelap"}
      className="grid h-9 w-9 place-items-center rounded-xl border border-border-strong text-muted transition hover:text-fg hover:bg-surface-2 active:scale-95"
    >
      {mounted && dark ? (
        <IconMoon className="text-[18px]" />
      ) : (
        <IconSun className="text-[18px]" />
      )}
    </button>
  );
}
