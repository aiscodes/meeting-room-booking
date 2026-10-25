"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

const NowContext = createContext<Date | null>(null);

const TICK_MS = 15_000;

export function NowProvider({ children, value }: { children: ReactNode; value?: Date }) {
  const [now, setNow] = useState(() => value ?? new Date());

  useEffect(() => {
    if (value) return;
    const id = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(id);
  }, [value]);

  return <NowContext value={value ?? now}>{children}</NowContext>;
}

export function useNow(): Date {
  const now = useContext(NowContext);
  if (!now) throw new Error("useNow must be used inside <NowProvider>");
  return now;
}
