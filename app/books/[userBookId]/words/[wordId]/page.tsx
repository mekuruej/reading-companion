// Individual Word Card
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
type WordRow = {
  id: string;
  user_book_id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  is_common: boolean | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  created_at: string;

  meaning_choices: any | null; // jsonb
  meaning_choice_index: number | null;
};

type SeenInstance = {
  id: string; // user_book_words.id
  user_book_id: string; // user_books.id
  surface: string;
  reading: string | null;
  meaning: string | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  created_at: string;
  books_title: string;
  books_cover_url: string | null;
};

type CollocationRow = {
  id: string;
  user_id: string;
  user_book_word_id: string;
  user_book_id: string;
  collocation: string;
  note: string | null;
  created_at: string;
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
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
  return "(none)";
}

function normalizeCollocation(s: string) {
  return (s ?? "").trim().replace(/[　]/g, " ").replace(/\s+/g, " ");
}

// -------------------------------------------------------------
// Collocations Panel (manual add/delete)
// -------------------------------------------------------------
function CollocationsPanel({
  userBookId,
  userBookWordId,
}: {
  userBookId: string;
  userBookWordId: string;
}) {
  const [rows, setRows] = useState<CollocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canAdd = useMemo(() => normalizeCollocation(value).length > 0, [value]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase
        .from("user_word_collocations")
        .select("id,user_id,user_book_word_id,user_book_id,collocation,note,created_at")
        .eq("user_book_word_id", userBookWordId)
        .eq("user_book_id", userBookId)
        .order("created_at", { ascending: false })
        .returns<CollocationRow[]>();

      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load collocations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userBookId || !userBookWordId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBookId, userBookWordId]);

  async function add() {
    const coll = normalizeCollocation(value);
    if (!coll) return;

    setSaving(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error("You must be signed in.");

      const payload = {
        user_id: user.id,
        user_book_word_id: userBookWordId,
        user_book_id: userBookId,
        collocation: coll,
        note: note.trim() ? note.trim() : null,
      };

      const { error } = await supabase.from("user_word_collocations").insert(payload);
      if (error) throw error;

      setValue("");
      setNote("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to add collocation");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const { error } = await supabase.from("user_word_collocations").delete().eq("id", id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete collocation");
    }
  }

  return (
    <section className="w-full max-w-3xl mt-6">
      <div className="border rounded-2xl p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Collocations</h2>
          <span className="text-xs text-gray-500">{rows.length} saved</span>
        </div>
        <div className="flex flex-col gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add a collocation (e.g. 深い眠り / 〜を取り戻す)"
            className="border rounded p-2 w-full"
          />

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (where/nuance)"
            className="border rounded p-2 w-full"
          />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canAdd || saving}
              onClick={add}
              className="px-3 py-2 rounded bg-gray-200 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add"}
            </button>

            <button
              type="button"
              onClick={load}
              className="px-3 py-2 rounded bg-gray-100"
              disabled={saving || loading}
            >
              Refresh
            </button>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">No collocations yet. Add the first one!</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-medium break-words">{r.collocation}</div>
                    {r.note ? <div className="text-sm text-gray-600 break-words mt-1">{r.note}</div> : null}
                    <div className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleString()}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 shrink-0"
                    title="Delete"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------
