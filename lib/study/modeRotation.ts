export type ModeRotation<T extends string> = { current: T; remaining: T[] };

export function shuffleModes<T>(modes: readonly T[], random: () => number = Math.random): T[] {
  const result = [...modes];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function startModeRotation<T extends string>(modes: readonly T[], random: () => number = Math.random): ModeRotation<T> {
  if (!modes.length) throw new Error("A study rotation needs at least one mode.");
  const [current, ...remaining] = shuffleModes(modes, random);
  return { current, remaining };
}

// The next choice is stored, so its completion-screen label stays stable.
// A manual choice also counts as a turn in the current cycle.
export function selectRotationMode<T extends string>(rotation: ModeRotation<T>, chosen: T, freshOrder: readonly T[]): ModeRotation<T> {
  if (chosen === rotation.current) return rotation;
  const remaining = rotation.remaining.filter(mode => mode !== chosen);
  if (remaining.length) return { current: chosen, remaining };
  const nextCycle = [...freshOrder];
  if (nextCycle.length > 1 && nextCycle[0] === chosen) {
    // Move the boundary repeat to the end without dropping it from the cycle.
    nextCycle.push(nextCycle.shift()!);
  }
  return { current: chosen, remaining: nextCycle };
}
