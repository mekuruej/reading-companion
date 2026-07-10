export type PersistedTimedSessionState = {
  version: 1;
  sessionMode: string;
  userBookId: string;
  startedAt: number | null;
  accumulatedElapsedMs: number;
  isPaused: boolean;
  sessionDate: string;
  sessionStartPage: string;
  sessionEndPage: string;
  showTimedSessionForm: boolean;
  savedAt: number;
};

export function timedSessionStorageKey(sessionMode: string, userBookId: string) {
  return `timed-session:${sessionMode}:${userBookId}`;
}

function isValidPersistedState(
  value: any,
  sessionMode: string,
  userBookId: string
): value is PersistedTimedSessionState {
  return (
    value?.version === 1 &&
    value?.sessionMode === sessionMode &&
    value?.userBookId === userBookId &&
    typeof value?.accumulatedElapsedMs === "number" &&
    Number.isFinite(value.accumulatedElapsedMs) &&
    (typeof value?.startedAt === "number" || value?.startedAt === null) &&
    typeof value?.isPaused === "boolean"
  );
}

export function readPersistedTimedSession(
  sessionMode: string,
  userBookId: string
) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      timedSessionStorageKey(sessionMode, userBookId)
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isValidPersistedState(parsed, sessionMode, userBookId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedTimedSession(state: PersistedTimedSessionState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      timedSessionStorageKey(state.sessionMode, state.userBookId),
      JSON.stringify({ ...state, savedAt: Date.now() })
    );
  } catch {
    // Local timer persistence is best-effort only.
  }
}

export function clearPersistedTimedSession(sessionMode: string, userBookId: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(timedSessionStorageKey(sessionMode, userBookId));
  } catch {
    // Local timer persistence is best-effort only.
  }
}

export function elapsedMsForPersistedTimedSession(
  state: PersistedTimedSessionState,
  now = Date.now()
) {
  const base = Math.max(0, state.accumulatedElapsedMs);
  if (state.isPaused || state.showTimedSessionForm || !state.startedAt) return base;
  return base + Math.max(0, now - state.startedAt);
}
