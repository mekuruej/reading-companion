//Explore Book Word History
// 
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import VocabExplorePageHeader from "./components/VocabExplorePageHeader";
import VocabExploreBookCard from "./components/VocabExploreBookCard";
import VocabExploreSearchBar from "./components/VocabExploreSearchBar";
import VocabExploreFooterActions from "./components/VocabExploreFooterActions";
import DictionaryFallbackCard from "./components/DictionaryFallbackCard";
import OtherMatchesPanel from "./components/OtherMatchesPanel";
import WordHistorySummaryCard from "./components/WordHistorySummaryCard";
import SeenInstancesPanel from "./components/SeenInstancesPanel";
import RecurringWordsPanel from "./components/RecurringWordsPanel";

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
    } catch { }
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

  // The route/local state can provide a userBookId, but private queries and writes
  // should only use it after confirming it belongs to the logged-in user.
  const [authorizedUserBookId, setAuthorizedUserBookId] = useState("");

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
    let cancelled = false;

    async function loadAuthorizedBookInfo() {
      setAuthorizedUserBookId("");
      setBookTitle("");
      setBookCover(null);

      if (!userBookId) return;

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (!cancelled) {
            setErrorMsg("Please sign in to view this book vocabulary.");
          }
          return;
        }

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
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          if (!cancelled) {
            setErrorMsg("You do not have access to this book vocabulary.");
          }
          return;
        }

        if (cancelled) return;

        const b = (data as any)?.books;
        setAuthorizedUserBookId((data as any).id);
        setBookTitle(b?.title ?? "");
        setBookCover(b?.cover_url ?? null);
      } catch (error) {
        console.error("Could not load authorized book info:", error);

        if (!cancelled) {
          setErrorMsg("Could not load this book vocabulary.");
        }
      }
    }

    void loadAuthorizedBookInfo();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  useEffect(() => {
    if (!initialWord || !authorizedUserBookId) return;
    void runSearch(initialWord);
  }, [initialWord, authorizedUserBookId]);

  useEffect(() => {
    let cancelled = false;

    async function loadBookPatterns() {
      if (!authorizedUserBookId) {
        setBrowseLoading(false);
        setOftenLookedUp([]);
        return;
      }

      setBrowseLoading(true);

      try {
        const { data, error } = await supabase
          .from("user_book_words")
          .select("surface, reading, meaning, created_at")
          .eq("user_book_id", authorizedUserBookId)
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
  }, [authorizedUserBookId]);

  async function runSearch(raw?: string) {
    const q = (raw ?? query).trim();
    if (!q || !authorizedUserBookId) return;

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
        .eq("user_book_id", authorizedUserBookId)
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

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(q)}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
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
    router.replace(`/vocab/explore?userBookId=${encodeURIComponent(authorizedUserBookId)}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pb-10 pt-15">
      <VocabExplorePageHeader
        title="Word History in This Book"
        description="Search this book to see where a word appeared and how you saved it."
      />

      {bookTitle && authorizedUserBookId ? (
        <VocabExploreBookCard
          bookTitle={bookTitle}
          bookCover={bookCover}
          onOpenBookHub={() => router.push(`/books/${authorizedUserBookId}`)}
          onOpenVocabList={() => router.push(`/books/${authorizedUserBookId}/words`)}
        />
      ) : null}

      <VocabExploreSearchBar
        query={query}
        loading={loading}
        onQueryChange={setQuery}
        onSearch={() => runSearch(query)}
      />

      {errorMsg ? <p className="mb-4 text-sm text-red-600">{errorMsg}</p> : null}

      {shouldShowBrowse ? (
        <RecurringWordsPanel
          loading={browseLoading}
          items={oftenLookedUp}
          onSelectWord={(surface) =>
            router.push(
              `/vocab/explore?userBookId=${encodeURIComponent(
                authorizedUserBookId
              )}&word=${encodeURIComponent(surface)}`
            )
          }
        />
      ) : null}

      {surface ? (
        <>
          <WordHistorySummaryCard
            surface={surface}
            reading={reading}
            jlpt={jlpt}
            isCommon={isCommon}
            totalLookupCount={totalLookupCount}
            normalizeJlpt={normalizeJlpt}
          />

          <SeenInstancesPanel
            instances={seenInstances}
            getMeaningChoices={asStringArray}
            chapterDisplay={chapterDisplay}
          />
        </>
      ) : null}

      {notFoundEntry ? (
        <DictionaryFallbackCard entry={notFoundEntry} />
      ) : null}

      <OtherMatchesPanel matches={otherMatches} />

      <VocabExploreFooterActions
        onBack={() => router.back()}
        onClear={clearSearch}
      />
    </main>
  );
}
