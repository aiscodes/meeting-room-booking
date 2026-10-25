"use client";

import { useEffect } from "react";
import { mockControls, mockStore, startMockApi } from "./browser";
import type { MockControlsStore } from "./controls";
import type { BookingStore } from "./store";

export type MockApi = { store: BookingStore; controls: MockControlsStore };

type Props = { onReady: (api: MockApi) => void; onError: (message: string) => void };

export default function MockWorker({ onReady, onError }: Props) {
  useEffect(() => {
    let active = true;
    startMockApi().then(
      () => active && onReady({ store: mockStore, controls: mockControls }),
      (error: unknown) => active && onError(error instanceof Error ? error.message : String(error)),
    );
    return () => {
      active = false;
    };
  }, [onReady, onError]);

  return null;
}
