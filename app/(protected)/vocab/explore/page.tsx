"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SeenInstance = {
  id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  meaning_choice_index: number | null;
  meaning_choices: any | null;
  jlpt: string | null;
  is_common: boolean | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  created_at: string;
};

type DictionaryEntry = {
  word: string;
  reading: string;
  meanings: string[];
  jlpt: string | null;
  isCommon: boolean | null;
};

type HistoryPatternItem = {
  surface: string;
  reading: string | null;
  meaning: string | null;
  totalAppearances: number;
  lastSeenAt: string;
};

function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

function chapterDisplay(chNum: number | null, chName: string | null) {
  const name = (chName ?? "").trim();
  const num = chNum;

  if (num != null && name) return `Chapter ${num}: ${name}`;
  if (num != null) return `Chapter ${num}`;
  if (name) return name;
  return "";
}

function asStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => String(x)).filter(Boolean);

  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    } catch {}
  }

  return [];
}

function uniqueStrings(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.map((v) => (v ?? "").trim()).filter(Boolean)));
}

export default function WordHistorySearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userBookId = searchParams.get("userBookId") ?? "";
  const initialWord = searchParams.get("word") ?? "";

  const [query, setQuery] = useState(initialWord);
  const [loading, setLoading] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState<string | null>(null);

  const [surface, setSurface] = useState("");
  const [reading, setReading] = useState<string | null>(null);
  const [definitions, setDefinitions] = useState<string[]>([]);
  const [jlpt, setJlpt] = useState<string | null>(null);
  const [isCommon, setIsCommon] = useState<boolean | null>(null);
  const [seenInstances, setSeenInstances] = useState<SeenInstance[]>([]);
  const [totalLookupCount, setTotalLookupCount] = useState(0);

  const [notFoundEntry, setNotFoundEntry] = useState<DictionaryEntry | null>(null);
  const [otherMatches, setOtherMatches] = useState<DictionaryEntry[]>([]);
  const [oftenLookedUp, setOftenLookedUp] = useState<HistoryPatternItem[]>([]);

  const hasActiveResult = !!surface || !!notFoundEntry;
  const hasSearchText = query.trim().length > 0;
  const shouldShowBrowse = !hasActiveResult && !hasSearchText;

  useEffect(() => {
    if (!userBookId) return;

    (async () => {
      const { data, error } = await supabase
        .from("user_books")
        .select(
          `
          id,
          books:book_id (
            title,
            cover_url
          )
        `
        )
        .eq("id", userBookId)
        .single();

      if (error) {
        console.error("Could not load book info:", error);
        return;
      }

      const b = (data as any)?.books;
      setBookTitle(b?.title ?? "");
      setBookCover(b?.cover_url ?? null);
    })();
  }, [userBookId]);

  useEffect(() => {
    if (!initialWord || !userBookId) return;
    void runSearch(initialWord);
  }, [initialWord, userBookId]);

  useEffect(() => {
    let cancelled = false;

    async function loadBookPatterns() {
      if (!userBookId) {
        setBrowseLoading(false);
        setOftenLookedUp([]);
        return;
      }

      setBrowseLoading(true);

      try {
        const { data, error } = await supabase
          .from("user_book_words")
          .select("surface, reading, meaning, created_at")
          .eq("user_book_id", userBookId)
          .eq("hidden", false);

        if (error) throw error;

        const grouped = new Map<
          string,
          {
            surface: string;
            reading: string | null;
            meaning: string | null;
            count: number;
            lastSeenAt: string;
          }
        >();

        for (const row of (data ?? []) as {
          surface: string | null;
          reading: string | null;
          meaning: string | null;
          created_at: string;
        }[]) {
          const word = (row.surface ?? "").trim();
          if (!word) continue;

          const key = `${word}|||${(row.reading ?? "").trim()}`;
          const existing = grouped.get(key);

          if (!existing) {
            grouped.set(key, {
              surface: word,
              reading: row.reading ?? null,
              meaning: row.meaning ?? null,
              count: 1,
              lastSeenAt: row.created_at,
            });
            continue;
          }

          existing.count += 1;
          if (!existing.meaning && row.meaning) {
            existing.meaning = row.meaning;
          }
          if (row.created_at > existing.lastSeenAt) {
            existing.lastSeenAt = row.created_at;
          }
        }

        const items = Array.from(grouped.values())
          .map((item) => ({
            surface: item.surface,
            reading: item.reading,
            meaning: item.meaning,
            totalAppearances: item.count,
            lastSeenAt: item.lastSeenAt,
          }))
          .sort((a, b) => {
            if (b.totalAppearances !== a.totalAppearances) {
              return b.totalAppearances - a.totalAppearances;
            }
            return b.lastSeenAt.localeCompare(a.lastSeenAt);
          })
          .slice(0, 10);

        if (!cancelled) {
          setOftenLookedUp(items);
        }
      } catch (e) {
        console.error("Could not load book word history patterns:", e);
        if (!cancelled) {
          setOftenLookedUp([]);
        }
      } finally {
        if (!cancelled) {
          setBrowseLoading(false);
        }
      }
    }

    void loadBookPatterns();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  async function runSearch(raw?: string) {
    const q = (raw ?? query).trim();
    if (!q || !userBookId) return;

    setLoading(true);
    setErrorMsg(null);

    setSurface("");
    setReading(null);
    setDefinitions([]);
    setJlpt(null);
    setIsCommon(null);
    setSeenInstances([]);
    setTotalLookupCount(0);

    setNotFoundEntry(null);
    setOtherMatches([]);

    try {
      const { data: seen, error: seenError } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          surface,
          reading,
          meaning,
          meaning_choice_index,
          meaning_choices,
          jlpt,
          is_common,
          page_number,
          chapter_number,
          chapter_name,
          created_at
        `
        )
        .eq("user_book_id", userBookId)
        .eq("surface", q)
        .order("created_at", { ascending: false });

      if (seenError) throw seenError;

      const normalizedSeen = ((seen ?? []) as any[]).map((row) => ({
        id: row.id,
        surface: row.surface,
        reading: row.reading ?? null,
        meaning: row.meaning ?? null,
        meaning_choice_index: row.meaning_choice_index ?? null,
        meaning_choices: row.meaning_choices ?? null,
        jlpt: row.jlpt ?? null,
        is_common: row.is_common ?? null,
        page_number: row.page_number ?? null,
        chapter_number: row.chapter_number ?? null,
        chapter_name: row.chapter_name ?? null,
        created_at: row.created_at,
      })) as SeenInstance[];

      if (normalizedSeen.length > 0) {
        const first = normalizedSeen[0];
        const choiceDefs = asStringArray(first.meaning_choices);
        const fallbackDefs = uniqueStrings(normalizedSeen.map((x) => x.meaning));

        setSurface(first.surface);
        setReading(first.reading ?? null);
        setDefinitions(choiceDefs.length > 0 ? choiceDefs : fallbackDefs);
        setJlpt(first.jlpt ?? null);
        setIsCommon(first.is_common ?? null);
        setSeenInstances(normalizedSeen);
        setTotalLookupCount(normalizedSeen.length);
        return;
      }

      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(q)}`);
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];

      const mapped: DictionaryEntry[] = data.map((item: any) => {
        const japanese0 = item?.japanese?.[0] ?? {};
        const senses = Array.isArray(item?.senses) ? item.senses : [];

        const word = japanese0.word ?? japanese0.reading ?? "";
        const reading = japanese0.reading ?? "";

        const meanings = senses
          .map((s: any) =>
            Array.isArray(s?.english_definitions) ? s.english_definitions.join("; ") : ""
          )
          .filter(Boolean);

        const jlptArr = Array.isArray(item?.jlpt) ? item.jlpt : [];
        const jlpt =
          jlptArr.length > 0
            ? String(jlptArr[0]).toUpperCase().replace("JLPT-", "")
            : null;

        return {
          word,
          reading,
          meanings: meanings.length ? meanings : ["—"],
          jlpt,
          isCommon: item?.is_common ?? false,
        };
      });

      if (mapped.length === 0) {
        setErrorMsg("No results found.");
        return;
      }

      setNotFoundEntry(mapped[0]);
      setOtherMatches(mapped.slice(1, 5));
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Could not search word history.");
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setErrorMsg(null);
    setSurface("");
    setReading(null);
    setDefinitions([]);
    setJlpt(null);
    setIsCommon(null);
    setSeenInstances([]);
    setTotalLookupCount(0);
    setNotFoundEntry(null);
    setOtherMatches([]);
    router.replace(`/vocab/explore?userBookId=${encodeURIComponent(userBookId)}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pb-10 pt-15">
      <h1 className="mb-1 text-2xl font-semibold">Word History in This Book</h1>
      <p className="mb-4 text-sm text-stone-500">
        Search this book to see where a word appeared and how you saved it.
      </p>

      {bookTitle ? (
        <div className="mb-6 flex items-center gap-3">
          {bookCover ? (
            <img src={bookCover} alt="" className="h-16 w-12 rounded object-cover" />
          ) : null}
          <div>
            <p className="text-sm text-gray-700">
              In book: <span className="font-medium">{bookTitle}</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              This version only tracks appearances inside this specific book.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void runSearch();
            }
          }}
          placeholder="Search Japanese word..."
          className="flex-1 rounded border bg-white px-3 py-2"
        />

        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {errorMsg ? <p className="mb-4 text-sm text-red-600">{errorMsg}</p> : null}

      {shouldShowBrowse ? (
        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="text-lg font-semibold text-stone-900">Words I Often Look Up</div>
            <p className="mt-1 text-sm text-stone-500">
              Words that show up the most in this book's saved reading.
            </p>
          </div>

          {browseLoading ? (
            <div className="text-sm text-stone-500">Loading recurring words…</div>
          ) : oftenLookedUp.length === 0 ? (
            <div className="text-sm text-stone-500">Nothing here yet.</div>
          ) : (
            <div className="space-y-3">
              {oftenLookedUp.map((item) => (
                <button
                  key={`${item.surface}|||${item.reading ?? ""}`}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/vocab/explore?userBookId=${encodeURIComponent(userBookId)}&word=${encodeURIComponent(item.surface)}`
                    )
                  }
                  className="w-full rounded-xl border p-3 text-left transition hover:bg-stone-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-stone-900">{item.surface}</div>
                      {item.reading ? (
                        <div className="mt-0.5 text-sm text-stone-500">{item.reading}</div>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right text-xs text-stone-500">
                      <div>{item.totalAppearances} appearances</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {surface ? (
        <>
          <section className="w-full rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-4 text-lg font-semibold">Word History</div>

            <div className="flex flex-col gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Word</div>
                <div className="break-words text-4xl font-bold">{surface}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Reading</div>
                <div className="text-2xl font-medium">{reading || "—"}</div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {normalizeJlpt(jlpt) !== "NON-JLPT" ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[17px] font-medium leading-none text-gray-800">
                    {normalizeJlpt(jlpt)}
                  </span>
                ) : null}

                {isCommon ? <span className="text-gray-500">Common</span> : null}
              </div>

              <div className="mt-2 rounded-xl border p-3">
                <div className="text-xs text-gray-500">Appearances in this book</div>
                <div className="text-2xl font-semibold">{totalLookupCount}</div>
              </div>
            </div>
          </section>

          <section className="mt-6 w-full rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-4 text-lg font-semibold">Seen in</div>

            {seenInstances.length === 0 ? (
              <div className="text-sm text-gray-500">No saved instances found yet.</div>
            ) : (
              <div className="space-y-2">
                {seenInstances.map((instance) => {
                  const choices = asStringArray(instance.meaning_choices);
                  const defIndex =
                    instance.meaning_choice_index != null
                      ? instance.meaning_choice_index
                      : choices.findIndex((m) => m === instance.meaning);

                  return (
                    <div key={instance.id} className="rounded-xl border p-3">
                      <div className="text-sm text-stone-600">
                        {chapterDisplay(instance.chapter_number, instance.chapter_name)
                          ? chapterDisplay(instance.chapter_number, instance.chapter_name)
                          : "No chapter"}
                        {instance.page_number != null ? ` • p. ${instance.page_number}` : ""}
                      </div>

                      {instance.meaning ? (
                        <div className="mt-2 text-sm text-stone-500">
                          {defIndex !== -1 && defIndex != null ? `Def ${defIndex + 1}: ` : ""}
                          {instance.meaning}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {notFoundEntry ? (
        <section className="mt-6 w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 text-lg font-semibold">Not found in this book</div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Word</div>
              <div className="break-words text-4xl font-bold">{notFoundEntry.word || "—"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Reading</div>
              <div className="text-2xl font-medium">{notFoundEntry.reading || "—"}</div>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Definitions</div>

              {notFoundEntry.meanings.length > 0 ? (
                <div className="space-y-2">
                  {notFoundEntry.meanings.map((meaning, i) => (
                    <div key={`${meaning}-${i}`} className="rounded-xl border p-3">
                      <div className="text-sm font-semibold text-stone-700">Def {i + 1}</div>
                      <div className="mt-1 text-base text-stone-900">{meaning}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-lg">—</div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {otherMatches.length > 0 ? (
        <section className="mt-6 w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 text-lg font-semibold">Other Possible Matches</div>

          <div className="space-y-3">
            {otherMatches.map((entry, idx) => (
              <div
                key={`${entry.word}-${entry.reading}-${idx}`}
                className="w-full rounded-xl border p-4"
              >
                <div className="font-medium text-stone-900">{entry.word}</div>
                <div className="mt-1 text-sm text-stone-500">{entry.reading || "—"}</div>
                <div className="mt-2 text-sm text-stone-700">{entry.meanings[0] || "—"}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex justify-between">
        <button onClick={() => router.back()} className="rounded bg-gray-200 px-4 py-2">
          ← Back
        </button>

        <button onClick={clearSearch} className="rounded bg-gray-100 px-4 py-2">
          Clear
        </button>
      </div>
    </main>
  );
}
