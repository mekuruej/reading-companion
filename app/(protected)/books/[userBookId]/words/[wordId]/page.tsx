// Word Card
// 

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
  meaning_choices: any | null;
  meaning_choice_index: number | null;
};

type SeenInstance = {
  id: string;
  user_book_id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  meaning_choice_index: number | null;
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

type KanjiMeta = {
  kanji: string;
  strokes: number | null;
  radical: string | null;
};

type RelatedWord = {
  word: string;
  reading: string;
  meaning: string;
};

type KanjiGroup = {
  kanji: string;
  relatedWords: RelatedWord[];
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
  return "";
}

function normalizeCollocation(s: string) {
  return (s ?? "").trim().replace(/[　]/g, " ").replace(/\s+/g, " ");
}

function getUniqueKanji(surface: string) {
  return Array.from(new Set(surface.match(/[\u3400-\u9FFF]/g) || []));
}

// -------------------------------------------------------------
// Collocations Panel
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
    <section className="mt-6">
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Collocations</h3>
          <span className="text-xs text-gray-500">{rows.length} saved</span>
        </div>

        <div className="flex flex-col gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add a collocation (e.g. 深い眠り / 〜を取り戻す)"
            className="w-full rounded border p-2"
          />

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (where/nuance)"
            className="w-full rounded border p-2"
          />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canAdd || saving}
              onClick={add}
              className="rounded bg-gray-200 px-3 py-2 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add"}
            </button>

            <button
              type="button"
              onClick={load}
              className="rounded bg-gray-100 px-3 py-2"
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
            <p className="text-sm text-gray-500">No collocations yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0">
                    <div className="break-words font-medium">{r.collocation}</div>
                    {r.note ? <div className="mt-1 break-words text-sm text-gray-600">{r.note}</div> : null}
                    <div className="mt-1 text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="shrink-0 rounded bg-gray-100 px-2 py-1 text-sm hover:bg-gray-200"
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
// -------------------------------------------------------------
export default function WordDetailPage() {
  const params = useParams<{ userBookId: string; wordId: string }>();
  const userBookId = params.userBookId;
  const wordId = params.wordId;

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<"teacher" | "member" | "student">("member");
  const isTeacher = myRole === "teacher";

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState<string | null>(null);

  const [word, setWord] = useState<WordRow | null>(null);
  const [meaningChoices, setMeaningChoices] = useState<string[]>([]);

  const [repeatsInThisBook, setRepeatsInThisBook] = useState<number>(0);
  const [seenInstances, setSeenInstances] = useState<SeenInstance[]>([]);
  const [totalLookupCount, setTotalLookupCount] = useState<number>(0);

  const [kanjiMeta, setKanjiMeta] = useState<KanjiMeta[]>([]);
  const [kanjiGroups, setKanjiGroups] = useState<KanjiGroup[]>([]);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);

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

      setMyRole((meProfile?.role as "teacher" | "member" | "student") ?? "member");

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
      setMeaningChoices(asStringArray((w as any).meaning_choices));
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load word");
      setWord(null);
      setSeenInstances([]);
      setTotalLookupCount(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadBookAwareInfo(surface: string, userId: string) {
    try {
      const { count: repeatCount, error: rErr } = await supabase
        .from("user_book_words")
        .select("id", { count: "exact", head: true })
        .eq("user_book_id", userBookId)
        .eq("surface", surface);

      if (rErr) throw rErr;
      setRepeatsInThisBook(repeatCount ?? 0);
    } catch {
      setRepeatsInThisBook(0);
    }

    try {
      const { data: seen, error: sErr } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          user_book_id,
          surface,
          reading,
          meaning,
          meaning_choice_index,
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
        .eq("surface", surface)
        .eq("user_books.user_id", userId)
        .order("created_at", { ascending: false });

      if (sErr) throw sErr;

      const normalizedSeen: SeenInstance[] = (seen ?? []).map((row: any) => ({
        id: row.id,
        user_book_id: row.user_book_id,
        surface: row.surface,
        reading: row.reading ?? null,
        meaning: row.meaning ?? null,
        meaning_choice_index: row.meaning_choice_index ?? null,
        page_number: row.page_number ?? null,
        chapter_number: row.chapter_number ?? null,
        chapter_name: row.chapter_name ?? null,
        created_at: row.created_at,
        books_title: row.user_books?.books?.title ?? "(unknown book)",
        books_cover_url: row.user_books?.books?.cover_url ?? null,
      }));

      setSeenInstances(normalizedSeen);
      setTotalLookupCount(normalizedSeen.length);
    } catch {
      setSeenInstances([]);
      setTotalLookupCount(0);
    }
  }

  async function loadDictionaryExtras(surface: string) {
    setDictionaryLoading(true);

    try {
      const chars = getUniqueKanji(surface);

      if (chars.length === 0) {
        setKanjiMeta([]);
        setKanjiGroups([]);
        return;
      }

      const metaResults: KanjiMeta[] = [];
      const groupResults: KanjiGroup[] = [];

      for (const ch of chars) {
        try {
          const r = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`);
          if (!r.ok) {
            metaResults.push({ kanji: ch, strokes: null, radical: null });
          } else {
            const data = await r.json();
            metaResults.push({
              kanji: ch,
              strokes: data.stroke_count ?? null,
              radical: null,
            });
          }
        } catch {
          metaResults.push({ kanji: ch, strokes: null, radical: null });
        }

        try {
          const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(ch)}`);
          if (!res.ok) {
            groupResults.push({ kanji: ch, relatedWords: [] });
            continue;
          }

          const data = await res.json();
          const relatedWords: RelatedWord[] = (data?.data ?? [])
            .map((item: any) => ({
              word: item?.japanese?.[0]?.word ?? item?.japanese?.[0]?.reading ?? "",
              reading: item?.japanese?.[0]?.reading ?? "",
              meaning: item?.senses?.[0]?.english_definitions?.join("; ") ?? "",
            }))
            .filter((x: RelatedWord) => x.word && x.word !== surface)
            .slice(0, 3);

          groupResults.push({
            kanji: ch,
            relatedWords,
          });
        } catch {
          groupResults.push({ kanji: ch, relatedWords: [] });
        }
      }

      setKanjiMeta(metaResults);
      setKanjiGroups(groupResults);
    } catch {
      setKanjiMeta([]);
      setKanjiGroups([]);
    } finally {
      setDictionaryLoading(false);
    }
  }

  useEffect(() => {
    if (!userBookId || !wordId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBookId, wordId]);

  useEffect(() => {
    async function refreshDerivedData() {
      if (!word) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      await loadBookAwareInfo(word.surface, user.id);
      await loadDictionaryExtras(word.surface);
    }

    refreshDerivedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-lg text-gray-500">Loading word…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">You need to sign in to view this word.</p>
        <button onClick={() => router.push(`/books`)} className="rounded bg-gray-200 px-4 py-2">
          Back to Books
        </button>
      </main>
    );
  }

  if (errorMsg || !word) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-700">{errorMsg ?? "Word not found."}</p>
        <button onClick={() => router.back()} className="rounded bg-gray-200 px-4 py-2">
          ← Back
        </button>
      </main>
    );
  }

  const jlpt = normalizeJlpt(word.jlpt);
  const chapter = chapterDisplay(word.chapter_number, word.chapter_name);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-4 flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {bookCover ? <img src={bookCover} alt="" className="h-16 w-12 shrink-0 rounded" /> : null}

            <div className="min-w-0">
              <div className="text-xs text-gray-500">From</div>
              <div className="truncate font-medium">{bookTitle || "Book"}</div>
              <div className="truncate text-xs text-gray-500">
                {chapter ? chapter : null}
                {word.page_number != null ? ` • p. ${word.page_number}` : null}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
              className="rounded bg-gray-200 px-3 py-2"
              title="Go to this book hub"
            >
              Book Hub
            </button>

            <button onClick={() => router.back()} className="rounded bg-gray-100 px-3 py-2">
              ← Back
            </button>
          </div>
        </div>

        {/* 1) Dictionary Info */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 text-lg font-semibold">Dictionary Info</div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Word</div>
              <div className="break-words text-4xl font-bold">{word.surface}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Reading</div>
              <div className="text-2xl font-medium">{word.reading || "—"}</div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {jlpt !== "NON-JLPT" ? (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[17px] font-medium leading-none text-gray-800">
                  {jlpt}
                </span>
              ) : null}

              {word.is_common ? <span className="text-gray-500">Common</span> : null}
            </div>

            <div className="mt-2 rounded-xl border p-4">
              <div className="mb-2 text-sm font-semibold">Kanji Info</div>

              {dictionaryLoading ? (
                <div className="text-sm text-gray-500">Loading kanji info…</div>
              ) : kanjiMeta.length === 0 ? (
                <div className="text-sm text-gray-500">No kanji info for this word.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {kanjiMeta.map((k) => (
                    <span
                      key={k.kanji}
                      className="rounded-full border bg-stone-50 px-3 py-1 text-sm"
                    >
                      {k.kanji} · {k.strokes ?? "?"} strokes
                      {k.radical ? ` · radical ${k.radical}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 rounded-xl border p-4">
              <div className="mb-2 text-sm font-semibold">Words Using These Kanji</div>

              {kanjiGroups.length === 0 ? (
                <div className="text-sm text-gray-500">No related kanji words found.</div>
              ) : (
                <div className="space-y-5">
                  {kanjiGroups.map((group) => (
                    <div key={group.kanji}>
                      <div className="mb-2 text-sm font-semibold text-stone-700">
                        Words with {group.kanji}
                      </div>

                      {group.relatedWords.length === 0 ? (
                        <div className="text-sm text-gray-500">No related words found.</div>
                      ) : (
                        <div className="space-y-2">
                          {group.relatedWords.map((kw, i) => (
                            <div key={`${group.kanji}-${kw.word}-${i}`} className="text-sm">
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
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2) Seen In */}
        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 text-lg font-semibold">Seen In</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-gray-500">Repeats in this book</div>
              <div className="text-2xl font-semibold">{repeatsInThisBook}</div>
              <div className="mt-1 text-xs text-gray-400">All saved uses of this word in this book</div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-xs text-gray-500">Total lookup count</div>
              <div className="text-2xl font-semibold">{totalLookupCount}</div>
              <div className="mt-1 text-xs text-gray-400">Across all your books</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-semibold">Seen in</div>

            {seenInstances.length === 0 ? (
              <div className="text-sm text-gray-500">No saved instances found yet.</div>
            ) : (
              <div className="space-y-2">
                {seenInstances.map((item) => {
                  const defIndex =
                    item.meaning_choice_index != null
                      ? item.meaning_choice_index
                      : meaningChoices.findIndex((m) => m === item.meaning);

                  return (
                    <div key={item.id} className="rounded-xl border p-3">
                      <div className="font-medium text-stone-900">{item.books_title}</div>

                      <div className="mt-1 text-sm text-stone-600">
                        {chapterDisplay(item.chapter_number, item.chapter_name)
                          ? chapterDisplay(item.chapter_number, item.chapter_name)
                          : "No chapter"}
                        {item.page_number != null ? ` • p. ${item.page_number}` : ""}
                      </div>

                      {item.meaning ? (
                        <div className="mt-1 text-sm text-stone-500">
                          {defIndex !== -1 && defIndex != null ? `Def ${defIndex + 1}: ` : ""}
                          {item.meaning}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 3) Useful Phrases */}
        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-stone-500">
            Save short useful phrases from your reading here later.
          </div>

          {isTeacher ? (
            <CollocationsPanel userBookId={userBookId} userBookWordId={word.id} />
          ) : null}
        </section>

        {!isTeacher && (
          <div className="mt-4">
            <button
              onClick={() => {
                alert("Thanks! Your teacher will review this word.");
              }}
              className="text-xs text-gray-500 underline hover:text-gray-700"
            >
              Something seems off?
            </button>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button onClick={() => router.back()} className="rounded bg-gray-200 px-4 py-2">
            ← Back
          </button>

          <button onClick={() => loadAll()} className="rounded bg-gray-100 px-4 py-2">
            Refresh
          </button>
        </div>
      </div>
    </main>
  );
}
