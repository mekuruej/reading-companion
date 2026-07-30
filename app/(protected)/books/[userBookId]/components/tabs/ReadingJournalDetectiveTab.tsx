import type { DetectiveEntry } from "./readingJournalTypes";

type ReadingJournalDetectiveTabProps = {
  detectiveEntries: DetectiveEntry[];
  detectiveSearch: string;
  setDetectiveSearch: (value: string) => void;
  collapsedDetectiveGroups: string[];
  expandedDetectiveIds: string[];
  editingDetectiveIds: string[];
  savingDetectiveIds: string[];
  savedDetectiveIds: string[];
  addDetectiveEntry: () => void;
  updateDetectiveEntry: (
    id: string,
    field: keyof DetectiveEntry,
    value: string | number | null
  ) => void;
  startEditingDetectiveEntry: (id: string) => void;
  stopEditingDetectiveEntry: (id: string) => void;
  toggleDetectiveEntryExpanded: (id: string) => void;
  toggleDetectiveGroup: (groupKey: string) => void;
  saveDetectiveEntry: (entry: DetectiveEntry) => Promise<void>;
  deleteDetectiveEntry: (id: string) => Promise<void>;
};

type DetectiveGroup = {
  key: string;
  label: string;
  entries: DetectiveEntry[];
};

