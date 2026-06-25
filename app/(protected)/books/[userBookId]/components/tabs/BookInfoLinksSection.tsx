type BookInfoLinksSectionProps = {
  canEditBookInfo: boolean;
  isEditingLinks: boolean;
  saving: boolean;
  relatedLinksArr: any[];
  linksText: string;
  setLinksText: (value: string) => void;
  displayLinkLabel: (value: any) => string;
  displayLinkUrl: (value: any) => string;
  onEditLinks: () => void;
  onCancel: () => void;
  onSave: () => void;
};

const LINK_FIELD_OPTIONS = [
  {
    label: "Amazon",
    placeholder: "https://www.amazon.co.jp/...",
  },
  {
    label: "BookWalker",
    placeholder: "https://bookwalker.jp/...",
  },
  {
    label: "Other",
    placeholder: "https://...",
  },
] as const;

function parseLinkTextToMap(text: string) {
  const map = new Map<string, string>();

  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split("|").map((part) => part.trim());

      if (parts.length >= 2) {
        const label = parts[0];
        const url = parts.slice(1).join("|").trim();

        if (label && url) {
          map.set(label, url);
        }

        return;
      }

      if (parts[0]) {
        map.set("Other", parts[0]);
      }
    });

  return map;
}

export default function BookInfoLinksSection({
  canEditBookInfo,
  isEditingLinks,
  saving,
  relatedLinksArr,
  linksText,
  setLinksText,
  displayLinkLabel,
  displayLinkUrl,
  onEditLinks,
  onCancel,
  onSave,
}: BookInfoLinksSectionProps) {
  function getLinkFieldValue(label: string) {
    return parseLinkTextToMap(linksText).get(label) ?? "";
  }

  function updateLinkField(label: string, value: string) {
    const nextMap = parseLinkTextToMap(linksText);
    const trimmedValue = value.trim();

    if (trimmedValue) {
      nextMap.set(label, trimmedValue);
    } else {
      nextMap.delete(label);
    }

    const nextText = LINK_FIELD_OPTIONS
      .map((option) => {
        const url = nextMap.get(option.label)?.trim();
        return url ? `${option.label} | ${url}` : "";
      })
      .filter(Boolean)
      .join("\n");

    setLinksText(nextText);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-stone-900">Where to Find It</div>
        {!isEditingLinks ? (
          canEditBookInfo ? (
            <button
              type="button"
              onClick={onEditLinks}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100"
            >
              Edit
            </button>
          ) : null
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {relatedLinksArr.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-sm">
          {relatedLinksArr.map((item: any, idx: number) => {
            const label = displayLinkLabel(item);
            const url = displayLinkUrl(item);

            return (
              <li key={idx}>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-700 transition hover:bg-stone-100"
                  >
                    {label}
                  </a>
                ) : (
                  <span className="text-stone-500">{label || "—"}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-sm text-stone-500">—</div>
      )}

      {isEditingLinks ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {LINK_FIELD_OPTIONS.map((option) => (
            <label key={option.label} className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                {option.label}
              </span>

              <input
                value={getLinkFieldValue(option.label)}
                onChange={(event) => updateLinkField(option.label, event.target.value)}
                placeholder={option.placeholder}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
