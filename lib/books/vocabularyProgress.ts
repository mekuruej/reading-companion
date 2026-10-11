import { parseProgressPosition, type ProgressTrackingMethod } from "./readingProgress";
export type CapturePosition = { value: string | number | null; unit: ProgressTrackingMethod };
// Call only with the current batch/capture's saved words, never the vocabulary library.
export function suggestCapturePosition(words: CapturePosition[], method: ProgressTrackingMethod | null): string {
  if (!method) return "";
  const positions = words.filter(word => word.unit === method).map(word => parseProgressPosition(String(word.value ?? ""), method, null))
    .filter(parsed => !parsed.error && parsed.value != null).map(parsed => parsed.value!);
  return positions.length ? String(Math.max(...positions)) : "";
}
