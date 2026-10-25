"use client";

import { useCallback, useEffect, useState } from "react";
import { type ISODate, isValidDate } from "@/domain/time";

function dateFromUrl(fallback: ISODate): ISODate {
  const fromUrl = new URLSearchParams(window.location.search).get("date");
  return fromUrl && isValidDate(fromUrl) ? fromUrl : fallback;
}

export function useSelectedDate(fallback: ISODate) {
  const [date, setDateState] = useState<ISODate>(() => dateFromUrl(fallback));

  useEffect(() => {
    const onPopState = () => setDateState(dateFromUrl(fallback));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [fallback]);

  const setDate = useCallback(
    (next: ISODate) => {
      if (!isValidDate(next) || next === date) return;
      const url = new URL(window.location.href);
      url.searchParams.set("date", next);
      window.history.pushState(null, "", url);
      setDateState(next);
    },
    [date],
  );

  return [date, setDate] as const;
}
