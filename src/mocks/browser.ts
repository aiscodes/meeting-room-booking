import { focusManager } from "@tanstack/react-query";
import { setupWorker } from "msw/browser";
import { createMockControls } from "./controls";
import { createHandlers } from "./handlers";
import { createBookingStore, localStoragePersistence, seedForToday } from "./store";

export const mockStore = createBookingStore({ seed: seedForToday, persistence: localStoragePersistence });
export const mockControls = createMockControls();

const worker = setupWorker(
  ...createHandlers({ store: mockStore, controls: mockControls, now: () => new Date() }),
);

const ACTIVATION_TIMEOUT_MS = 1000;

// A worker restarted after idling in a hidden tab forgets this tab, so requests would bypass the mock.
function reactivate(): Promise<void> {
  const controller = navigator.serviceWorker.controller;
  if (!controller) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      resolve();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "MOCKING_ENABLED") done();
    };
    const timer = window.setTimeout(done, ACTIVATION_TIMEOUT_MS);
    navigator.serviceWorker.addEventListener("message", onMessage);
    controller.postMessage("MOCK_ACTIVATE");
  });
}

// Refetch-on-focus must wait until the worker mocks this tab again.
function refetchOnVisibleAfterReactivation() {
  focusManager.setEventListener((handleFocus) => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void reactivate().then(() => handleFocus());
      else handleFocus();
    };
    window.addEventListener("visibilitychange", onVisibilityChange);
    return () => window.removeEventListener("visibilitychange", onVisibilityChange);
  });
}

let started: Promise<void> | undefined;

export function startMockApi() {
  started ??= worker
    .start({ quiet: true, onUnhandledFrame: "bypass" })
    .then(() => refetchOnVisibleAfterReactivation());
  return started;
}
