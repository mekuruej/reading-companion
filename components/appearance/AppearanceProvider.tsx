"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  APPEARANCE_PALETTES,
  DEFAULT_APPEARANCE,
  getAppearanceBackgroundImage,
  normalizeAppearancePreferences,
  type AppearancePaletteId,
  type AppearancePreferences,
  type AppearanceTreatmentId,
} from "@/lib/appearance/palettes";

const STORAGE_KEY = "mekuru-appearance-v1";
const CHANGE_EVENT = "mekuru-appearance-updated";
let volatileSnapshot: string | null = null;
let useVolatileSnapshot = false;

function getSnapshot() {
  if (useVolatileSnapshot) return volatileSnapshot;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return volatileSnapshot;
  }
}

function getServerSnapshot() {
  return null;
}

function subscribe(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    volatileSnapshot = event.newValue;
    useVolatileSnapshot = false;
    onStoreChange();
  }
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function savePreferences(preferences: AppearancePreferences) {
  const serialized = JSON.stringify(preferences);
  volatileSnapshot = serialized;
  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
    useVolatileSnapshot = false;
  } catch {
    useVolatileSnapshot = true;
    // The in-memory snapshot still supports this visit if browser storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

type AppearanceContextValue = {
  preferences: AppearancePreferences;
  palette: (typeof APPEARANCE_PALETTES)[AppearancePaletteId];
  setPalette: (palette: AppearancePaletteId) => void;
  setTreatment: (treatment: AppearanceTreatmentId) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const savedSnapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  let preferences = DEFAULT_APPEARANCE;
  try {
    const parsed: unknown = savedSnapshot ? JSON.parse(savedSnapshot) : null;
    preferences = normalizeAppearancePreferences(parsed) ?? DEFAULT_APPEARANCE;
  } catch {
    // Ignore malformed browser data and use the default appearance.
  }

  useEffect(() => {
    if (!savedSnapshot) return;
    try {
      const parsed: unknown = JSON.parse(savedSnapshot);
      const normalized = normalizeAppearancePreferences(parsed);
      if (!normalized || !parsed || typeof parsed !== "object") return;
      const saved = parsed as { palette?: unknown; treatment?: unknown };
      if (saved.palette !== normalized.palette || saved.treatment !== normalized.treatment) {
        savePreferences(normalized);
      }
    } catch {
      // Leave malformed browser data untouched and continue using the default appearance.
    }
  }, [savedSnapshot]);

  useEffect(() => {
    const palette = APPEARANCE_PALETTES[preferences.palette];
    const root = document.documentElement;
    root.style.setProperty("--appearance-page", palette.page);
    root.style.setProperty("--appearance-page-background", palette.page);
    root.style.setProperty(
      "--appearance-page-image",
      getAppearanceBackgroundImage(preferences.palette, preferences.treatment),
    );
    root.style.setProperty("--appearance-navigation", palette.navigation);
    root.style.setProperty("--appearance-brand-text", palette.brandText);
    root.style.setProperty("--appearance-text", palette.text);
    root.style.setProperty("--appearance-muted-text", palette.mutedText);
    root.style.setProperty("--appearance-accent", palette.accent);
    root.style.setProperty("--appearance-border", palette.border);
    root.style.setProperty("--appearance-surface", palette.surface);
    root.style.setProperty("--appearance-surface-muted", palette.surfaceMuted);
    root.dataset.appearancePalette = preferences.palette;
    root.dataset.appearanceTreatment = preferences.treatment;

  }, [preferences]);

  const setPalette = useCallback((palette: AppearancePaletteId) => {
    savePreferences({ ...preferences, palette });
  }, [preferences]);
  const setTreatment = useCallback((treatment: AppearanceTreatmentId) => {
    savePreferences({ ...preferences, treatment });
  }, [preferences]);

  const value = useMemo<AppearanceContextValue>(() => ({
    preferences,
    palette: APPEARANCE_PALETTES[preferences.palette],
    setPalette,
    setTreatment,
  }), [preferences, setPalette, setTreatment]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance must be used within AppearanceProvider");
  return value;
}
