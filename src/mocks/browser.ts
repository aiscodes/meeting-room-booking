import { setupWorker } from "msw/browser";
import { createMockControls } from "./controls";
import { createHandlers } from "./handlers";
import { createBookingStore, localStoragePersistence, seedForToday } from "./store";

export const mockStore = createBookingStore({ seed: seedForToday, persistence: localStoragePersistence });
export const mockControls = createMockControls();

const worker = setupWorker(
  ...createHandlers({ store: mockStore, controls: mockControls, now: () => new Date() }),
);

let started: Promise<unknown> | undefined;

export function startMockApi() {
  started ??= worker.start({
    quiet: true,
    onUnhandledFrame: "bypass",
  });
  return started;
}
