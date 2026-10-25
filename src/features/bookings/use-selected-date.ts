"use client";

import { useCallback, useState } from "react";
import { type ISODate, isValidDate } from "@/domain/time";

export function useSelectedDate(fallback: ISODate) {
  const [date, setDateState] = useState<ISODate>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("date");
    return fromUrl && isValidDate(fromUrl) ? fromUrl : fallback;
  });

  const setDate = useCallback((next: ISODate) => {
    if (!isValidDate(next)) return;
    setDateState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("date", next);
    window.history.replaceState(null, "", url);
  }, []);

  return [date, setDate] as const;
}
