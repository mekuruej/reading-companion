export function normalizeAsin(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();
  return normalized || null;
}

export function isValidAsin(value: string | null | undefined) {
  const normalized = normalizeAsin(value);
  return normalized ? /^[A-Z0-9]{10}$/.test(normalized) : false;
}
