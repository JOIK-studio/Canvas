import type { AppState } from "./types";

const STORAGE_KEY = "canvas_app_state_v4";

function createDefaultState(): AppState {
  return {
    auth: {
      user: null,
      loading: false,
      error: null
    },
    user: {
      coins: 240,
      pixels_inventory: 180,
      charges: 2,
      max_charges: 6,
      recharge_seconds: 30
    },
    creations: [],
    events: []
  };
}

let appState: AppState = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : createDefaultState();
  } catch {
    return createDefaultState();
  }
})();

export function getState(): AppState {
  return structuredClone(appState);
}

export function updateState(updates: Partial<AppState>) {
  appState = { ...appState, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

export function updateUserState(updates: Partial<AppState["user"]>) {
  appState.user = { ...appState.user, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

export function addEvent(text: string) {
  appState.events.unshift({ id: `evt_${Date.now()}`, text, ts: Date.now() });
  appState.events = appState.events.slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

export function setAuthUser(user: any) {
  appState.auth.user = user;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

export function clearAuth() {
  appState.auth = { user: null, loading: false, error: null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

export function setLoading(loading: boolean) {
  appState.auth.loading = loading;
}

export function setAuthError(error: string | null) {
  appState.auth.error = error;
}