const detectiveFieldLabels: Array<{
  key: "certain_text" | "likely_text" | "possible_text" | "unknown_text";
  label: string;
}> = [
  { key: "certain_text", label: "Certain" },
  { key: "likely_text", label: "Likely" },
  { key: "possible_text", label: "Possible" },
  { key: "unknown_text", label: "Unknown" },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function detectiveLocationLabel(entry: DetectiveEntry) {
  const parts: string[] = [];
  if (entry.chapter_label?.trim()) parts.push(entry.chapter_label.trim());
  else if (entry.chapter_number != null) parts.push(`Chapter ${entry.chapter_number}`);
  if (entry.page_number != null) parts.push(`Page ${entry.page_number}`);
  return parts.join(" · ");
}

function detectiveGroupForEntry(entry: DetectiveEntry) {
  if (entry.chapter_label?.trim()) {
    return {
      key: `chapter-label:${entry.chapter_label.trim().toLowerCase()}`,
      label: entry.chapter_label.trim(),
    };
  }

  if (entry.chapter_number != null) {
    return {
      key: `chapter-number:${entry.chapter_number}`,
      label: `Chapter ${entry.chapter_number}`,
    };
  }

  if (entry.page_number != null) {
    return {
      key: `page:${entry.page_number}`,
      label: `Page ${entry.page_number}`,
    };
  }

  return { key: "unsorted", label: "Unsorted" };
}

function detectiveEntryFallbackTitle(entry: DetectiveEntry) {
  const title = normalizeText(entry.title);
  if (title) return title;

  const firstField = detectiveFieldLabels
    .map((field) => normalizeText(entry[field.key]))
    .find(Boolean);

  if (!firstField) return "Untitled detective note";
  return firstField.length > 90 ? `${firstField.slice(0, 90)}...` : firstField;
}

function detectiveSearchText(entry: DetectiveEntry) {
  return [
    entry.title,
    entry.chapter_label,
    entry.chapter_number == null ? "" : String(entry.chapter_number),
    entry.page_number == null ? "" : String(entry.page_number),
    entry.certain_text,
    entry.likely_text,
    entry.possible_text,
    entry.unknown_text,
  ]
    .join(" ")
    .toLowerCase();
}

export default function ReadingJournalDetectiveTab({
  detectiveEntries,
  detectiveSearch,
  setDetectiveSearch,
  collapsedDetectiveGroups,
  expandedDetectiveIds,
  editingDetectiveIds,
  savingDetectiveIds,
  savedDetectiveIds,
  addDetectiveEntry,
  updateDetectiveEntry,
  startEditingDetectiveEntry,
  stopEditingDetectiveEntry,
  toggleDetectiveEntryExpanded,
  toggleDetectiveGroup,
  saveDetectiveEntry,
  deleteDetectiveEntry,
}: ReadingJournalDetectiveTabProps) {
  const cleanDetectiveSearch = detectiveSearch.trim().toLowerCase();
  const filteredDetectiveEntries = cleanDetectiveSearch
    ? detectiveEntries.filter((entry) => detectiveSearchText(entry).includes(cleanDetectiveSearch))
    : detectiveEntries;

  const detectiveGroups = filteredDetectiveEntries.reduce<DetectiveGroup[]>((groups, entry) => {
    const groupInfo = detectiveGroupForEntry(entry);
    const existingGroup = groups.find((group) => group.key === groupInfo.key);

    if (existingGroup) {
      existingGroup.entries.push(entry);
      return groups;
    }

    groups.push({
      key: groupInfo.key,
      label: groupInfo.label,
      entries: [entry],
    });

    return groups;
  }, []);

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="text-sm font-semibold text-stone-900">Detective Notes</div>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Track what you know, suspect, and still wonder while the story unfolds.
          </p>
        </div>
        <button
          type="button"
          onClick={addDetectiveEntry}
          className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-800"
        >
          New Detective Entry
        </button>
      </div>

      <input
        value={detectiveSearch}
        onChange={(event) => setDetectiveSearch(event.target.value)}
        placeholder="Search detective notes..."
        className="mb-4 w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
      />

      {detectiveEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 p-5 text-sm leading-6 text-stone-600">
          No detective notes yet. Add a question, clue, theory, or something you are still
          unsure about.
        </div>
      ) : detectiveGroups.length === 0 ? (
        <div className="rounded-2xl border border-violet-100 bg-white p-5 text-sm text-stone-600">
          No detective notes match this search.
        </div>
      ) : (
        <div className="space-y-3">
          {detectiveGroups.map((group) => {
            const groupCollapsed = collapsedDetectiveGroups.includes(group.key);

            return (
              <section key={group.key} className="rounded-2xl border border-violet-100 bg-white p-3">
                <button
                  type="button"
                  onClick={() => toggleDetectiveGroup(group.key)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="font-black text-stone-900">{group.label}</span>
                  <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-800">
                    {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"} · {groupCollapsed ? "Show" : "Hide"}
                  </span>
                </button>

                {!groupCollapsed ? (
                  <div className="mt-3 space-y-2">
                    {group.entries.map((entry) => {
                      const isExpanded = expandedDetectiveIds.includes(entry.id);
                      const isEditing = editingDetectiveIds.includes(entry.id);
                      const isSaving = savingDetectiveIds.includes(entry.id);
                      const isSaved = savedDetectiveIds.includes(entry.id);
                      const populatedFields = detectiveFieldLabels.filter((field) =>
                        normalizeText(entry[field.key])
                      );

                      return (
                        <article key={entry.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <button
                              type="button"
                              onClick={() => toggleDetectiveEntryExpanded(entry.id)}
                              className="min-w-0 text-left"
                            >
                              <div className="font-black text-stone-950">
                                {detectiveEntryFallbackTitle(entry)}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-semibold text-stone-500">
                                {detectiveLocationLabel(entry) ? (
                                  <span>{detectiveLocationLabel(entry)}</span>
                                ) : (
                                  <span>No location yet</span>
                                )}
                                <span>·</span>
                                <span>{populatedFields.map((field) => field.label).join(", ")}</span>
                              </div>
                            </button>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              {isSaved ? (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                                  Saved
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => toggleDetectiveEntryExpanded(entry.id)}
                                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
                              >
                                {isExpanded ? "Collapse" : "Expand"}
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditingDetectiveEntry(entry.id)}
                                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
                              >
                                Edit
                              </button>
                            </div>
                          </div>

                          {isExpanded || isEditing ? (
                            <div className="mt-3 border-t border-stone-200 pt-3">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <input
                                    value={entry.title ?? ""}
                                    onChange={(event) =>
                                      updateDetectiveEntry(entry.id, "title", event.target.value)
                                    }
                                    placeholder="Short title or question"
                                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                  />

                                  <div className="grid gap-2 sm:grid-cols-3">
                                    <input
                                      value={entry.chapter_label ?? ""}
                                      onChange={(event) =>
                                        updateDetectiveEntry(entry.id, "chapter_label", event.target.value)
                                      }
                                      placeholder="Chapter reference"
                                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                    />
                                    <input
                                      type="number"
                                      min="1"
                                      value={entry.chapter_number ?? ""}
                                      onChange={(event) =>
                                        updateDetectiveEntry(
                                          entry.id,
                                          "chapter_number",
                                          event.target.value.trim() ? Number(event.target.value) : null
                                        )
                                      }
                                      placeholder="Chapter #"
                                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                    />
                                    <input
                                      type="number"
                                      min="1"
                                      value={entry.page_number ?? ""}
                                      onChange={(event) =>
                                        updateDetectiveEntry(
                                          entry.id,
                                          "page_number",
                                          event.target.value.trim() ? Number(event.target.value) : null
                                        )
                                      }
                                      placeholder="Page #"
                                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                    />
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    {detectiveFieldLabels.map((field) => (
                                      <label key={field.key} className="block">
                                        <span className="text-xs font-black uppercase tracking-[0.12em] text-violet-800">
                                          {field.label}
                                        </span>
                                        <textarea
                                          value={entry[field.key] ?? ""}
                                          onChange={(event) =>
                                            updateDetectiveEntry(entry.id, field.key, event.target.value)
                                          }
                                          placeholder={`${field.label}...`}
                                          className="mt-1 min-h-[92px] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-violet-200"
                                        />
                                      </label>
                                    ))}
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void saveDetectiveEntry(entry)}
                                      disabled={isSaving}
                                      className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-black text-white hover:bg-violet-800 disabled:opacity-50"
                                    >
                                      {isSaving ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => stopEditingDetectiveEntry(entry.id)}
                                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deleteDetectiveEntry(entry.id)}
                                      className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-bold text-stone-900 hover:bg-stone-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {populatedFields.map((field) => (
                                    <div key={field.key} className="rounded-xl border border-stone-200 bg-white p-3">
                                      <div className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">
                                        {field.label}
                                      </div>
                                      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                                        {entry[field.key]}
                                      </div>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => void deleteDetectiveEntry(entry.id)}
                                    className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-bold text-stone-900 hover:bg-stone-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
