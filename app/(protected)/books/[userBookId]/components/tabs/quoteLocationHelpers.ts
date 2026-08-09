export type FavoriteQuoteInput = {
  text: string;
  page: string;
  percent: string;
};

const LOCATION_LINE_PATTERN =
  /^Location:\s*(?:(?:p\.?|page)\s*([0-9]+))?\s*(?:\/\s*)?(?:([0-9]+(?:\.[0-9]+)?)\s*%)?\s*$/i;

export function emptyFavoriteQuoteInput(): FavoriteQuoteInput {
  return {
    text: "",
    page: "",
    percent: "",
  };
}

export function favoriteQuoteTextToInputs(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  if (!text) return [emptyFavoriteQuoteInput()];

  const pieces = text.includes("\n\n") ? text.split(/\n{2,}/) : text.split(/\n/);
  const quotes = pieces
    .map((piece) => {
      const lines = piece
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const locationMatch = lines.at(-1)?.match(LOCATION_LINE_PATTERN);

      if (!locationMatch) {
        return {
          ...emptyFavoriteQuoteInput(),
          text: lines.join("\n").trim(),
        };
      }

      return {
        text: lines.slice(0, -1).join("\n").trim(),
        page: locationMatch[1] ?? "",
        percent: locationMatch[2] ?? "",
      };
    })
    .filter((quote) => quote.text || quote.page || quote.percent);

  return quotes.length > 0 ? quotes : [emptyFavoriteQuoteInput()];
}

export function favoriteQuoteInputsToText(values: FavoriteQuoteInput[]) {
  return values
    .map((value) => {
      const quote = value.text.trim();
      const page = value.page.trim();
      const percent = value.percent.trim();
      if (!quote && !page && !percent) return "";

      const locationParts = [
        page ? `p. ${page}` : "",
        percent ? `${percent}%` : "",
      ].filter(Boolean);

      return [quote, locationParts.length > 0 ? `Location: ${locationParts.join(" / ")}` : ""]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function normalizeSavedQuote(value: FavoriteQuoteInput | string) {
  const text = typeof value === "string" ? value : value.text;
  return text.trim().replace(/\s+/g, " ");
}
