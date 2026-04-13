//Book Hub Word History Search Page
// 

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
type DictionaryEntry = {
  word: string;
  reading: string;
  meanings: string[];
  jlpt: string | null;
  isCommon: boolean | null;
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------
export default function WordHistorySearchPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [userBookId, setUserBookId] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState<string | null>(null);

  const [notFoundEntry, setNotFoundEntry] = useState<DictionaryEntry | null>(null);
  const [otherMatches, setOtherMatches] = useState<DictionaryEntry[]>([]);

  // -------------------------------------------------------------
  // Pull userBookId from URL
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setUserBookId(params.get("userBookId") || "");
  }, []);

  // -------------------------------------------------------------
  // Load optional book info
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
    setNotFoundEntry(null);
    setOtherMatches([]);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        throw new Error("You need to sign in to search your word history.");
      }

      // 1) Search saved library first
      const { data: savedRows, error: savedError } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          user_book_id,
          surface,
          user_books!inner (
            user_id
          )
        `
        )
        .eq("surface", q)
        .eq("user_books.user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (savedError) throw savedError;

      if (savedRows && savedRows.length > 0) {
        router.push(
          `/vocab/history?word=${encodeURIComponent(q)}${userBookId ? `&userBookId=${encodeURIComponent(userBookId)}` : ""
          }`
        );
        return;
      }

      // 2) If not found in saved history, show lightweight dictionary fallback
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
    setNotFoundEntry(null);
    setOtherMatches([]);
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 pb-10 pt-30">
      <h1 className="mb-1 text-2xl font-semibold">Word History</h1>
      <p className="mb-4 text-sm text-stone-500">
        {userBookId
          ? "Search to see how a word was used in this book and across your library."
          : "Search your library to see where a word appeared and how it was used."}
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
              Search this word in the context of your saved reading history.
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

      {notFoundEntry ? (
        <section className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 text-lg font-semibold">Not found in your reading history</div>

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

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {normalizeJlpt(notFoundEntry.jlpt) !== "NON-JLPT" ? (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[17px] font-medium leading-none text-gray-800">
                  {normalizeJlpt(notFoundEntry.jlpt)}
                </span>
              ) : null}

              {notFoundEntry.isCommon ? (
                <span className="text-gray-500">Common</span>
              ) : null}
            </div>

            <p className="text-sm text-stone-500">
              You haven’t saved this word in your reading yet.
            </p>
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
        <button
          onClick={() => router.back()}
          className="rounded bg-gray-200 px-4 py-2"
        >
          ← Back
        </button>

        <button
          onClick={clearSearch}
          className="rounded bg-gray-100 px-4 py-2"
        >
          Clear
        </button>
      </div>
    </main>
  );
}