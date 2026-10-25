/** Interpret display values without rewriting the stored preference. */
export function interpretPublicJapaneseLevel(raw: string | null | undefined) {
  const value = raw?.trim() ?? "";
  if (!value || value === "None") {
    return { kind: "hidden" as const, selectValue: "None", label: "Hidden" };
  }
  if (/^Level ([1-9]|10)$/.test(value)) {
    return { kind: "current" as const, selectValue: value, label: value };
  }
  return {
    kind: "legacy" as const,
    selectValue: raw!,
    label: `Existing legacy value: ${value}`,
  };
}
