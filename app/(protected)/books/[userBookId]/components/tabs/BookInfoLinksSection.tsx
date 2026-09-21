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
    group: "Shopping",
    placeholder: "https://www.amazon.co.jp/...",
  },
  {
    label: "Ehon Hiroba",
    group: "Reading & other",
    placeholder: "https://ehon.alphapolis.co.jp/...",
  },
  {
    label: "BookWalker",
    group: "Shopping",
    placeholder: "https://bookwalker.jp/...",
  },
  {
    label: "Publisher",
    group: "Reference",
    placeholder: "Publisher’s page for this book",
  },
  {
    label: "Books.or.jp",
    group: "Reference",
    placeholder: "https://www.books.or.jp/...",
  },
  {
    label: "Other",
    group: "Reading & other",
    placeholder: "https://...",
  },
] as const;

const LINK_GROUPS = ["Shopping", "Reference", "Reading & other"] as const;

function linkGroup(label: string) {
  return LINK_FIELD_OPTIONS.find((option) => option.label === label)?.group ?? "Reading & other";
}

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

    const nextText = Array.from(nextMap.entries())
      .map(([linkLabel, url]) => `${linkLabel} | ${url}`)
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

      <p className="mb-3 text-sm text-stone-500">
        Links to read, buy, or learn more about this book.
      </p>

      <div className="space-y-4">
        {LINK_GROUPS.map((group) => {
          const groupLinks = relatedLinksArr.filter((item) => linkGroup(displayLinkLabel(item)) === group);
          const groupOptions = LINK_FIELD_OPTIONS.filter((option) => option.group === group);

          if (!isEditingLinks && groupLinks.length === 0) return null;

          return (
            <section key={group}>
              <h4 className="mb-2 text-sm font-semibold text-stone-700">{group}</h4>
              {isEditingLinks ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {groupOptions.map((option) => (
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
              ) : (
                <ul className="flex flex-wrap gap-2 text-sm">
                  {groupLinks.map((item: any, idx: number) => {
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
              )}
            </section>
          );
        })}
        {!isEditingLinks && relatedLinksArr.length === 0 ? (
          <div className="text-sm text-stone-500">—</div>
        ) : null}
      </div>
    </div>
  );
}
