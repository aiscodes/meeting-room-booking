export type MockControls = {
  latencyMs: number;
  failNextRequest: boolean;
  raceNextWrite: boolean;
};

export type MockControlsStore = {
  get(): MockControls;
  set(patch: Partial<MockControls>): void;
  subscribe(listener: () => void): () => void;
};

export function createMockControls(initial: Partial<MockControls> = {}): MockControlsStore {
  let state: MockControls = { latencyMs: 400, failNextRequest: false, raceNextWrite: false, ...initial };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
