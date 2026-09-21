"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { selectRotationMode, shuffleModes, startModeRotation, type ModeRotation } from "./modeRotation";

export function useStudyModeRotation<T extends string>(modes: readonly T[], initial: T) {
  const [rotation, setRotation] = useState<ModeRotation<T> & { initialized: boolean }>(() => ({
    current: initial,
    remaining: modes.filter(mode => mode !== initial),
    initialized: false,
  }));

  useEffect(() => {
    // Start in the browser, after hydration; never generate a new mode during render.
    const timer = window.setTimeout(() => {
      const shuffled = startModeRotation(modes);
      setRotation(previous => previous.initialized ? previous : { ...shuffled, initialized: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [modes]);

  const selectMode = useCallback((action: SetStateAction<T>) => {
    const freshOrder = shuffleModes(modes);
    setRotation(previous => {
      const chosen = typeof action === "function" ? action(previous.current) : action;
      if (chosen === previous.current) return previous;
      return { ...selectRotationMode(previous, chosen, freshOrder), initialized: true };
    });
  }, [modes]);

  return [rotation.current, selectMode, rotation.remaining[0] ?? rotation.current] as const;
}
