// Word Card
// 

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import WordDetailErrorState from "./components/WordDetailErrorState";
import WordDetailLoadingState from "./components/WordDetailLoadingState";
import WordDetailNeedsSignInState from "./components/WordDetailNeedsSignInState";
import WordDetailHeader from "./components/WordDetailHeader";
import WordDetailFooterActions from "./components/WordDetailFooterActions";
import WordDetailReportIssueLink from "./components/WordDetailReportIssueLink";
import WordSeenInSection from "./components/WordSeenInSection";
import WordDictionaryInfoSection from "./components/WordDictionaryInfoSection";
import BookVocabEditModalShell from "../components/BookVocabEditModalShell";
import BookVocabEditFormBody from "../components/BookVocabEditFormBody";
import {
  fetchLibraryStudyColorInfoByWord,
  makeLibraryStudyColorKey,
  type LibraryStudyWordColorInfo,
} from "@/lib/libraryStudyColorLookup";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
type WordRow = {
  id: string;
  user_book_id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  other_definition: string | null;
  jlpt: string | null;
  is_common: boolean | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  created_at: string;
  meaning_choices: any | null;
  meaning_choice_index: number | null;
  hidden: boolean | null;
  hide_kanji_in_reading_support?: boolean | null;
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

type WordNeighbor = {
  id: string;
  surface: string;
  reading: string | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  page_order: number | null;
  created_at: string;
  hidden: boolean | null;
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

function sortWordNeighbors(words: WordNeighbor[]) {
  return [...words].sort((a, b) => {
    const aChapter = a.chapter_number ?? Number.MAX_SAFE_INTEGER;
    const bChapter = b.chapter_number ?? Number.MAX_SAFE_INTEGER;
    if (aChapter !== bChapter) return aChapter - bChapter;

    const aPage = a.page_number ?? Number.MAX_SAFE_INTEGER;
    const bPage = b.page_number ?? Number.MAX_SAFE_INTEGER;
    if (aPage !== bPage) return aPage - bPage;

    const aOrder = a.page_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.page_order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;

    const created = a.created_at.localeCompare(b.created_at);
    if (created !== 0) return created;

    return a.id.localeCompare(b.id);
  });
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

  const [myRole, setMyRole] = useState<"teacher" | "member" | "student" | "super_teacher">("member");
  const isTeacher = myRole === "teacher";

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState<string | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  const [word, setWord] = useState<WordRow | null>(null);
  const [meaningChoices, setMeaningChoices] = useState<string[]>([]);
  const [previousWord, setPreviousWord] = useState<WordNeighbor | null>(null);
  const [nextWord, setNextWord] = useState<WordNeighbor | null>(null);

  const [editing, setEditing] = useState<WordRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editSurface, setEditSurface] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const [editJlpt, setEditJlpt] = useState("");
  const [editPage, setEditPage] = useState<string>("");
  const [editChapterNum, setEditChapterNum] = useState<string>("");
  const [editChapterName, setEditChapterName] = useState("");
  const [editMeaningChoices, setEditMeaningChoices] = useState<string[]>([]);
  const [editMeaningChoiceIndex, setEditMeaningChoiceIndex] = useState<number | null>(0);
  const [editHideKanjiInReadingSupport, setEditHideKanjiInReadingSupport] = useState(false);

  const [repeatsInThisBook, setRepeatsInThisBook] = useState<number>(0);
  const [seenInstances, setSeenInstances] = useState<SeenInstance[]>([]);
  const [totalLookupCount, setTotalLookupCount] = useState<number>(0);
  const [libraryColorInfo, setLibraryColorInfo] = useState<LibraryStudyWordColorInfo | null>(null);

  const [kanjiMeta, setKanjiMeta] = useState<KanjiMeta[]>([]);
  const [kanjiGroups, setKanjiGroups] = useState<KanjiGroup[]>([]);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);

  function openEdit(w: WordRow) {
    setEditErr(null);
    setEditing(w);
    setEditSurface(w.surface ?? "");
    setEditReading(w.reading ?? "");
    setEditMeaning(w.meaning ?? "");
    setEditJlpt(w.jlpt ?? "");
    setEditPage(w.page_number != null ? String(w.page_number) : "");
    setEditChapterNum(w.chapter_number != null ? String(w.chapter_number) : "");
    setEditChapterName(w.chapter_name ?? "");
    setEditHideKanjiInReadingSupport(!!w.hide_kanji_in_reading_support);

    const choices = asStringArray(w.meaning_choices);
    const rawIdx =
      w.meaning_choice_index == null
        ? null
        : Number.isFinite(w.meaning_choice_index as any)
          ? (w.meaning_choice_index as number)
          : 0;
    const idx =
      rawIdx == null
        ? null
        : Math.max(0, choices.length ? Math.min(rawIdx, choices.length - 1) : rawIdx);

    setEditMeaningChoices(choices);
    setEditMeaningChoiceIndex(idx);
    setEditMeaning(idx != null && choices.length && choices[idx] ? choices[idx] : w.meaning ?? "");
  }

  function closeEdit() {
    setEditing(null);
    setEditErr(null);
    setEditSaving(false);
  }

  function parseNullableInt(s: string): number | null {
    const t = (s ?? "").trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }

  function changeDefinition(newValue: string) {
    const choices = editMeaningChoices ?? [];

    if (newValue === "other") {
      setEditMeaningChoiceIndex(null);
      setEditMeaning("");
      return;
    }

    const safe = Math.max(0, Number(newValue));
    setEditMeaningChoiceIndex(safe);

    if (choices.length) {
      const clamped = Math.min(safe, choices.length - 1);
      setEditMeaning(choices[clamped] ?? "");
    }
  }

  async function saveEdit() {
    if (!editing) return;

    setEditSaving(true);
    setEditErr(null);

    const hasChoices = (editMeaningChoices?.length ?? 0) > 0;
    const patch: any = {
      surface: editSurface.trim(),
      reading: editReading.trim() ? editReading.trim() : null,
      meaning: editMeaning.trim() ? editMeaning.trim() : null,
      other_definition: null,
      jlpt: editJlpt.trim() ? editJlpt.trim().toUpperCase() : null,
      page_number: parseNullableInt(editPage),
      chapter_number: parseNullableInt(editChapterNum),
      chapter_name: editChapterName.trim() ? editChapterName.trim() : null,
      hide_kanji_in_reading_support: editHideKanjiInReadingSupport,
    };

    if (editMeaningChoiceIndex == null) {
      patch.meaning_choices = null;
      patch.meaning_choice_index = null;
    } else {
      patch.meaning_choice_index = editMeaningChoiceIndex;
    }

    if (hasChoices && editMeaningChoiceIndex != null) {
      const chosen = editMeaningChoices[editMeaningChoiceIndex] ?? "";
      if (chosen) patch.meaning = chosen;
    }

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update(patch)
        .eq("id", editing.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      const updatedWord = { ...editing, ...patch } as WordRow;
      setWord(updatedWord);
      setMeaningChoices(asStringArray(updatedWord.meaning_choices));
      closeEdit();
    } catch (e: any) {
      setEditErr(e?.message ?? "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  }

  async function hideWord(nextHidden: boolean) {
    if (!word) return;

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({ hidden: nextHidden })
        .eq("id", word.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;
      setWord({ ...word, hidden: nextHidden });
    } catch (e: any) {
      alert(e?.message ?? "Failed to update word visibility");
    }
  }

  async function deleteWord() {
    if (!word) return;
    const ok = window.confirm(`Delete "${word.surface}"? This cannot be undone.`);
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("user_book_words")
        .delete()
        .eq("id", word.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;
      router.push(`/books/${encodeURIComponent(userBookId)}/words`);
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete word");
    }
  }

  async function loadAll() {
    setLoading(true);
    setErrorMsg(null);
    setNeedsSignIn(false);
    setPreviousWord(null);
    setNextWord(null);

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

      const { data: meProfile, error: meProfileErr } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (meProfileErr) {
        console.error("Error loading profile role:", meProfileErr);
      }

      setMyRole((meProfile?.role as "teacher" | "member" | "student" | "super_teacher") ?? "member");

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
        .maybeSingle();

      if (ubErr) throw ubErr;

      if (!ub) {
        setErrorMsg("You do not have access to this word.");
        setWord(null);
        return;
      }

      const bookOwnerUserId = (ub as any)?.user_id ?? "";
      const isOwner = bookOwnerUserId === user.id;
      const isSuperTeacher =
        meProfile?.role === "super_teacher" || Boolean((meProfile as any)?.is_super_teacher);
      let isLinkedTeacher = false;

      if (!isOwner && !isSuperTeacher && meProfile?.role === "teacher") {
        const { data: teacherStudentRow, error: teacherStudentErr } = await supabase
          .from("teacher_students")
          .select("teacher_id")
          .eq("teacher_id", user.id)
          .eq("student_id", bookOwnerUserId)
          .maybeSingle();

        if (teacherStudentErr) {
          console.error("Error checking teacher/student access:", teacherStudentErr);
        }

        isLinkedTeacher = Boolean(teacherStudentRow);
      }

      if (!isOwner && !isSuperTeacher && !isLinkedTeacher) {
        setErrorMsg("You do not have access to this word.");
        setWord(null);
        return;
      }

      setBookTitle((ub as any)?.books?.title ?? "");
      setBookCover((ub as any)?.books?.cover_url ?? null);
      setOwnerUserId(bookOwnerUserId);

      const { data: w, error: wErr } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          user_book_id,
          surface,
          reading,
          meaning,
          other_definition,
          jlpt,
          is_common,
          page_number,
          chapter_number,
          chapter_name,
          created_at,
          meaning_choices,
          meaning_choice_index,
          hidden,
          hide_kanji_in_reading_support
        `
        )
        .eq("id", wordId)
        .eq("user_book_id", userBookId)
        .maybeSingle()
        .returns<WordRow>();

      if (wErr) throw wErr;

      if (!w) {
        setErrorMsg("Word not found.");
        setWord(null);
        return;
      }

      setWord(w);
      setMeaningChoices(asStringArray((w as any).meaning_choices));

      const { data: neighborRows, error: neighborErr } = await supabase
        .from("user_book_words")
        .select(
          `
          id,
          surface,
          reading,
          page_number,
          chapter_number,
          chapter_name,
          page_order,
          created_at,
          hidden
        `
        )
        .eq("user_book_id", userBookId)
        .returns<WordNeighbor[]>();

      if (neighborErr) throw neighborErr;

      const orderedNeighbors = sortWordNeighbors(neighborRows ?? []);
      const currentIndex = orderedNeighbors.findIndex((item) => item.id === wordId);

      setPreviousWord(currentIndex > 0 ? orderedNeighbors[currentIndex - 1] : null);
      setNextWord(
        currentIndex >= 0 && currentIndex < orderedNeighbors.length - 1
          ? orderedNeighbors[currentIndex + 1]
          : null
      );
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load word");
      setWord(null);
      setSeenInstances([]);
      setTotalLookupCount(0);
      setPreviousWord(null);
      setNextWord(null);
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

  async function loadLibraryColorInfo(surface: string, reading: string | null, userId: string) {
    try {
      const colorMap = await fetchLibraryStudyColorInfoByWord(supabase, userId, [
        { surface, reading },
      ]);
      setLibraryColorInfo(colorMap[makeLibraryStudyColorKey(surface, reading)] ?? null);
    } catch {
      setLibraryColorInfo(null);
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
          const {
            data: { session },
          } = await supabase.auth.getSession();

          const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(ch)}`, {
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : undefined,
          });
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

      await loadBookAwareInfo(word.surface, ownerUserId ?? user.id);
      await loadLibraryColorInfo(word.surface, word.reading, ownerUserId ?? user.id);
    }

    refreshDerivedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, ownerUserId]);

  if (loading) {
    return <WordDetailLoadingState />;
  }

  if (needsSignIn) {
    return (
      <WordDetailNeedsSignInState
        onBackToBooks={() => router.push(`/books`)}
      />
    );
  }

  if (errorMsg || !word) {
    return (
      <WordDetailErrorState
        errorMsg={errorMsg}
        onBack={() => router.back()}
      />
    );
  }

  const jlpt = normalizeJlpt(word.jlpt);
  const chapter = chapterDisplay(word.chapter_number, word.chapter_name);
  const definitionNumber =
    word.meaning_choice_index != null ? word.meaning_choice_index + 1 : null;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-4xl">
        {editing ? (
          <BookVocabEditModalShell
            surface={editing.surface}
            wordId={editing.id}
            editErr={editErr}
            editSaving={editSaving}
            saveDisabled={editSaving || !editSurface.trim()}
            onClose={closeEdit}
            onSave={saveEdit}
          >
            <BookVocabEditFormBody
              cacheSurface={null}
              editSurface={editSurface}
              editReading={editReading}
              editJlpt={editJlpt}
              editMeaning={editMeaning}
              editChapterNum={editChapterNum}
              editChapterName={editChapterName}
              editPage={editPage}
              editMeaningChoices={editMeaningChoices}
              editMeaningChoiceIndex={editMeaningChoiceIndex}
              editHideKanjiInReadingSupport={editHideKanjiInReadingSupport}
              onEditSurfaceChange={setEditSurface}
              onEditReadingChange={setEditReading}
              onEditJlptChange={setEditJlpt}
              onDefinitionChange={changeDefinition}
              onEditMeaningChange={setEditMeaning}
              onEditChapterNumChange={setEditChapterNum}
              onEditChapterNameChange={setEditChapterName}
              onEditPageChange={setEditPage}
              onEditHideKanjiInReadingSupportChange={setEditHideKanjiInReadingSupport}
            />
          </BookVocabEditModalShell>
        ) : null}

        <WordDetailHeader
          bookTitle={bookTitle}
          bookCover={bookCover}
          chapter={chapter}
          pageNumber={word.page_number}
          onGoToBookHub={() =>
            router.push(`/books/${encodeURIComponent(userBookId)}`)
          }
          onGoToVocabList={() =>
            router.push(`/books/${encodeURIComponent(userBookId)}/words`)
          }
        />

        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!previousWord}
            onClick={() => {
              if (!previousWord) return;
              router.push(
                `/books/${encodeURIComponent(userBookId)}/words/${previousWord.id}`
              );
            }}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
              ← Previous word
            </div>
            <div className="mt-1 truncate text-base font-black text-stone-900">
              {previousWord?.surface ?? "Start of list"}
            </div>
            {previousWord?.reading ? (
              <div className="truncate text-sm font-medium text-stone-500">
                {previousWord.reading}
              </div>
            ) : null}
          </button>

          <button
            type="button"
            disabled={!nextWord}
            onClick={() => {
              if (!nextWord) return;
              router.push(`/books/${encodeURIComponent(userBookId)}/words/${nextWord.id}`);
            }}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-right"
          >
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
              Next word →
            </div>
            <div className="mt-1 truncate text-base font-black text-stone-900">
              {nextWord?.surface ?? "End of list"}
            </div>
            {nextWord?.reading ? (
              <div className="truncate text-sm font-medium text-stone-500">
                {nextWord.reading}
              </div>
            ) : null}
          </button>
        </div>

        <WordDictionaryInfoSection
          surface={word.surface}
          reading={word.reading}
          meaning={word.meaning}
          jlpt={jlpt}
          isCommon={word.is_common}
          definitionNumber={definitionNumber}
          repeatsInThisBook={repeatsInThisBook}
          hidden={word.hidden}
          colorInfo={libraryColorInfo}
        >
          <WordDetailFooterActions
            onBack={() => router.back()}
            hidden={word.hidden}
            onEdit={() => openEdit(word)}
            onHide={() => hideWord(true)}
            onUnhide={() => hideWord(false)}
            onDelete={() => deleteWord()}
          />
        </WordDictionaryInfoSection>

        <WordSeenInSection
          seenInstances={seenInstances}
          meaningChoices={meaningChoices}
          getChapterDisplay={chapterDisplay}
        />

        {!isTeacher ? (
          <WordDetailReportIssueLink
            onReportIssue={() => {
              alert("Thanks! Your teacher will review this word.");
            }}
          />
        ) : null}

      </div>
    </main>
  );
}
