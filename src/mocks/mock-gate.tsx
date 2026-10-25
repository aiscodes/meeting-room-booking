"use client";

import dynamic from "next/dynamic";
import { createContext, type ReactNode, Suspense, useContext, useState, useSyncExternalStore } from "react";
import type { MockApi } from "./mock-worker";

const MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING !== "disabled";

const MockWorker = dynamic(() => import("./mock-worker"), { ssr: false });

const MockApiContext = createContext<MockApi | null>(null);

export function useMockApi() {
  return useContext(MockApiContext);
}

const noopSubscribe = () => () => {};

// Render only after the worker starts, so the first request is intercepted.
export function MockGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [api, setApi] = useState<MockApi | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (!MOCKING_ENABLED) return isClient ? children : fallback;

  let content: ReactNode = fallback;
  if (failure) {
    content = (
      <div role="alert" className="mx-auto max-w-md py-16 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Не удалось запустить mock API</h2>
        <p className="mt-2 text-sm text-slate-600">
          Демо работает через Service Worker. Откройте страницу в обычном окне современного браузера.
        </p>
        <p className="mt-4 text-xs text-slate-500">{failure}</p>
      </div>
    );
  } else if (api) {
    content = <MockApiContext value={api}>{children}</MockApiContext>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <MockWorker onReady={setApi} onError={setFailure} />
      </Suspense>
      {content}
    </>
  );
}
