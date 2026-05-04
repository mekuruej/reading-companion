// Global Search Page
// 

"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { WordCard } from "@/components/WordCard";
import {
  computeLibraryStudyColorStatus,
  type LibraryStudyColor,
  type LibraryStudyColorStatus,
} from "@/lib/libraryStudyColor";

// BASE defaults — things not in the DB yet
const DEFAULT_SETTINGS = {
  learning_profile: "Advanced",
  jlpt_level: "N1",
  color_system: "rainbow",
  include_green: true,
  include_blue: true,
  include_grey: true,
  include_purple: true,
  // we’ll override these from DB if they exist:
  red_stages: 1,
  orange_stages: 1,
  yellow_stages: 1,
  show_badge_numbers: true,
};

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
type LearningSettingsRow = {
  user_id: string;
  learning_profile: "Beginner" | "Intermediate" | "Advanced" | "Custom";
  red_stages: number;
  orange_stages: number;
  yellow_stages: number;
  show_badge_numbers: boolean;
  color_system: string;
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function normalizeJlpt(value: string | null | undefined): string {
  if (!value) return "NON-JLPT";
  const lower = String(value).toLowerCase();
  if (lower.startsWith("n1")) return "N1";
  if (lower.startsWith("n2")) return "N2";
  if (lower.startsWith("n3")) return "N3";
  if (lower.startsWith("n4")) return "N4";
  if (lower.startsWith("n5")) return "N5";
  return "NON-JLPT";
}

function badgeColorClass(color: LibraryStudyColor) {
  if (color === "red") return "border-red-800 bg-red-600 text-white";
  if (color === "orange") return "border-orange-700 bg-orange-400 text-stone-950";
  if (color === "yellow") return "border-yellow-500 bg-yellow-300 text-stone-900";
  if (color === "green") return "border-green-800 bg-green-600 text-white";
  if (color === "blue") return "border-blue-800 bg-blue-600 text-white";
  if (color === "purple") return "border-purple-800 bg-purple-600 text-white";
  if (color === "grey") return "border-slate-700 bg-slate-500 text-white";
  return "border-stone-400 bg-stone-300 text-stone-700";
}

function colorLabel(color: LibraryStudyColor) {
  if (color === "none") return "No color yet";
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function LibraryStudyStatusBadge({
  status,
  showNumbers,
  encounterCount,
  days,
}: {
  status: LibraryStudyColorStatus;
  showNumbers: boolean;
  encounterCount: number;
  days: number;
}) {
  const showStageNumber =
    showNumbers &&
    status.stageNumber != null &&
    status.stageCount != null &&
    status.stageCount > 1;

  const title = [
    `${colorLabel(status.color)}${showStageNumber ? ` ${status.stageNumber}` : ""}`,
    status.reason,
    `${encounterCount} encounter${encounterCount === 1 ? "" : "s"} in this book`,
    days ? `${days} day${days === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold shadow-sm ${badgeColorClass(
        status.color
      )} ${showStageNumber ? "h-6 min-w-6 px-1.5" : "h-4 w-4"}`}
    >
      {showStageNumber ? status.stageNumber : ""}
    </span>
  );
}

// -------------------------------------------------------------
// Component
// -------------------------------------------------------------
export default function VocabPageContent() {
  const searchParams = useSearchParams();
  const preselectedBook = searchParams.get("bookId") || "";

  const [books, setBooks] = useState<any[]>([]);
  const [bookId, setBookId] = useState(preselectedBook);

  // resolve userBookId (user_books.id) for per-book lookup stats
  const [userBookId, setUserBookId] = useState<string>("");

  const [entries, setEntries] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  // per-book lookup stats from user_book_words
  const [bookLookupMap, setBookLookupMap] = useState<Record<string, { count: number; days: number }>>({});

  // ------------------ JISHO PREVIEW STATE ---------------------
  const [lookupWord, setLookupWord] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const [previewReading, setPreviewReading] = useState("");
  const [previewMeaning, setPreviewMeaning] = useState("");
  const [previewJlpt, setPreviewJlpt] = useState("NON-JLPT");
  const [previewIsCommon, setPreviewIsCommon] = useState(false);

  const [previewPage, setPreviewPage] = useState("");
  const [previewChapter, setPreviewChapter] = useState("");
  const [isSavingPreview, setIsSavingPreview] = useState(false);

  // ------------------ QUICK ADD STATE (no Jisho) --------------
  const [newWord, setNewWord] = useState("");
  const [newReading, setNewReading] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  // ------------------ LEARNING SETTINGS FROM DB ---------------
  const [learningSettings, setLearningSettings] = useState<LearningSettingsRow | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // -------------------------------------------------------------
  // Load user’s books
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadBooks() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("books")
        .select("id, title, started_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading books:", error);
        return;
      }

      setBooks(data || []);
    }

    loadBooks();
  }, []);

  const currentBook = books.find((b) => b.id === bookId);

  // -------------------------------------------------------------
  // Resolve userBookId (user_books.id) from selected books.id
  // -------------------------------------------------------------
  useEffect(() => {
    async function resolveUserBook() {
      setUserBookId("");
      setBookLookupMap({});

      if (!bookId) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_books")
        .select("id")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .maybeSingle();

      if (error) {
        console.error("Error resolving user_books:", error);
        return;
      }

      if (data?.id) setUserBookId(data.id);
    }

    resolveUserBook();
  }, [bookId]);

  // -------------------------------------------------------------
  // Load learning settings (same table as /profile/settings)
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadSettings() {
      setSettingsLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user for settings:", userError);
        setLearningSettings(null);
        setSettingsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_learning_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(); // ✅ ok if no row

      if (error) {
        console.error("Error loading learning settings:", {
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
          raw: error,
        });
        setLearningSettings(null);
        setSettingsLoading(false);
        return;
      }

      setLearningSettings((data as any) || null);
      setSettingsLoading(false);
    }

    loadSettings();
  }, []);

  // -------------------------------------------------------------
  // Reload vocab entries (dictionary + user_vocab_states + book_vocab)
  // + per-book lookup counts from user_book_words
  // -------------------------------------------------------------
  async function reloadEntries() {
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error getting user:", userError);
      setMessage("Error getting user.");
      return;
    }

    if (!user || !bookId) {
      setEntries([]);
      setBookLookupMap({});
      return;
    }

    const { data, error } = await supabase
      .from("dictionary_entries")
      .select(
        `
        id,
        orthography,
        reading,
        meaning,
        jlpt,
        is_common,
        is_katakana,
        strokes,

        book_vocab:book_vocab!book_vocab_word_id_fkey (
          book_id
        ),

        user_vocab_states:user_vocab_states!user_vocab_states_word_id_fkey (
          id,
          user_id,
          lookup_count,
          reading_stage,
          meaning_stage,
          forgot_reading,
          forgot_meaning,
          updated_at
        )
      `
      )
      .eq("book_vocab.book_id", bookId)
      .order("orthography", { ascending: true });

    if (error) {
      console.error("Error loading vocab entries:", error.message, error.details, error.hint);
      setMessage("Error loading vocabulary.");
      setEntries([]);
      return;
    }

    setEntries(data || []);

    // per-book lookup counts (from user_book_words)
    if (!userBookId) {
      setBookLookupMap({});
      return;
    }

    const { data: stats, error: statsErr } = await supabase
      .from("user_book_words")
      .select("surface, seen_on")
      .eq("user_book_id", userBookId);

    if (statsErr) {
      console.error("Error loading user_book_words stats:", statsErr);
      setBookLookupMap({});
      return;
    }

    const tmp: Record<string, { count: number; daysSet: Set<string> }> = {};

    for (const row of stats ?? []) {
      const key = String((row as any).surface ?? "").trim();
      if (!key) continue;

      if (!tmp[key]) tmp[key] = { count: 0, daysSet: new Set() };
      tmp[key].count += 1;

      const d = (row as any).seen_on;
      if (d) tmp[key].daysSet.add(String(d));
    }

    const finalMap: Record<string, { count: number; days: number }> = {};
    for (const [k, v] of Object.entries(tmp)) {
      finalMap[k] = { count: v.count, days: v.daysSet.size };
    }

    setBookLookupMap(finalMap);
  }

  // -------------------------------------------------------------
  // Local-only: toggle reading known (green/blue/grey helper)
  // -------------------------------------------------------------
  function toggleReadingKnown(entryId: string, existingState: any) {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;

        const currentState =
          existingState ||
          entry.user_vocab_states?.[0] || {
            id: null,
            user_id: null,
            lookup_count: 0,
            reading_stage: "learning",
            meaning_stage: "learning",
            forgot_reading: false,
            forgot_meaning: false,
            updated_at: "",
          };

        const newStage = currentState.reading_stage === "known" ? "learning" : "known";

        const newState = {
          ...currentState,
          reading_stage: newStage,
        };

        return {
          ...entry,
          user_vocab_states: [newState],
        };
      })
    );
  }

  // -------------------------------------------------------------
  // Local-only: increment lookup count (+ button)
  // -------------------------------------------------------------
  function incrementLookup(entryId: string, existingState: any) {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;

        const currentState =
          existingState ||
          entry.user_vocab_states?.[0] || {
            id: null,
            user_id: null,
            lookup_count: 0,
            reading_stage: "learning",
            meaning_stage: "learning",
            forgot_reading: false,
            forgot_meaning: false,
            updated_at: "",
          };

        const newState = {
          ...currentState,
          lookup_count: (currentState.lookup_count || 0) + 1,
        };

        return {
          ...entry,
          user_vocab_states: [newState],
        };
      })
    );
  }

  // -------------------------------------------------------------
  // JISHO: Fetch Preview
  // -------------------------------------------------------------
  async function handleFetchPreview(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!bookId) {
      setMessage("Please select a book first.");
      return;
    }

    const word = lookupWord.trim();
    if (!word) {
      setMessage("Please enter a word to look up.");
      return;
    }

    setPreviewLoading(true);
    setPreviewVisible(false);

    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(word)}`);

      if (!res.ok) {
        console.error("Jisho error:", res.status);
        setMessage("Error fetching info from Jisho.");
        return;
      }

      const data = await res.json();
      const entry = data?.data?.[0];

      if (!entry) {
        setMessage("No result found on Jisho.");
        return;
      }

      const reading = entry.japanese?.[0]?.reading || "";
      const meanings = entry.senses?.[0]?.english_definitions || [];
      const jlptRaw = entry.jlpt?.[0] || "";
      const isCommon = !!entry.is_common;

      setPreviewReading(reading);
      setPreviewMeaning(meanings.join(", "));
      setPreviewJlpt(normalizeJlpt(jlptRaw));
      setPreviewIsCommon(isCommon);

      setPreviewVisible(true);
    } catch (err) {
      console.error("Error fetching from /api/jisho:", err);
      setMessage("Error fetching info from Jisho.");
    } finally {
      setPreviewLoading(false);
    }
  }

  // -------------------------------------------------------------
  // JISHO: Save from Preview into old schema
  // -------------------------------------------------------------
  async function handleSaveFromPreview() {
    setMessage("");

    if (!bookId) {
      setMessage("Please select a book first.");
      return;
    }

    const word = lookupWord.trim();
    if (!word) {
      setMessage("Please enter a word.");
      return;
    }

    setIsSavingPreview(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      setMessage("Please sign in again.");
      setIsSavingPreview(false);
      return;
    }

    try {
      const baseWord = word;
      const baseReading = previewReading.trim() || null;

      // 1) Check if dictionary entry already exists (same word + reading)
      const { data: existingRows, error: existingError } = await supabase
        .from("dictionary_entries")
        .select("id")
        .eq("orthography", baseWord)
        .eq("reading", baseReading)
        .limit(1);

      if (existingError) {
        console.error("Error checking existing dictionary entry:", existingError);
        setMessage("Error checking existing entries.");
        return;
      }

      let dictId: string;

      if (existingRows && existingRows.length > 0) {
        dictId = existingRows[0].id;
      } else {
        const meaningArray = previewMeaning
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        const { data: dictInsert, error: dictError } = await supabase
          .from("dictionary_entries")
          .insert({
            orthography: baseWord,
            reading: baseReading,
            meaning: meaningArray.length > 0 ? meaningArray : null,
            jlpt: previewJlpt === "NON-JLPT" ? null : previewJlpt,
            is_common: previewIsCommon,
            is_katakana: false,
            strokes: null,
          })
          .select("id")
          .single();

        if (dictError || !dictInsert) {
          console.error("Error inserting dictionary entry:", dictError);
          setMessage("Error adding word.");
          return;
        }

        dictId = dictInsert.id;
      }

      // 2) Ensure book_vocab row (link word to this book)
      const pageNumberVal = previewPage ? Number(previewPage) : null;
      const chapterVal =
        previewChapter && !Number.isNaN(Number(previewChapter)) ? Number(previewChapter) : null;

      const { error: bookVocabError } = await supabase.from("book_vocab").insert({
        book_id: bookId,
        word_id: dictId,
        chapter: chapterVal,
        page_number: pageNumberVal,
      });

      if (bookVocabError) {
        if ((bookVocabError as any).code === "23505") {
          console.warn("Book_vocab already linked; continuing.");
        } else {
          console.error("Error inserting book_vocab:", bookVocabError);
          setMessage("Word created, but error linking to book.");
          return;
        }
      }

      // 3) Ensure user_vocab_states row
      const { data: existingStateRows, error: existingStateError } = await supabase
        .from("user_vocab_states")
        .select("id, lookup_count")
        .eq("user_id", user.id)
        .eq("word_id", dictId)
        .limit(1);

      if (existingStateError) {
        console.error("Error checking user_vocab_states:", existingStateError);
        setMessage("Error saving your progress.");
        return;
      }

      if (!existingStateRows || existingStateRows.length === 0) {
        const { error: stateError } = await supabase.from("user_vocab_states").insert({
          user_id: user.id,
          word_id: dictId,
          dictionary_entry_id: dictId,
          lookup_count: 1,
          reading_stage: "learning",
          meaning_stage: "learning",
          forgot_reading: false,
          forgot_meaning: false,
        });

        if (stateError) {
          console.error("Error inserting user_vocab_states:", stateError);
          setMessage("Word added, but error saving your progress.");
        } else {
          setMessage("✅ Word added.");
        }
      } else {
        setMessage("✅ Word linked to this book.");
      }

      setPreviewVisible(false);
      setPreviewPage("");
      setPreviewChapter("");

      reloadEntries();
    } finally {
      setIsSavingPreview(false);
    }
  }

  // -------------------------------------------------------------
  // QUICK ADD (no Jisho, just manual)
  // -------------------------------------------------------------
  async function handleAddWordQuick(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!bookId) {
      setMessage("Please select a book first.");
      return;
    }

    const word = newWord.trim();
    if (!word) {
      setMessage("Please enter a word.");
      return;
    }

    setIsSavingQuick(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      setMessage("Please sign in again.");
      setIsSavingQuick(false);
      return;
    }

    try {
      const baseWord = word;
      const baseReading = newReading.trim() || null;

      // 1) Check if dictionary entry exists
      const { data: existingRows, error: existingError } = await supabase
        .from("dictionary_entries")
        .select("id")
        .eq("orthography", baseWord)
        .eq("reading", baseReading)
        .limit(1);

      if (existingError) {
        console.error("Error checking existing dictionary entry:", existingError);
        setMessage("Error checking existing entries.");
        return;
      }

      let dictId: string;

      if (existingRows && existingRows.length > 0) {
        dictId = existingRows[0].id;
      } else {
        const meaningArray = newMeaning
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        const { data: dictInsert, error: dictError } = await supabase
          .from("dictionary_entries")
          .insert({
            orthography: baseWord,
            reading: baseReading,
            meaning: meaningArray.length > 0 ? meaningArray : null,
            jlpt: null,
            is_common: null,
            is_katakana: false,
            strokes: null,
          })
          .select("id")
          .single();

        if (dictError || !dictInsert) {
          console.error("Error inserting dictionary entry (quick):", dictError);
          setMessage("Error adding word.");
          return;
        }

        dictId = dictInsert.id;
      }

      // 2) Link to this book
      const { error: bookVocabError } = await supabase.from("book_vocab").insert({
        book_id: bookId,
        word_id: dictId,
        chapter: null,
        page_number: null,
      });

      if (bookVocabError) {
        if ((bookVocabError as any).code === "23505") {
          console.warn("Book_vocab already linked (quick); continuing.");
        } else {
          console.error("Error inserting book_vocab (quick):", bookVocabError);
          setMessage("Word created, but error linking to book.");
          return;
        }
      }

      // 3) Ensure user_vocab_state
      const { data: existingStateRows, error: existingStateError } = await supabase
        .from("user_vocab_states")
        .select("id, lookup_count")
        .eq("user_id", user.id)
        .eq("word_id", dictId)
        .limit(1);

      if (existingStateError) {
        console.error("Error checking user_vocab_states (quick):", existingStateError);
        setMessage("Error saving your progress.");
        return;
      }

      if (!existingStateRows || existingStateRows.length === 0) {
        const { error: stateError } = await supabase.from("user_vocab_states").insert({
          user_id: user.id,
          word_id: dictId,
          dictionary_entry_id: dictId,
          lookup_count: 1,
          reading_stage: "learning",
          meaning_stage: "learning",
          forgot_reading: false,
          forgot_meaning: false,
        });

        if (stateError) {
          console.error("Error inserting user_vocab_states (quick):", stateError);
          setMessage("Word added, but error saving your progress.");
        } else {
          setMessage("✅ Word added (quick).");
        }
      } else {
        setMessage("✅ Word linked to this book (quick).");
      }

      setNewWord("");
      setNewReading("");
      setNewMeaning("");

      reloadEntries();
    } finally {
      setIsSavingQuick(false);
    }
  }

  // -------------------------------------------------------------
  // Load entries when book changes (or first render)
  // -------------------------------------------------------------
  useEffect(() => {
    reloadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, userBookId]);

  // -------------------------------------------------------------
  // UI
  // -------------------------------------------------------------
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...(learningSettings || {}),
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">📘 Vocabulary</h1>

      {/* Book Selector */}
      <div className="mb-2">
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">Select a book…</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      {!settingsLoading && learningSettings && (
        <p className="text-xs text-gray-500 mb-3">
          Profile: {learningSettings.learning_profile} · Red/Orange/Yellow stages:{" "}
          {learningSettings.red_stages}/{learningSettings.orange_stages}/{learningSettings.yellow_stages}
        </p>
      )}

      {/* JISHO ADD FORM */}
      <form onSubmit={handleFetchPreview} className="flex flex-col gap-2 mb-4 border rounded p-4 bg-white">
        <h2 className="text-sm font-semibold mb-1">
          Add with Jisho (Preview → Save)
          {currentBook ? ` — “${currentBook.title}”` : ""}
        </h2>

        <input
          type="text"
          placeholder="Word to look up"
          value={lookupWord}
          onChange={(e) => setLookupWord(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          type="submit"
          disabled={previewLoading || !bookId}
          className={`mt-1 px-4 py-2 rounded text-white ${
            !bookId || previewLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {bookId ? (previewLoading ? "Fetching…" : "Fetch from Jisho 🔍") : "Select a book first"}
        </button>
      </form>

      {/* JISHO PREVIEW BOX */}
      {previewVisible && (
        <div className="border p-4 rounded bg-gray-50 mb-6">
          <h3 className="font-semibold text-lg mb-2">Preview</h3>

          <p className="text-xl font-bold">
            {lookupWord}
            {previewReading && <span className="text-lg font-normal text-gray-600"> （{previewReading}）</span>}
          </p>

          <input
            className="border p-2 rounded w-full mt-2 text-sm"
            placeholder="Reading"
            value={previewReading}
            onChange={(e) => setPreviewReading(e.target.value)}
          />

          <textarea
            className="border p-2 rounded w-full mt-2 text-sm"
            placeholder="Meaning(s), separated by commas"
            rows={3}
            value={previewMeaning}
            onChange={(e) => setPreviewMeaning(e.target.value)}
          />

          <div className="flex flex-wrap gap-2 mt-2 text-xs items-center">
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">JLPT: {previewJlpt}</span>

            <button
              type="button"
              onClick={() => setPreviewIsCommon((c) => !c)}
              className={`px-2 py-1 rounded border ${
                previewIsCommon
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-gray-100 text-gray-700 border-gray-300"
              }`}
            >
              {previewIsCommon ? "Common" : "Rare"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <input
              type="number"
              className="border p-2 rounded"
              placeholder="Page (optional)"
              value={previewPage}
              onChange={(e) => setPreviewPage(e.target.value)}
            />
            <input
              type="text"
              className="border p-2 rounded"
              placeholder="Chapter (number)"
              value={previewChapter}
              onChange={(e) => setPreviewChapter(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setPreviewVisible(false)} className="px-3 py-1 border rounded text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveFromPreview}
              disabled={isSavingPreview}
              className={`px-3 py-1 rounded text-sm text-white ${
                isSavingPreview ? "bg-amber-300 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {isSavingPreview ? "Saving…" : "Save word"}
            </button>
          </div>
        </div>
      )}

      {/* QUICK ADD (no Jisho) */}
      <form onSubmit={handleAddWordQuick} className="flex flex-col gap-2 mb-6 border rounded p-4 bg-white">
        <h2 className="text-sm font-semibold mb-1">
          Quick Add (no Jisho)
          {currentBook ? ` — “${currentBook.title}”` : ""}
        </h2>

        <input
          type="text"
          placeholder="Word"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Reading (optional)"
          value={newReading}
          onChange={(e) => setNewReading(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Meaning (optional, comma-separated)"
          value={newMeaning}
          onChange={(e) => setNewMeaning(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          type="submit"
          disabled={isSavingQuick || !bookId}
          className={`mt-1 px-4 py-2 rounded text-white ${
            !bookId || isSavingQuick ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {bookId ? (isSavingQuick ? "Saving…" : "Quick add") : "Select a book first"}
        </button>
      </form>

      {message && <p className="text-sm mb-4">{message}</p>}

      {/* VOCAB LIST */}
      <div className="space-y-4 mt-2">
        {entries.map((entry) => {
          const dict = {
            orthography: entry.orthography,
            reading: entry.reading,
            meaning: entry.meaning,
            jlpt: normalizeJlpt(entry.jlpt),
            is_common: entry.is_common,
            is_katakana: entry.is_katakana,
            strokes: entry.strokes,
          };

          const state =
            entry.user_vocab_states?.[0] || {
              id: null,
              lookup_count: 0,
              reading_stage: "learning",
              meaning_stage: "learning",
              forgot_reading: false,
              forgot_meaning: false,
              updated_at: "",
            };

          const appearsIn = currentBook ? [currentBook.title] : [];

          const inBook = bookLookupMap[String(entry.orthography ?? "").trim()];
          const status = computeLibraryStudyColorStatus({
            encounterCount: inBook?.count ?? 0,
            settings: mergedSettings,
            readingGate: state.reading_stage === "known" ? "passed" : "not_started",
            meaningGate: state.meaning_stage === "known" ? "passed" : "not_started",
          });

          return (
            <div key={entry.id}>
              <WordCard
                dict={dict}
                state={state}
                settings={mergedSettings}
                appearsIn={appearsIn}
                onIncrementLookup={() => incrementLookup(entry.id, state)}
                onToggleReadingKnown={() => toggleReadingKnown(entry.id, state)}
              />

              {inBook ? (
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <LibraryStudyStatusBadge
                    status={status}
                    showNumbers={!!mergedSettings.show_badge_numbers}
                    encounterCount={inBook.count}
                    days={inBook.days}
                  />
                  <span className="sr-only">
                    {inBook.count} encounter{inBook.count === 1 ? "" : "s"}
                    {inBook.days ? ` across ${inBook.days} day${inBook.days === 1 ? "" : "s"}` : ""}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </main>
  );
}
