//Curiosity Reading Page
//
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { KANJI_DATA } from "@/lib/kanjiData";

type QuickPreview = {
  id: string | null;
  surface: string;
  cacheSurface: string;
  reading: string;
  meanings: string[];
  selectedMeaningIndex: number;
  meaning: string;
  isCustomMeaning: boolean;
  useAlternateSurface: boolean;
  alternateSurface: string;
  page: string;
  chapterNumber: string;
  chapterName: string;
  pageOrder: number | null;
};

type QuickSessionWord = {
  id: string;
  surface: string;
  reading: string;
  meaning: string;
  page: string;
  chapterNumber: string;
  chapterName: string;
  meanings: string[];
  selectedMeaningIndex: number | null;
  isCustomMeaning: boolean;
  cacheSurface: string;
  useAlternateSurface: boolean;
  alternateSurface: string;
  hideKanjiInReadingSupport: boolean;
  pageOrder: number | null;
};

type KanjiEntry = {
  kanji: string;
  pieces: string[];
};

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toNullableInt(value: string): number | null {
  const t = (value ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function sameGroup(
  existing: QuickSessionWord,
  nextChapterNum: number | null,
  nextPageNum: number | null,
  nextChapterName: string
) {
  const oldChapterNum = toNullableInt(existing.chapterNumber);
  const oldPageNum = toNullableInt(existing.page);
  const oldChapterName = (existing.chapterName ?? "").trim();
  const newChapterName = (nextChapterName ?? "").trim();

  return (
    oldChapterNum === nextChapterNum &&
    oldPageNum === nextPageNum &&
    oldChapterName === newChapterName
  );
}

function sortQuickSessionWords(words: QuickSessionWord[]) {
  return [...words].sort((a, b) => {
    const aChapter = toNullableInt(a.chapterNumber) ?? Number.MAX_SAFE_INTEGER;
    const bChapter = toNullableInt(b.chapterNumber) ?? Number.MAX_SAFE_INTEGER;
    if (aChapter !== bChapter) return aChapter - bChapter;

    const aPage = toNullableInt(a.page) ?? Number.MAX_SAFE_INTEGER;
    const bPage = toNullableInt(b.page) ?? Number.MAX_SAFE_INTEGER;
    if (aPage !== bPage) return aPage - bPage;

    const aOrder = a.pageOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.pageOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;

    return a.surface.localeCompare(b.surface);
  });
}

export default function SingleAddPage() {
  const [userBookId, setUserBookId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");
  const [message, setMessage] = useState("");

  const [quickWord, setQuickWord] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [hideKanjiInReadingSupport, setHideKanjiInReadingSupport] = useState(false);

  const [quickPreview, setQuickPreview] = useState<QuickPreview | null>(null);
  const [quickSessionWords, setQuickSessionWords] = useState<QuickSessionWord[]>([]);

  const quickWordInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);

  const isEditingQuickWord = useMemo(() => !!quickPreview?.id, [quickPreview]);

  // Timer
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showTimedSessionForm, setShowTimedSessionForm] = useState(false);
  const [timerSaveMessage, setTimerSaveMessage] = useState("");
  const [sessionStartPage, setSessionStartPage] = useState("");
  const [sessionEndPage, setSessionEndPage] = useState("");

  const quickMetaStorageKey = `single-add-meta:${userBookId}`;

  const PIECE_NORMALIZATION: Record<string, string> = {
    氵: "水",
    扌: "手",
    亻: "人",
    忄: "心",
  };

  function normalizePiece(piece: string) {
    return PIECE_NORMALIZATION[piece] ?? piece;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("userBookId") || "";
    setUserBookId(id);
  }, []);

  useEffect(() => {
    if (!userBookId) return;

    (async () => {
      const { data: userBook, error: userBookError } = await supabase
        .from("user_books")
        .select("id, book_id")
        .eq("id", userBookId)
        .maybeSingle();

      if (userBookError) {
        setMessage(`❌ Could not load book info: ${userBookError.message}`);
        return;
      }

      if (!userBook) {
        setMessage("❌ No user_book found for this userBookId.");
        setBookTitle("");
        setBookCover("");
        return;
      }

      const { data: book, error: bookError } = await supabase
        .from("books")
        .select("title, cover_url")
        .eq("id", userBook.book_id)
        .maybeSingle();

      if (bookError) {
        setMessage(`❌ Could not load book details: ${bookError.message}`);
        return;
      }

      if (!book) {
        setMessage("❌ Book record not found.");
        setBookTitle("");
        setBookCover("");
        return;
      }

      setBookTitle(book.title ?? "");
      setBookCover(book.cover_url ?? "");
      setMessage("");
    })();
  }, [userBookId]);

  useEffect(() => {
    if (!quickPreview) return;

    saveQuickMeta({
      page: quickPreview.page,
      chapterNumber: quickPreview.chapterNumber,
      chapterName: quickPreview.chapterName,
    });
  }, [quickPreview?.page, quickPreview?.chapterNumber, quickPreview?.chapterName]);

  useEffect(() => {
    if (!quickPreview) return;
    if (quickPreview.id) return;

    const savedMeta = getSavedQuickMeta();

    setQuickPreview((prev) => {
      if (!prev) return prev;

      const shouldFillPage = !prev.page.trim();
      const shouldFillChapterNumber = !prev.chapterNumber.trim();
      const shouldFillChapterName = !prev.chapterName.trim();

      if (!shouldFillPage && !shouldFillChapterNumber && !shouldFillChapterName) {
        return prev;
      }

      return {
        ...prev,
        page: shouldFillPage ? savedMeta.page : prev.page,
        chapterNumber: shouldFillChapterNumber ? savedMeta.chapterNumber : prev.chapterNumber,
        chapterName: shouldFillChapterName ? savedMeta.chapterName : prev.chapterName,
      };
    });
  }, [quickPreview?.surface, userBookId]);

  useEffect(() => {
    quickWordInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  useEffect(() => {
    const shouldWarn = isRunning || isPaused;
    if (!shouldWarn) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning, isPaused]);

  function getSavedQuickMeta() {
    if (typeof window === "undefined") {
      return { page: "", chapterNumber: "", chapterName: "" };
    }

    try {
      const raw = window.localStorage.getItem(quickMetaStorageKey);
      if (!raw) {
        return { page: "", chapterNumber: "", chapterName: "" };
      }

      const parsed = JSON.parse(raw);
      return {
        page: typeof parsed.page === "string" ? parsed.page : "",
        chapterNumber: typeof parsed.chapterNumber === "string" ? parsed.chapterNumber : "",
        chapterName: typeof parsed.chapterName === "string" ? parsed.chapterName : "",
      };
    } catch {
      return { page: "", chapterNumber: "", chapterName: "" };
    }
  }

  function saveQuickMeta(meta: { page: string; chapterNumber: string; chapterName: string }) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(quickMetaStorageKey, JSON.stringify(meta));
    } catch {
      // ignore
    }
  }

  function clearQuickPreview() {
    setQuickPreview(null);
    setHideKanjiInReadingSupport(false);
    setQuickError(null);
  }

  async function getNextPageOrder(
    userBookIdValue: string,
    chapterNum: number | null,
    pageNum: number | null
  ) {
    let query = supabase
      .from("user_book_words")
      .select("page_order")
      .eq("user_book_id", userBookIdValue);

    if (chapterNum == null) query = query.is("chapter_number", null);
    else query = query.eq("chapter_number", chapterNum);

    if (pageNum == null) query = query.is("page_number", null);
    else query = query.eq("page_number", pageNum);

    const { data, error } = await query;
    if (error) throw error;

    const maxPageOrder = Math.max(
      0,
      ...((data ?? []).map((r: any) => Number(r.page_order) || 0))
    );

    return maxPageOrder + 1;
  }

  function loadQuickSessionWordIntoPreview(item: QuickSessionWord) {
    setQuickPreview({
      id: item.id,
      surface: item.surface,
      cacheSurface: item.cacheSurface,
      reading: item.reading,
      meanings: item.meanings,
      selectedMeaningIndex:
        item.selectedMeaningIndex == null ? 0 : item.selectedMeaningIndex,
      meaning: item.meaning,
      isCustomMeaning: item.isCustomMeaning,
      useAlternateSurface: item.useAlternateSurface,
      alternateSurface: item.alternateSurface,
      page: item.page,
      chapterNumber: item.chapterNumber,
      chapterName: item.chapterName,
      pageOrder: item.pageOrder,
    });
    setHideKanjiInReadingSupport(item.hideKanjiInReadingSupport);
    setQuickError(null);
    setMessage(`Editing "${item.surface}"`);
  }

  async function pullQuickWord() {
    const word = quickWord.trim();
    if (!word) return;

    setQuickLoading(true);
    setQuickError(null);

    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(word)}`);
      const json = await res.json();

      const first = json?.data?.[0];
      if (!first) {
        setQuickPreview(null);
        setQuickError("No result found.");
        return;
      }

      const surface = first?.japanese?.[0]?.word || first?.slug || word;
      const reading = first?.japanese?.[0]?.reading || "";
      const meanings = (first?.senses ?? [])
        .map((sense: any) => (sense.english_definitions ?? []).join("; "))
        .filter(Boolean);

      const savedMeta = getSavedQuickMeta();

      setQuickPreview({
        id: null,
        surface,
        cacheSurface: surface,
        reading,
        meanings: meanings.length ? meanings : [""],
        selectedMeaningIndex: 0,
        meaning: meanings.length ? meanings[0] : "",
        isCustomMeaning: false,
        useAlternateSurface: false,
        alternateSurface: "",
        page: savedMeta.page,
        chapterNumber: savedMeta.chapterNumber,
        chapterName: savedMeta.chapterName,
        pageOrder: null,
      });
    } catch (err) {
      console.error(err);
      setQuickPreview(null);
      setQuickError("Could not pull word data.");
    } finally {
      setQuickLoading(false);
    }
  }

  async function saveQuickWord() {
    if (!userBookId || !quickPreview) return;

    const selectedMeaning = quickPreview.meaning ?? "";
    const normalizedSurface = (
      quickPreview.useAlternateSurface ? quickPreview.alternateSurface : quickPreview.surface
    )?.trim() ?? "";
    const normalizedCacheSurface = quickPreview.cacheSurface?.trim() || normalizedSurface;
    const normalizedReading = quickPreview.reading?.trim() ?? "";
    const isManualEntry = quickPreview.isCustomMeaning && quickPreview.meanings.length === 0;

    const chapterNum = quickPreview.chapterNumber ? Number(quickPreview.chapterNumber) : null;
    const pageNum = quickPreview.page ? Number(quickPreview.page) : null;
    const chapterNameTrimmed = quickPreview.chapterName?.trim() || null;

    let vocabularyCacheId: number | null = null;

    if (normalizedCacheSurface && !isManualEntry) {
      const { data: existingCache, error: cacheLookupError } = await supabase
        .from("vocabulary_cache")
        .select("id")
        .eq("surface", normalizedCacheSurface)
        .eq("reading", normalizedReading || "")
        .maybeSingle();

      if (cacheLookupError) {
        console.error("Error looking up vocabulary cache:", cacheLookupError);
        setMessage(`❌ Could not save word: ${cacheLookupError.message}`);
        return;
      }

      if (existingCache?.id) {
        vocabularyCacheId = existingCache.id;
      } else {
        const { data: createdCache, error: cacheInsertError } = await supabase
          .from("vocabulary_cache")
          .insert({
            surface: normalizedCacheSurface,
            reading: normalizedReading || "",
          })
          .select("id")
          .single();

        if (cacheInsertError) {
          console.error("Error creating vocabulary cache row:", cacheInsertError);
          setMessage(`❌ Could not save word: ${cacheInsertError.message}`);
          return;
        }

        vocabularyCacheId = createdCache.id;

        await fetch("/api/vocabulary-kanji-map/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vocabulary_cache_id: createdCache.id }),
        });
      }
    }

    const editingExisting =
      quickPreview.id != null
        ? quickSessionWords.find((w) => w.id === quickPreview.id) ?? null
        : null;

    let pageOrderToUse: number | null;

    if (!editingExisting) {
      pageOrderToUse = await getNextPageOrder(userBookId, chapterNum, pageNum);
    } else if (sameGroup(editingExisting, chapterNum, pageNum, chapterNameTrimmed ?? "")) {
      pageOrderToUse = editingExisting.pageOrder;
    } else {
      pageOrderToUse = await getNextPageOrder(userBookId, chapterNum, pageNum);
    }

    const payload = {
      user_book_id: userBookId,
      vocabulary_cache_id: vocabularyCacheId,
      surface: normalizedSurface || null,
      reading: quickPreview.reading || null,
      meaning: selectedMeaning || null,
      meaning_choices: quickPreview.meanings,
      meaning_choice_index: quickPreview.isCustomMeaning
        ? null
        : quickPreview.selectedMeaningIndex,
      page_number: pageNum,
      page_order: pageOrderToUse,
      chapter_number: chapterNum,
      chapter_name: chapterNameTrimmed,
      hide_kanji_in_reading_support: hideKanjiInReadingSupport,
    };

    if (!editingExisting) {
      const { data, error } = await supabase
        .from("user_book_words")
        .insert(payload)
        .select(
          "id, surface, reading, meaning, meaning_choices, meaning_choice_index, page_number, page_order, chapter_number, chapter_name, hide_kanji_in_reading_support"
        )
        .single();

      if (error) {
        console.error("Error saving quick word:", error);
        setMessage(`❌ Could not save word: ${error.message}`);
        return;
      }

      const newItem: QuickSessionWord = {
        id: String(data.id),
        surface: data.surface ?? "",
        reading: data.reading ?? "",
        meaning: data.meaning ?? "",
        page: data.page_number != null ? String(data.page_number) : "",
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: data.meaning_choices ?? quickPreview.meanings,
        selectedMeaningIndex:
          data.meaning_choice_index == null ? null : Number(data.meaning_choice_index),
        isCustomMeaning: data.meaning_choice_index == null,
        cacheSurface: normalizedCacheSurface,
        useAlternateSurface: quickPreview.useAlternateSurface,
        alternateSurface: quickPreview.alternateSurface,
        hideKanjiInReadingSupport: !!data.hide_kanji_in_reading_support,
        pageOrder: data.page_order ?? null,
      };

      setQuickSessionWords((prev) => [newItem, ...prev]);
      setMessage("✅ Word saved to Vocab List.");
    } else {
      const { data, error } = await supabase
        .from("user_book_words")
        .update(payload)
        .eq("id", editingExisting.id)
        .eq("user_book_id", userBookId)
        .select(
          "id, surface, reading, meaning, meaning_choices, meaning_choice_index, page_number, page_order, chapter_number, chapter_name, hide_kanji_in_reading_support"
        )
        .single();

      if (error) {
        console.error("Error updating quick word:", error);
        setMessage(`❌ Could not update word: ${error.message}`);
        return;
      }

      const updatedItem: QuickSessionWord = {
        id: String(data.id),
        surface: data.surface ?? "",
        reading: data.reading ?? "",
        meaning: data.meaning ?? "",
        page: data.page_number != null ? String(data.page_number) : "",
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
        meanings: data.meaning_choices ?? quickPreview.meanings,
        selectedMeaningIndex:
          data.meaning_choice_index == null ? null : Number(data.meaning_choice_index),
        isCustomMeaning: data.meaning_choice_index == null,
        cacheSurface: normalizedCacheSurface,
        useAlternateSurface: quickPreview.useAlternateSurface,
        alternateSurface: quickPreview.alternateSurface,
        hideKanjiInReadingSupport: !!data.hide_kanji_in_reading_support,
        pageOrder: data.page_order ?? null,
      };

      setQuickSessionWords((prev) => [
        updatedItem,
        ...prev.filter((item) => item.id !== updatedItem.id),
      ]);
      setMessage("✅ Word updated.");
    }

    setQuickWord("");
    clearQuickPreview();
    quickWordInputRef.current?.focus();
  }

  async function deleteQuickWordById(id: string) {
    if (!userBookId) return;

    const { error } = await supabase
      .from("user_book_words")
      .delete()
      .eq("id", id)
      .eq("user_book_id", userBookId);

    if (error) {
      console.error("Error deleting quick word:", error);
      setMessage(`❌ Could not delete word: ${error.message}`);
      return;
    }

    setQuickSessionWords((prev) => prev.filter((item) => item.id !== id));

    if (quickPreview?.id === id) {
      clearQuickPreview();
    }

    setMessage("✅ Word deleted from Vocab List.");
  }

  async function saveReadingSession() {
    if (!userBookId) return;

    const start = Number(sessionStartPage);
    const end = Number(sessionEndPage);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const readOn = new Date().toISOString().slice(0, 10);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      setMessage("❌ Please fill in start page and end page.");
      return;
    }

    if (start <= 0 || end <= 0) {
      setMessage("❌ Pages must be greater than 0.");
      return;
    }

    if (end < start) {
      setMessage("❌ End page must be greater than or equal to start page.");
      return;
    }

    const { error } = await supabase.from("user_book_reading_sessions").insert({
      user_book_id: userBookId,
      read_on: readOn,
      start_page: start,
      end_page: end,
      minutes_read: minutes,
      session_mode: "curiosity",
    });

    if (error) {
      console.error("Error saving reading session:", error);
      setMessage(`❌ Could not save reading session: ${error.message}`);
      return;
    }

    const { error: updateError } = await supabase
      .from("user_books")
      .update({
        status: "reading",
        started_at: readOn,
        finished_at: null,
        dnf_at: null,
      })
      .eq("id", userBookId);

    if (updateError) {
      console.error("Error updating user_books after reading session:", updateError);
    }

    setTimerSaveMessage("Your curiosity session has been saved in the Reading Tab.");
    window.setTimeout(() => setTimerSaveMessage(""), 4000);

    setSessionStartPage("");
    setSessionEndPage("");
    setShowTimedSessionForm(false);
    setElapsed(0);
    setStartTime(null);
    setIsRunning(false);
    setIsPaused(false);
    setMessage("");
  }



  const filteredKanji = KANJI_DATA.filter((entry: KanjiEntry) => {
    if (selectedPieces.length === 0) return false;

    const normalizedSelected = selectedPieces.map(normalizePiece);
    const normalizedEntryPieces = entry.pieces.map(normalizePiece);

    return normalizedSelected.every((piece) =>
      normalizedEntryPieces.includes(piece)
    );
  });

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 rounded-2xl border border-stone-300 bg-stone-50 p-4">
          <div className="text-sm font-semibold text-stone-900">looker-upper</div>
          <div className="mt-1 text-sm text-stone-500">
            noun · official Mekuru book club term
          </div>
          <p className="mt-2 text-sm text-stone-700">
            A reader who cannot help stopping to look up words, grammar, and anything else they
            find interesting.
          </p>
        </div>

        <p className="mt-2 text-xs text-stone-500">
          If that is you, Curiosity Reading is your place!
        </p>

        <p className="mt-2 text-xs text-stone-500">
          Want to time your reading without look-ups?{" "}
          {userBookId ? (
            <a
              href={`/books/${userBookId}/readalong`}
              className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
            >
              Head to Fluid Reading
            </a>
          ) : (
            <span className="font-medium text-stone-500">Head to Fluid Reading</span>
          )}
        </p>

        <h1 className="mb-2 mt-4 text-2xl font-semibold">Curiosity Reading</h1>
        <p className="mt-2 text-sm text-stone-700">
          Use this for a slower, exploratory reading experience. Lookup time is included in the
          time.
        </p>

        {userBookId ? (
          bookTitle ? (
            <div className="mb-6 flex items-center gap-3">
              {bookCover ? (
                <img src={bookCover} alt="" className="h-16 w-12 rounded object-cover" />
              ) : null}

              <div>
                <p className="text-sm text-gray-700">
                  For book: <span className="font-medium">{bookTitle}</span>
                </p>
              </div>
            </div>
          ) : null
        ) : (
          <p className="mb-6 text-sm text-gray-500">
            Open with <code className="rounded bg-gray-100 px-1 py-0.5">?userBookId=...</code>
          </p>
        )}

        {message ? (
          <div className="mb-4">
            <p
              className={`text-base font-medium ${message.startsWith("❌") ? "text-red-700" : "text-green-700"
                }`}
            >
              {message}
            </p>
          </div>
        ) : null}

        <div className="mb-6 rounded-2xl border border-stone-300 bg-white p-4">
          <div className="mb-2 text-sm font-medium text-stone-900">Log your reading session</div>
          <p className="text-sm text-stone-500">
            Use the timer while you read, add vocab, and save your curiosity reading session to the
            Reading tab.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
            {!isRunning && !isPaused ? (
              <button
                type="button"
                onClick={() => {
                  setStartTime(Date.now());
                  setElapsed(0);
                  setIsRunning(true);
                  setIsPaused(false);
                }}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-base font-medium text-white transition hover:bg-emerald-700"
              >
                Start Timer
              </button>
            ) : null}

            {isRunning ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (startTime) {
                      setElapsed(Math.floor((Date.now() - startTime) / 1000));
                    }
                    setIsRunning(false);
                    setIsPaused(true);
                  }}
                  className="rounded-2xl bg-amber-500 px-5 py-3 text-base font-medium text-white transition hover:bg-amber-600"
                >
                  Pause
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (startTime) {
                      setElapsed(Math.floor((Date.now() - startTime) / 1000));
                    }
                    setIsRunning(false);
                    setIsPaused(false);
                    setShowTimedSessionForm(true);
                  }}
                  className="rounded-2xl bg-red-600 px-5 py-3 text-base font-medium text-white transition hover:bg-red-700"
                >
                  Finish
                </button>
              </>
            ) : null}

            {isPaused ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStartTime(Date.now() - elapsed * 1000);
                    setIsRunning(true);
                    setIsPaused(false);
                  }}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-base font-medium text-white transition hover:bg-emerald-700"
                >
                  Resume
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPaused(false);
                    setShowTimedSessionForm(true);
                  }}
                  className="rounded-2xl bg-red-600 px-5 py-3 text-base font-medium text-white transition hover:bg-red-700"
                >
                  Finish
                </button>
              </>
            ) : null}

            <div className="flex items-center rounded-2xl border border-stone-300 bg-white px-5 py-3 text-base font-medium text-stone-700">
              ⏱ {formatTimer(elapsed)}
            </div>
          </div>

          {showTimedSessionForm && !isRunning ? (
            <div className="mt-4 rounded-2xl border border-stone-300 bg-stone-50 p-4">
              <div className="mb-3 text-sm font-medium text-stone-700">
                Save this reading session
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm text-stone-600">Start page</div>
                  <input
                    type="number"
                    min={1}
                    value={sessionStartPage}
                    onChange={(e) => setSessionStartPage(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <div className="mb-1 text-sm text-stone-600">End page</div>
                  <input
                    type="number"
                    min={1}
                    value={sessionEndPage}
                    onChange={(e) => setSessionEndPage(e.target.value)}
                    placeholder="e.g. 52"
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 text-sm text-stone-500">Time: {formatTimer(elapsed)}</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveReadingSession()}
                  className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                >
                  Save Timed Session
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowTimedSessionForm(false);
                    setElapsed(0);
                    setStartTime(null);
                    setIsPaused(false);
                    setIsRunning(false);
                  }}
                  className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {isRunning || isPaused ? (
            <p className="mt-2 text-xs text-amber-600">
              Timer is active. If you leave or refresh the page, you may lose your session.
            </p>
          ) : null}

          {timerSaveMessage ? (
            <p className="mt-2 text-xs text-emerald-600">{timerSaveMessage}</p>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-stone-300 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-stone-900">Single Add</div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={quickWordInputRef}
              type="text"
              value={quickWord}
              onChange={(e) => setQuickWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void pullQuickWord();
                }
              }}
              placeholder="Search a word..."
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />

            <button
              type="button"
              onClick={() => void pullQuickWord()}
              disabled={quickLoading || !quickWord.trim()}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {quickLoading ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              onClick={() => {
                const savedMeta = getSavedQuickMeta();

                setQuickPreview({
                  id: null,
                  surface: quickWord.trim(),
                  cacheSurface: "",
                  reading: "",
                  meanings: [],
                  selectedMeaningIndex: 0,
                  meaning: "",
                  isCustomMeaning: true,
                  useAlternateSurface: false,
                  alternateSurface: "",
                  page: savedMeta.page,
                  chapterNumber: savedMeta.chapterNumber,
                  chapterName: savedMeta.chapterName,
                  pageOrder: null,
                });
                setQuickError(null);
              }}
              className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
            >
              Manual Entry
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="cursor-not-allowed rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-stone-400 select-none"
              >
                Grammar
              </button>

              <span className="select-none text-sm text-stone-400">(coming soon...)</span>
            </div>
          </div>

          {quickError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {quickError}
            </div>
          ) : null}

          {quickPreview ? (
            <div className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm font-medium text-stone-700">Word</div>
                  <input
                    value={quickPreview.surface}
                    onChange={(e) =>
                      setQuickPreview((prev) => (prev ? { ...prev, surface: e.target.value } : prev))
                    }
                    placeholder="Word"
                    className="w-full rounded border px-3 py-2 text-sm"
                  />

                  <label className="mt-2 flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={quickPreview.useAlternateSurface}
                      onChange={(e) =>
                        setQuickPreview((prev) =>
                          prev ? { ...prev, useAlternateSurface: e.target.checked } : prev
                        )
                      }
                    />
                    <span>Alternate kanji (in this book)</span>
                  </label>

                  {quickPreview.useAlternateSurface ? (
                    <input
                      value={quickPreview.alternateSurface}
                      onChange={(e) =>
                        setQuickPreview((prev) =>
                          prev ? { ...prev, alternateSurface: e.target.value } : prev
                        )
                      }
                      placeholder="Book form (e.g. 愉しい)"
                      className="mt-2 w-full rounded border px-3 py-2 text-sm"
                    />
                  ) : null}
                </div>

                <div>
                  <div className="mb-1 text-sm font-medium text-stone-700">Reading</div>
                  <input
                    value={quickPreview.reading}
                    onChange={(e) =>
                      setQuickPreview((prev) => (prev ? { ...prev, reading: e.target.value } : prev))
                    }
                    placeholder="Reading"
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-stone-700">Meaning</div>

                <div className="space-y-2">
                  {quickPreview.meanings.length > 0 ? (
                    quickPreview.meanings.map((meaning, index) => (
                      <label key={index} className="flex items-start gap-2 text-sm text-stone-700">
                        <input
                          type="radio"
                          checked={
                            !quickPreview.isCustomMeaning &&
                            quickPreview.selectedMeaningIndex === index
                          }
                          onChange={() =>
                            setQuickPreview((prev) =>
                              prev
                                ? {
                                  ...prev,
                                  selectedMeaningIndex: index,
                                  meaning,
                                  isCustomMeaning: false,
                                }
                                : prev
                            )
                          }
                        />
                        <span>{meaning || "—"}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-stone-500">
                      No dictionary meanings loaded. Enter your own meaning below.
                    </p>
                  )}

                  <textarea
                    value={quickPreview.isCustomMeaning ? quickPreview.meaning : ""}
                    onChange={(e) =>
                      setQuickPreview((prev) =>
                        prev ? { ...prev, meaning: e.target.value, isCustomMeaning: true } : prev
                      )
                    }
                    placeholder="Type your meaning"
                    className="min-h-[80px] w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={quickPreview.page}
                  onChange={(e) =>
                    setQuickPreview((prev) => (prev ? { ...prev, page: e.target.value } : prev))
                  }
                  placeholder="Page"
                  className="rounded border px-3 py-2 text-sm"
                />

                <input
                  value={quickPreview.chapterNumber}
                  onChange={(e) =>
                    setQuickPreview((prev) =>
                      prev ? { ...prev, chapterNumber: e.target.value } : prev
                    )
                  }
                  placeholder="Chapter #"
                  className="rounded border px-3 py-2 text-sm"
                />

                <input
                  value={quickPreview.chapterName}
                  onChange={(e) =>
                    setQuickPreview((prev) =>
                      prev ? { ...prev, chapterName: e.target.value } : prev
                    )
                  }
                  placeholder="Chapter name"
                  className="rounded border px-3 py-2 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={hideKanjiInReadingSupport}
                  onChange={(e) => setHideKanjiInReadingSupport(e.target.checked)}
                />
                <span>Hide kanji in reading support</span>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveQuickWord()}
                  className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  {isEditingQuickWord ? "Update Word" : "Save to Vocab List"}
                </button>

                <button
                  type="button"
                  onClick={() => clearQuickPreview()}
                  className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                >
                  {isEditingQuickWord ? "Cancel Edit" : "Cancel"}
                </button>
              </div>
            </div>
          ) : null}
          {quickSessionWords.length > 0 ? (
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-3 text-sm font-medium text-stone-900">
                Words saved into Vocab List this session
              </div>

              <div className="space-y-3">
                {quickSessionWords.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 text-sm">
                        <div className="font-medium text-stone-900">{item.surface}</div>
                        <div className="text-stone-500">{item.reading || "—"}</div>
                        <div className="mt-1 text-stone-700">{item.meaning || "—"}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          Page {item.page || "—"} · Ch {item.chapterNumber || "—"} ·{" "}
                          {item.chapterName || "—"}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => loadQuickSessionWordIntoPreview(item)}
                          className="rounded bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteQuickWordById(item.id)}
                          className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main >
  );
}