// Page
// Route: app/books/[userBookId]/words/[wordId]/page.tsx
// -------------------------------------------------------------
export default function WordDetailPage() {
  const params = useParams<{ userBookId: string; wordId: string }>();
  const userBookId = params.userBookId;
  const wordId = params.wordId;

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<"teacher" | "student">("student");
  const isTeacher = myRole === "teacher";

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState<string | null>(null);

  const [word, setWord] = useState<WordRow | null>(null);

  const [meaningChoices, setMeaningChoices] = useState<string[]>([]);
  const [meaningChoiceIndex, setMeaningChoiceIndex] = useState(0);
  const [defSaving, setDefSaving] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);

  const [repeatsInThisBook, setRepeatsInThisBook] = useState<number>(1);
  const [seenInstances, setSeenInstances] = useState<SeenInstance[]>([]);
  const [kanjiWords, setKanjiWords] = useState<
    { word: string; reading: string; meaning: string }[]
  >([]);
  const totalLookupCount = seenInstances.length;

  async function loadAll() {
    setLoading(true);
    setErrorMsg(null);
    setNeedsSignIn(false);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setNeedsSignIn(true);
        setWord(null);
        setBookTitle("");
        setBookCover(null);
        return;
      }

      const { data: meProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setMyRole((meProfile?.role as "teacher" | "student") ?? "student");

      // verify book ownership + get book info
      const { data: ub, error: ubErr } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          books:book_id (
            title,
            cover_url
          )
        `
        )
        .eq("id", userBookId)
        .eq("user_id", user.id)
        .single();

      if (ubErr) throw ubErr;

      setBookTitle((ub as any)?.books?.title ?? "");
      setBookCover((ub as any)?.books?.cover_url ?? null);

      // load this word row
      const { data: w, error: wErr } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          user_book_id,
          surface,
          reading,
          meaning,
          jlpt,
          is_common,
          page_number,
          chapter_number,
          chapter_name,
          created_at,
          meaning_choices,
          meaning_choice_index
        `
        )
        .eq("id", wordId)
        .eq("user_book_id", userBookId)
        .single()
        .returns<WordRow>();

      if (wErr) throw wErr;

      setWord(w);

      const choices = asStringArray((w as any).meaning_choices);
      const idxRaw = Number.isFinite(w.meaning_choice_index as any) ? (w.meaning_choice_index as number) : 0;
      const safeIdx = choices.length ? Math.max(0, Math.min(idxRaw, choices.length - 1)) : 0;

      setMeaningChoices(choices);
      setMeaningChoiceIndex(safeIdx);

      // repeats in THIS book (by surface)
      const { count: repeatCount, error: rErr } = await supabase
        .from("user_book_words")
        .select("id", { count: "exact", head: true })
        .eq("user_book_id", userBookId)
        .eq("surface", w.surface);

      if (rErr) throw rErr;
      setRepeatsInThisBook(repeatCount ?? 1);

      // All instances across your books (same surface)
      const { data: seen, error: sErr } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          user_book_id,
          surface,
          reading,
          meaning,
          page_number,
          chapter_number,
          chapter_name,
          created_at,
          user_books!inner (
            user_id,
            books:book_id (
              title,
              cover_url
            )
          )
        `
        )
        .eq("surface", w.surface)
        .eq("user_books.user_id", user.id)
        .order("created_at", { ascending: false });

      if (sErr) throw sErr;

      const normalizedSeen: SeenInstance[] = (seen ?? []).map((row: any) => ({
        id: row.id,
        user_book_id: row.user_book_id,
        surface: row.surface,
        reading: row.reading ?? null,
        meaning: row.meaning ?? null,
        page_number: row.page_number ?? null,
        chapter_number: row.chapter_number ?? null,
        chapter_name: row.chapter_name ?? null,
        created_at: row.created_at,
        books_title: row.user_books?.books?.title ?? "(unknown book)",
        books_cover_url: row.user_books?.books?.cover_url ?? null,
      }));

      setSeenInstances(normalizedSeen);
      setDefError(null);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load word");
      setWord(null);
      setSeenInstances([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function fetchKanjiWords() {
      if (!word?.surface) return;

      const firstKanji = word.surface.match(/[一-龯]/)?.[0];
      if (!firstKanji) {
        setKanjiWords([]);
        return;
      }

      try {
        const res = await fetch(
          `/api/jisho?keyword=${encodeURIComponent(firstKanji)}`
        );
        const data = await res.json();

        const results = (data?.data ?? [])
          .slice(0, 3)
          .map((item: any) => ({
            word:
              item.japanese?.[0]?.word ??
              item.japanese?.[0]?.reading ??
              "",
            reading: item.japanese?.[0]?.reading ?? "",
            meaning:
              item.senses?.[0]?.english_definitions?.join(", ") ?? "",
          }));

        setKanjiWords(results);
      } catch (e) {
        console.error("kanji words fetch failed", e);
        setKanjiWords([]);
      }
    }

    fetchKanjiWords();
  }, [word?.surface]);

  useEffect(() => {
    if (!userBookId || !wordId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBookId, wordId]);

  async function setDefinition(newIndex: number) {
    if (!word) return;
    if (!meaningChoices.length) return;

    const safe = Math.max(0, Math.min(newIndex, meaningChoices.length - 1));
    const chosen = meaningChoices[safe] ?? "";

    setDefSaving(true);
    setDefError(null);

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({
          meaning_choice_index: safe,
          meaning: chosen || null,
        })
        .eq("id", word.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      setMeaningChoiceIndex(safe);
      setWord((prev) => (prev ? { ...prev, meaning_choice_index: safe, meaning: chosen || prev.meaning } : prev));
    } catch (e: any) {
      setDefError(e?.message ?? "Failed to change definition");
    } finally {
      setDefSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-lg text-gray-500">Loading word…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">You need to sign in to view this word.</p>
        <button onClick={() => router.push(`/books`)} className="px-4 py-2 bg-gray-200 rounded">
          Back to Books
        </button>
      </main>
    );
  }

  if (errorMsg || !word) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-700">{errorMsg ?? "Word not found."}</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-gray-200 rounded">
          ← Back
        </button>
      </main>
    );
  }

  const jlpt = normalizeJlpt(word.jlpt);
  const chapter = chapterDisplay(word.chapter_number, word.chapter_name);
  const defTotal = meaningChoices.length;
  const chosenMeaning = defTotal ? meaningChoices[meaningChoiceIndex] : (word.meaning ?? null);

  return (
    <main className="min-h-screen flex flex-col items-center p-6">
      {/* Header */}
      <div className="w-full max-w-3xl flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {bookCover ? <img src={bookCover} alt="" className="w-12 h-16 rounded shrink-0" /> : null}
          <div className="min-w-0">
            <div className="text-xs text-gray-500">From</div>
            <div className="font-medium truncate">{bookTitle || "Book"}</div>
            <div className="text-xs text-gray-500 truncate">
              {chapter !== "(none)" ? chapter : null}
              {word.page_number != null ? ` • p. ${word.page_number}` : null}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}/study`)}
            className="px-3 py-2 rounded bg-gray-200"
            title="Go to study for this book"
          >
            Study
          </button>

          <button onClick={() => router.back()} className="px-3 py-2 rounded bg-gray-100">
            ← Back
          </button>
        </div>
      </div>

      {/* Main Card */}
      <section className="w-full max-w-3xl border rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-slate-500">Word</div>
              <div className="text-4xl font-bold break-words">{word.surface}</div>
            </div>
          </div>

          {/* Reading */}
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Reading</div>
            <div className="text-2xl font-medium">{word.reading || "—"}</div>
          </div>

          {/* Definition */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Definition</div>
              {defTotal > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {meaningChoiceIndex + 1}/{defTotal}
                  </span>
                  <select
                    value={meaningChoiceIndex}
                    disabled={defSaving || !isTeacher}
                    onChange={(e) => setDefinition(Number(e.target.value))}
                    className="border p-1 rounded text-xs bg-white"
                    title="Choose which dictionary definition to use"
                  >
                    {meaningChoices.map((_, i) => (
                      <option key={i} value={i}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                  {defSaving ? <span className="text-xs text-gray-500">Saving…</span> : null}
                </div>
              ) : null}
            </div>

            <div className="mt-2 text-lg">{chosenMeaning || "—"}</div>
            {defError ? <p className="mt-2 text-sm text-red-700">{defError}</p> : null}
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm">
            {jlpt !== "NON-JLPT" ? (
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-medium text-[17px] leading-none">
                {jlpt}
              </span>
            ) : null}

            {word.is_common ? (
              <span className="text-gray-500">
                Common
              </span>
            ) : null}
          </div>

          {/* Counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="border rounded-xl p-3">
              <div className="text-xs text-gray-500">Repeats in this book</div>
              <div className="text-2xl font-semibold">{repeatsInThisBook}</div>
            </div>
            <div className="border rounded-xl p-3">
              <div className="text-xs text-gray-500">Total lookup count</div>
              <div className="text-2xl font-semibold">{totalLookupCount}</div>
              <div className="text-xs text-gray-400 mt-1">Across all your books (same surface)</div>
            </div>
          </div>
        </div>
      </section>

      {!isTeacher && (
        <div className="mt-4">
          <button
            onClick={() => {
              // placeholder for now
              alert("Thanks! Your teacher will review this word.");
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Something seems off?
          </button>
        </div>
      )}
      
      {/* Related Information */}
      {(() => {
        const firstKanji = word.surface?.match(/[一-龯]/)?.[0];
        if (!firstKanji) return null;

        return (
          <section className="w-full max-w-3xl mt-6 border rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold mb-4">
              Related Information
            </div>

            {/* Words with this kanji */}
            <div className="mb-6">
              <div className="text-sm font-semibold mb-2">
                Words with{" "}
                <span className="text-xl font-medium text-stone-900">
                  {firstKanji}
                </span>
              </div>

              {kanjiWords.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No related words found.
                </div>
              ) : (
                <div className="space-y-2">
                  {kanjiWords.map((kw, i) => (
                    <div key={`${kw.word}-${i}`} className="text-sm">
                      <span className="font-medium text-stone-900">{kw.word}</span>
                      {kw.reading ? (
                        <span className="ml-2 text-stone-600">（{kw.reading}）</span>
                      ) : null}
                      {kw.meaning ? (
                        <div className="text-stone-500 mt-0.5">{kw.meaning}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Other meanings (placeholder for now) */}
            <div>
              <div className="text-sm font-semibold mb-2">
                Other meanings
              </div>

              <div className="text-sm text-gray-400">
                (Coming soon)
              </div>
            </div>
          </section>
        );
      })()}

      {/* Collocations */}
      <CollocationsPanel userBookId={userBookId} userBookWordId={word.id} />

      <div className="w-full max-w-3xl mt-8 flex justify-between">
        <button onClick={() => router.back()} className="px-4 py-2 bg-gray-200 rounded">
          ← Back
        </button>
        <button onClick={() => loadAll()} className="px-4 py-2 bg-gray-100 rounded">
          Refresh
        </button>
      </div>
    </main>
  );
}