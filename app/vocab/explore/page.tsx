"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
type ExploreEntry = {
  word: string;
  reading: string;
  meanings: string[];
  jlpt: string | null;
  isCommon: boolean | null;
};

type SeenInstance = {
  id: string;
  user_book_id: string;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  created_at: string;
  book_title: string;
};

type KanjiStroke = {
  kanji: string;
  strokes: number | null;
};

type RelatedWord = {
  word: string;
  reading: string;
  meaning: string;
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

function chapterDisplay(chNum: number | null, chName: string | null) {
  const name = (chName ?? "").trim();
  if (chNum != null && name) return `Chapter ${chNum}: ${name}`;
  if (chNum != null) return `Chapter ${chNum}`;
  if (name) return name;
  return "";
}

function firstKanjiOf(word: string) {
  return word.match(/[一-龯]/)?.[0] ?? null;
}

async function getStrokeData(word: string): Promise<KanjiStroke[]> {
  const chars = Array.from(new Set(word.match(/[\u3400-\u9FFF]/g) || []));
  const results: KanjiStroke[] = [];

  for (const ch of chars) {
    try {
      const r = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`);
      if (!r.ok) {
        results.push({ kanji: ch, strokes: null });
        continue;
      }
      const data = await r.json();
      results.push({ kanji: ch, strokes: data.stroke_count ?? null });
    } catch {
      results.push({ kanji: ch, strokes: null });
    }
  }

  return results;
}

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------
export default function ExploreWordPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [userBookId, setUserBookId] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [mainEntry, setMainEntry] = useState<ExploreEntry | null>(null);
  const [otherMatches, setOtherMatches] = useState<ExploreEntry[]>([]);

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState<string | null>(null);

  const [selectedMeaningIndex, setSelectedMeaningIndex] = useState(0);

  const [repeatsInThisBook, setRepeatsInThisBook] = useState<number>(0);
  const [totalLookupCount, setTotalLookupCount] = useState<number>(0);
  const [seenInstances, setSeenInstances] = useState<SeenInstance[]>([]);

  const [kanjiStrokes, setKanjiStrokes] = useState<KanjiStroke[]>([]);
  const [relatedWords, setRelatedWords] = useState<RelatedWord[]>([]);

  const selectedMeaning =
    mainEntry?.meanings?.[selectedMeaningIndex] ?? null;

  // -------------------------------------------------------------
  // Pull userBookId from URL
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setUserBookId(params.get("userBookId") || "");
  }, []);

  // -------------------------------------------------------------
  // Load book info
  // -------------------------------------------------------------
  useEffect(() => {
    if (!userBookId) {
      setBookTitle("");
      setBookCover(null);
      return;
    }

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

  // -------------------------------------------------------------
  // Search
  // -------------------------------------------------------------
  async function runSearch() {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg(null);

    setMainEntry(null);
    setOtherMatches([]);
    setSelectedMeaningIndex(0);

    setRepeatsInThisBook(0);
    setTotalLookupCount(0);
    setSeenInstances([]);
    setKanjiStrokes([]);
    setRelatedWords([]);

    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(q)}`);
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];

      const mapped: ExploreEntry[] = data.map((item: any) => {
        const japanese0 = item?.japanese?.[0] ?? {};
        const senses = Array.isArray(item?.senses) ? item.senses : [];

        const word = japanese0.word ?? japanese0.reading ?? "";
        const reading = japanese0.reading ?? "";

        const meanings = senses
          .map((s: any) =>
            Array.isArray(s?.english_definitions)
              ? s.english_definitions.join("; ")
              : ""
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

      const first = mapped[0];
      const firstMeaning = first.meanings[0] ?? null;

      setMainEntry(first);
      setOtherMatches(mapped.slice(1, 5));
      setSelectedMeaningIndex(0);

      await loadBookAwareInfo(first.word, firstMeaning);
      await loadKanjiInfo(first.word);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Could not search dictionary.");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------------
  // Book-aware info
  // -------------------------------------------------------------
  async function loadBookAwareInfo(surface: string, meaning: string | null) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (userBookId) {
        const { count: repeatCount, error: repeatErr } = await supabase
          .from("user_book_words")
          .select("id", { count: "exact", head: true })
          .eq("user_book_id", userBookId)
          .eq("surface", surface)
          .eq("meaning", meaning);

        if (!repeatErr) {
          setRepeatsInThisBook(repeatCount ?? 0);
        } else {
          setRepeatsInThisBook(0);
        }
      } else {
        setRepeatsInThisBook(0);
      }

      const { data: seen, error: seenErr } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          user_book_id,
          page_number,
          chapter_number,
          chapter_name,
          created_at,
          user_books!inner (
            user_id,
            books:book_id (
              title
            )
          )
        `
        )
        .eq("surface", surface)
        .eq("meaning", meaning)
        .eq("user_books.user_id", user.id)
        .order("created_at", { ascending: false });

      if (!seenErr) {
        const normalizedSeen: SeenInstance[] = (seen ?? []).map((row: any) => ({
          id: row.id,
          user_book_id: row.user_book_id,
          page_number: row.page_number ?? null,
          chapter_number: row.chapter_number ?? null,
          chapter_name: row.chapter_name ?? null,
          created_at: row.created_at,
          book_title: row.user_books?.books?.title ?? "(unknown book)",
        }));

        setSeenInstances(normalizedSeen);
      } else {
        setSeenInstances([]);
      }

      const { data: allSeen, error: allSeenErr } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          user_books!inner (
            user_id
          )
        `
        )
        .eq("surface", surface)
        .eq("meaning", meaning)
        .eq("user_books.user_id", user.id);

      if (!allSeenErr) {
        setTotalLookupCount((allSeen ?? []).length);
      } else {
        setTotalLookupCount(0);
      }
    } catch (e) {
      console.error("Failed to load book-aware info:", e);
      setRepeatsInThisBook(0);
      setTotalLookupCount(0);
      setSeenInstances([]);
    }
  }

  // -------------------------------------------------------------
  // Kanji info
  // -------------------------------------------------------------
  async function loadKanjiInfo(surface: string) {
    try {
      const strokes = await getStrokeData(surface);
      setKanjiStrokes(strokes);

      const firstKanji = firstKanjiOf(surface);
      if (!firstKanji) {
        setRelatedWords([]);
        return;
      }

      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(firstKanji)}`);
      if (!res.ok) {
        setRelatedWords([]);
        return;
      }

      const data = await res.json();
      const results: RelatedWord[] = (data?.data ?? [])
        .slice(0, 5)
        .map((item: any) => ({
          word: item?.japanese?.[0]?.word ?? item?.japanese?.[0]?.reading ?? "",
          reading: item?.japanese?.[0]?.reading ?? "",
          meaning: item?.senses?.[0]?.english_definitions?.join("; ") ?? "",
        }))
        .filter((x: RelatedWord) => x.word);

      setRelatedWords(results);
    } catch (e) {
      console.error("Failed to load kanji info:", e);
      setKanjiStrokes([]);
      setRelatedWords([]);
    }
  }

  // -------------------------------------------------------------
  // When selected definition changes, refresh counts/Seen in
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mainEntry || selectedMeaning == null) return;

    loadBookAwareInfo(mainEntry.word, selectedMeaning);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMeaningIndex]);

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 pb-10 pt-30">
      <h1 className="mb-4 text-2xl font-semibold">Explore the Word</h1>

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
              Search a word and explore it more deeply in the context of this book.
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
            if (e.key === "Enter") runSearch();
          }}
          placeholder="Search Japanese word..."
          className="flex-1 rounded border bg-white px-3 py-2"
        />

        <button
          type="button"
          onClick={runSearch}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {errorMsg ? <p className="mb-4 text-sm text-red-600">{errorMsg}</p> : null}

      {mainEntry ? (
        <section className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Word</div>
              <div className="break-words text-4xl font-bold">{mainEntry.word || "—"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Reading</div>
              <div className="text-2xl font-medium">{mainEntry.reading || "—"}</div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Definition
                </div>

                {mainEntry.meanings.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {mainEntry.meanings.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedMeaningIndex(i)}
                        className={`rounded border px-2 py-1 text-xs ${
                          i === selectedMeaningIndex
                            ? "border-stone-900 bg-stone-900 text-white"
                            : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        Def {i + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 text-lg">{selectedMeaning || "—"}</div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {normalizeJlpt(mainEntry.jlpt) !== "NON-JLPT" ? (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[17px] font-medium leading-none text-gray-800">
                  {normalizeJlpt(mainEntry.jlpt)}
                </span>
              ) : null}

              {mainEntry.isCommon ? (
                <span className="text-gray-500">Common</span>
              ) : null}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-3">
                <div className="text-xs text-gray-500">Repeats in this book</div>
                <div className="text-2xl font-semibold">{repeatsInThisBook}</div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="text-xs text-gray-500">Total lookup count</div>
                <div className="text-2xl font-semibold">{totalLookupCount}</div>
                <div className="mt-1 text-xs text-gray-400">Across all your books</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {mainEntry && seenInstances.length > 0 ? (
        <section className="mt-6 w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 text-lg font-semibold">Seen in:</div>

          <ul className="space-y-2">
            {seenInstances.map((instance) => (
              <li key={instance.id} className="text-sm text-stone-700">
                {instance.book_title}
                {chapterDisplay(instance.chapter_number, instance.chapter_name)
                  ? ` • ${chapterDisplay(instance.chapter_number, instance.chapter_name)}`
                  : ""}
                {instance.page_number != null ? ` • p. ${instance.page_number}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mainEntry && (kanjiStrokes.length > 0 || relatedWords.length > 0) ? (
        <section className="mt-6 w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 text-lg font-semibold">Related Information</div>

          {kanjiStrokes.length > 0 ? (
            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold">Kanji Stroke Count</div>
              <div className="flex flex-wrap gap-2">
                {kanjiStrokes.map((k) => (
                  <span
                    key={k.kanji}
                    className="rounded-full border bg-stone-50 px-3 py-1 text-sm"
                  >
                    {k.kanji}: {k.strokes ?? "?"}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {relatedWords.length > 0 ? (
            <div>
              <div className="mb-2 text-sm font-semibold">
                Words with {firstKanjiOf(mainEntry.word) ?? "this kanji"}
              </div>

              <div className="space-y-2">
                {relatedWords.map((kw, i) => (
                  <div key={`${kw.word}-${i}`} className="text-sm">
                    <span className="font-medium text-stone-900">{kw.word}</span>
                    {kw.reading ? (
                      <span className="ml-2 text-stone-600">（{kw.reading}）</span>
                    ) : null}
                    {kw.meaning ? (
                      <div className="mt-0.5 text-stone-500">{kw.meaning}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {otherMatches.length > 0 ? (
        <section className="mt-6 w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 text-lg font-semibold">Other Possible Matches</div>

          <div className="space-y-3">
            {otherMatches.map((entry, idx) => (
              <button
                key={`${entry.word}-${entry.reading}-${idx}`}
                type="button"
                onClick={async () => {
                  const nextMeaning = entry.meanings[0] ?? null;

                  setMainEntry(entry);
                  setSelectedMeaningIndex(0);
                  setErrorMsg(null);

                  setRepeatsInThisBook(0);
                  setTotalLookupCount(0);
                  setSeenInstances([]);
                  setKanjiStrokes([]);
                  setRelatedWords([]);

                  await loadBookAwareInfo(entry.word, nextMeaning);
                  await loadKanjiInfo(entry.word);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full rounded-xl border p-4 text-left hover:bg-stone-50"
              >
                <div className="font-medium text-stone-900">{entry.word}</div>
                <div className="mt-1 text-sm text-stone-500">{entry.reading || "—"}</div>
                <div className="mt-2 text-sm text-stone-700">{entry.meanings[0] || "—"}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => router.back()}
          className="rounded bg-gray-200 px-4 py-2"
        >
          ← Back
        </button>

        <button
          onClick={() => {
            setQuery("");
            setMainEntry(null);
            setOtherMatches([]);
            setSelectedMeaningIndex(0);
            setErrorMsg(null);
            setRepeatsInThisBook(0);
            setTotalLookupCount(0);
            setSeenInstances([]);
            setKanjiStrokes([]);
            setRelatedWords([]);
          }}
          className="rounded bg-gray-100 px-4 py-2"
        >
          Clear
        </button>
      </div>
    </main>
  );
}