const ISO_639_3_TO_1: Record<string, string> = {
  ara: "ar",
  chi: "zh",
  dan: "da",
  deu: "de",
  dut: "nl",
  eng: "en",
  fin: "fi",
  fra: "fr",
  fre: "fr",
  ger: "de",
  hin: "hi",
  ind: "id",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  nld: "nl",
  nor: "no",
  per: "fa",
  por: "pt",
  rus: "ru",
  spa: "es",
  swe: "sv",
  tha: "th",
  tur: "tr",
  ukr: "uk",
  vie: "vi",
  zho: "zh",
};

const UNTRUSTED_LANGUAGE_VALUES = new Set([
  "mul",
  "multiple",
  "n/a",
  "none",
  "other",
  "und",
  "undefined",
  "unknown",
  "zxx",
]);

export const COMMON_BOOK_LANGUAGE_OPTIONS = [
  { code: "ja", label: "Japanese" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ar", label: "Arabic" },
  { code: "vi", label: "Vietnamese" },
  { code: "th", label: "Thai" },
  { code: "id", label: "Indonesian" },
  { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "no", label: "Norwegian" },
  { code: "fi", label: "Finnish" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "hi", label: "Hindi" },
];

export function normalizeBookLanguageCode(value: string | null | undefined) {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;

  const extracted = raw.match(/\/languages\/([a-z]{2,3})$/)?.[1] ?? raw;
  const primarySubtag = extracted.split(/[-_]/)[0];

  if (UNTRUSTED_LANGUAGE_VALUES.has(primarySubtag)) return null;
  if (/^[a-z]{2}$/.test(primarySubtag)) return primarySubtag;
  if (/^[a-z]{3}$/.test(primarySubtag)) {
    return ISO_639_3_TO_1[primarySubtag] ?? null;
  }

  return null;
}

export function bookLanguageLabel(value: string | null | undefined) {
  const code = normalizeBookLanguageCode(value);
  if (!code) return null;

  const common = COMMON_BOOK_LANGUAGE_OPTIONS.find((option) => option.code === code);
  if (common) return common.label;

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
    return displayNames.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}
