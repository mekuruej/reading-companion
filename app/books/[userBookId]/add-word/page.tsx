"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JishoChoice = {
  surface: string;
  reading: string;
  jlpt: string;
  isCommon: boolean;
  meaningChoices: string[];
  defaultMeaning: string;
};

type SessionWord = {
  id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  jlpt: string;
  isCommon: boolean;
  meaningChoices: string[];
  meaningChoiceIndex: number | null;
  pageNumber: string;
  chapterNumber: string;
  chapterName: string;
  hideKanjiInReadingSupport: boolean;
  pageOrder: number | null;
};

function normalizeJlpt(val: string): string {
  if (!val) return "NON-JLPT";
  const v = val.toUpperCase();

  if (v.includes("N5")) return "N5";
  if (v.includes("N4")) return "N4";
  if (v.includes("N3")) return "N3";
  if (v.includes("N2")) return "N2";
  if (v.includes("N1")) return "N1";

  return "NON-JLPT";
}

function extractMeaningChoices(entry: any): string[] {
  const senses = entry?.senses ?? [];
  const choices: string[] = [];

  for (const s of senses) {
    const defs: string[] = s?.english_definitions ?? [];
    const text = defs.join("; ").trim();
    if (text) choices.push(text);
  }

  const seen = new Set<string>();
  return choices.filter((c) => {
    const key = c.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toNullableInt(value: string): number | null {
  const t = (value ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toDisplayString(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

export default function AddWordPage() {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");

  const [word, setWord] = useState("");
  const [alternateSurface, setAlternateSurface] = useState("");
  const [useAlternateSurface, setUseAlternateSurface] = useState(false);

  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");
  const [jlpt, setJlpt] = useState("NON-JLPT");
  const [isCommon, setIsCommon] = useState(false);

  const [meaningChoices, setMeaningChoices] = useState<string[]>([]);
  const [meaningChoiceIndex, setMeaningChoiceIndex] = useState<number | null>(0);

  const [pageNumber, setPageNumber] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [hideKanjiInReadingSupport, setHideKanjiInReadingSupport] = useState(false);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [editingSessionWordId, setEditingSessionWordId] = useState<string | null>(null);
  const [sessionWords, setSessionWords] = useState<SessionWord[]>([]);
  const [showEditor, setShowEditor] = useState(false);

  const wordInputRef = useRef<HTMLInputElement | null>(null);
  const editorCardRef = useRef<HTMLDivElement | null>(null);
  const editorWordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!userBookId) return;

    const saved = localStorage.getItem(`chapter_userBook_${userBookId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChapterNumber(parsed?.number || "");
        setChapterName(parsed?.name || "");
      } catch { }
    }

    async function loadBookInfo() {
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
        setMessage(`❌ Could not load book info: ${error.message}`);
        return;
      }

      const b = (data as any)?.books;
      setBookTitle(b?.title ?? "");
      setBookCover(b?.cover_url ?? "");
    }

    loadBookInfo();
  }, [userBookId]);

  useEffect(() => {
    if (!userBookId) return;
    localStorage.setItem(
      `chapter_userBook_${userBookId}`,
      JSON.stringify({
        number: chapterNumber,
        name: chapterName,
      })
    );
  }, [chapterNumber, chapterName, userBookId]);

  function jumpToEditor() {
    window.setTimeout(() => {
      editorCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      editorWordInputRef.current?.focus();
    }, 0);
  }

  function clearForm(keepLocation = true) {
    setWord("");
    setAlternateSurface("");
    setUseAlternateSurface(false);
    setReading("");
    setMeaning("");
    setJlpt("NON-JLPT");
    setIsCommon(false);
    setMeaningChoices([]);
    setMeaningChoiceIndex(0);
    setHideKanjiInReadingSupport(false);
    setEditingSessionWordId(null);
    setShowEditor(false);

    if (!keepLocation) {
      setPageNumber("");
      setChapterNumber("");
      setChapterName("");
    }
  }

  function applyJisho(entry: JishoChoice) {
    setWord(entry.surface);
    setReading(entry.reading);
    setJlpt(entry.jlpt);
    setIsCommon(entry.isCommon);
    setMeaningChoices(entry.meaningChoices);
    setMeaningChoiceIndex(entry.meaningChoices.length > 0 ? 0 : null);
    setMeaning(entry.defaultMeaning);
  }

  function loadSessionWordIntoForm(sessionWord: SessionWord) {
    setEditingSessionWordId(sessionWord.id);
    setWord(sessionWord.surface);
    setAlternateSurface("");
    setUseAlternateSurface(false);
    setReading(sessionWord.reading ?? "");
    setMeaning(sessionWord.meaning ?? "");
    setJlpt(sessionWord.jlpt || "NON-JLPT");
    setIsCommon(!!sessionWord.isCommon);
    setMeaningChoices(sessionWord.meaningChoices ?? []);
    setMeaningChoiceIndex(sessionWord.meaningChoiceIndex);
    setPageNumber(sessionWord.pageNumber);
    setChapterNumber(sessionWord.chapterNumber);
    setChapterName(sessionWord.chapterName);
    setHideKanjiInReadingSupport(sessionWord.hideKanjiInReadingSupport);
    setShowEditor(true);
    setMessage(`Editing "${sessionWord.surface}"`);
    jumpToEditor();
  }

  async function handleLookup() {
    setMessage("");

    const cleanWord = word.trim();
    if (!cleanWord) {
      setMessage("❌ Enter a word first.");
      return;
    }

    setLookupLoading(true);

    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(cleanWord)}`);
      if (!res.ok) {
        setMessage("❌ Could not load dictionary data.");
        return;
      }

      const data = await res.json();
      const entry = data?.data?.[0];

      if (!entry) {
        setMeaningChoices([]);
        setMeaningChoiceIndex(null);
        setReading("");
        setMeaning("");
        setJlpt("NON-JLPT");
        setIsCommon(false);
        setShowEditor(true);
        setMessage("❌ No dictionary result found. You can still enter it manually.");
        jumpToEditor();
        return;
      }

      const choices = extractMeaningChoices(entry);

      const jishoSurface =
        entry?.japanese?.find((j: any) => j?.word)?.word ||
        entry?.japanese?.[0]?.word ||
        entry?.slug ||
        cleanWord;

      applyJisho({
        surface: jishoSurface,
        reading: entry?.japanese?.[0]?.reading || "",
        jlpt: normalizeJlpt(entry?.jlpt?.[0] || ""),
        isCommon: !!entry?.is_common,
        meaningChoices: choices,
        defaultMeaning: choices[0] || "",
      });

      setShowEditor(true);
      setMessage("✅ Dictionary info loaded.");
      jumpToEditor();

    } catch (err: any) {
      console.error("Lookup error:", err);
      setMessage("❌ Could not load dictionary data.");
    } finally {
      setLookupLoading(false);
    }
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

  function sameGroup(
    existing: SessionWord,
    nextChapterNum: number | null,
    nextPageNum: number | null,
    nextChapterName: string
  ) {
    const oldChapterNum = toNullableInt(existing.chapterNumber);
    const oldPageNum = toNullableInt(existing.pageNumber);
    const oldChapterName = (existing.chapterName ?? "").trim();
    const newChapterName = (nextChapterName ?? "").trim();

    return (
      oldChapterNum === nextChapterNum &&
      oldPageNum === nextPageNum &&
      oldChapterName === newChapterName
    );
  }

  async function handleSave() {
    setMessage("");

    const cleanWord = word.trim();
    const cleanAlternateSurface = alternateSurface.trim();
    const cleanReading = reading.trim();
    const cleanMeaning = meaning.trim();

    if (!userBookId) {
      setMessage("❌ Missing userBookId.");
      return;
    }

    if (!cleanWord) {
      setMessage("❌ Enter a word first.");
      return;
    }

    if (useAlternateSurface && !cleanAlternateSurface) {
      setMessage("❌ Add the alternate kanji form or uncheck the box.");
      return;
    }

    if (!cleanReading) {
      setMessage("❌ Add a reading.");
      return;
    }

    if (!cleanMeaning) {
      setMessage("❌ Add a meaning.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("❌ Please sign in.");
        return;
      }

      const finalSurface = useAlternateSurface ? cleanAlternateSurface : cleanWord;

      const chapterNum = toNullableInt(chapterNumber);
      const pageNum = toNullableInt(pageNumber);
      const chapterNameTrimmed = chapterName.trim() || null;
      const today = new Date().toISOString().slice(0, 10);

      const editingExisting =
        editingSessionWordId != null
          ? sessionWords.find((w) => w.id === editingSessionWordId) ?? null
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
        surface: finalSurface,
        reading: cleanReading,
        meaning: cleanMeaning,
        other_definition: meaningChoiceIndex == null ? cleanMeaning : null,
        meaning_choices: meaningChoices,
        meaning_choice_index: meaningChoiceIndex,
        jlpt: normalizeJlpt(jlpt),
        is_common: !!isCommon,
        page_number: pageNum,
        page_order: pageOrderToUse,
        chapter_number: chapterNum,
        chapter_name: chapterNameTrimmed,
        hide_kanji_in_reading_support: hideKanjiInReadingSupport,
        seen_on: today,
      };

      if (!editingExisting) {
        const { data: insertedRow, error } = await supabase
          .from("user_book_words")
          .insert(payload)
          .select(
            `
            id,
            surface,
            reading,
            meaning,
            jlpt,
            is_common,
            meaning_choices,
            meaning_choice_index,
            page_number,
            chapter_number,
            chapter_name,
            hide_kanji_in_reading_support,
            page_order
          `
          )
          .single();

        if (error) throw error;

        const newSessionWord: SessionWord = {
          id: insertedRow.id,
          surface: insertedRow.surface ?? finalSurface,
          reading: insertedRow.reading ?? cleanReading,
          meaning: insertedRow.meaning ?? cleanMeaning,
          jlpt: insertedRow.jlpt ?? normalizeJlpt(jlpt),
          isCommon: !!insertedRow.is_common,
          meaningChoices: insertedRow.meaning_choices ?? [],
          meaningChoiceIndex: insertedRow.meaning_choice_index,
          pageNumber: toDisplayString(insertedRow.page_number),
          chapterNumber: toDisplayString(insertedRow.chapter_number),
          chapterName: insertedRow.chapter_name ?? "",
          hideKanjiInReadingSupport: !!insertedRow.hide_kanji_in_reading_support,
          pageOrder: insertedRow.page_order ?? null,
        };

        setSessionWords((prev) => [newSessionWord, ...prev]);
        setMessage(`✅ Saved "${finalSurface}".`);
      } else {
        const { data: updatedRow, error } = await supabase
          .from("user_book_words")
          .update(payload)
          .eq("id", editingExisting.id)
          .eq("user_book_id", userBookId)
          .select(
            `
            id,
            surface,
            reading,
            meaning,
            jlpt,
            is_common,
            meaning_choices,
            meaning_choice_index,
            page_number,
            chapter_number,
            chapter_name,
            hide_kanji_in_reading_support,
            page_order
          `
          )
          .single();

        if (error) throw error;

        const updatedSessionWord: SessionWord = {
          id: updatedRow.id,
          surface: updatedRow.surface ?? finalSurface,
          reading: updatedRow.reading ?? cleanReading,
          meaning: updatedRow.meaning ?? cleanMeaning,
          jlpt: updatedRow.jlpt ?? normalizeJlpt(jlpt),
          isCommon: !!updatedRow.is_common,
          meaningChoices: updatedRow.meaning_choices ?? [],
          meaningChoiceIndex: updatedRow.meaning_choice_index,
          pageNumber: toDisplayString(updatedRow.page_number),
          chapterNumber: toDisplayString(updatedRow.chapter_number),
          chapterName: updatedRow.chapter_name ?? "",
          hideKanjiInReadingSupport: !!updatedRow.hide_kanji_in_reading_support,
          pageOrder: updatedRow.page_order ?? null,
        };

        setSessionWords((prev) => [
          updatedSessionWord,
          ...prev.filter((item) => item.id !== updatedSessionWord.id),
        ]);
        setMessage(`✅ Updated "${finalSurface}".`);
      }

      clearForm(true);
      wordInputRef.current?.focus();
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage(`❌ Failed saving: ${err?.message ?? "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSessionWord(id: string) {
    const { error } = await supabase
      .from("user_book_words")
      .delete()
      .eq("id", id)
      .eq("user_book_id", userBookId);

    if (error) {
      console.error("Error deleting word:", error);
      setMessage(`❌ Could not delete word: ${error.message}`);
      return;
    }

    setSessionWords((prev) => prev.filter((item) => item.id !== id));

    if (editingSessionWordId === id) {
      clearForm(true);
    }

    setMessage("✅ Word deleted from Vocab List.");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-semibold">Add Word</h1>

        {bookTitle ? (
          <div className="mb-6 flex items-center gap-3">
            {bookCover ? (
              <button
                type="button"
                onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
                className="shrink-0 rounded focus:outline-none focus:ring-2 focus:ring-stone-400"
                title="Back to Book Hub"
              >
                <img
                  src={bookCover}
                  alt={`Go to ${bookTitle} Book Hub`}
                  className="h-16 w-12 rounded object-cover hover:opacity-90"
                />
              </button>
            ) : null}
            <div>
              <p className="text-sm text-gray-700">
                For book: <span className="font-medium">{bookTitle}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="mb-6 text-sm text-gray-500">Loading book info…</p>
        )}

        {message ? (
          <div className="mb-4">
            {message.startsWith("❌") ? (
              <p className="text-base font-medium text-red-700">{message}</p>
            ) : (
              <p className="text-lg font-semibold text-green-700">{message}</p>
            )}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-stone-300 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-stone-900">Single Add</div>

          <div className="grid gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={wordInputRef}
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="Search for a word"
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                />

                <button
                  type="button"
                  onClick={() => void handleLookup()}
                  className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Search
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReading("");
                    setMeaning("");
                    setMeaningChoices([]);
                    setMeaningChoiceIndex(null);
                    setJlpt("NON-JLPT");
                    setIsCommon(false);
                    setShowEditor(true);
                    setMessage("");
                    jumpToEditor();
                  }}
                  className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                >
                  Manual Entry
                </button>
              </div>

              {message ? (
                <div className="mt-2 text-sm text-stone-600">{message}</div>
              ) : null}

              {showEditor ? (
                <div
                  ref={editorCardRef}
                  className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4"
                >
                  {editingSessionWordId ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                      Editing "{word}"
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 text-sm font-medium text-stone-700">Word</div>
                        <input
                          ref={editorWordInputRef}
                          value={useAlternateSurface ? alternateSurface : word}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (useAlternateSurface) {
                              setAlternateSurface(next);
                            } else {
                              setWord(next);
                            }
                          }}
                          placeholder="Word"
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      </div>

                      <label className="flex items-center gap-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={useAlternateSurface}
                          onChange={(e) => setUseAlternateSurface(e.target.checked)}
                        />
                        <span>Alternate kanji (in this book)</span>
                      </label>

                      {useAlternateSurface ? (
                        <input
                          value={alternateSurface}
                          onChange={(e) => setAlternateSurface(e.target.value)}
                          placeholder="Book form (e.g. 愉しい)"
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      ) : null}
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-medium text-stone-700">Reading</div>
                      <input
                        value={reading}
                        onChange={(e) => setReading(e.target.value)}
                        placeholder="Reading"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-medium text-stone-700">Meaning</div>

                    <div className="space-y-2">
                      {meaningChoices.length > 0 ? (
                        meaningChoices.map((choice, index) => (
                          <label
                            key={index}
                            className="flex items-start gap-2 text-sm text-stone-700"
                          >
                            <input
                              type="radio"
                              checked={meaningChoiceIndex === index}
                              onChange={() => {
                                setMeaningChoiceIndex(index);
                                setMeaning(choice);
                              }}
                            />
                            <span>{choice || "—"}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-stone-500">
                          No dictionary meanings loaded. Enter your own meaning below.
                        </p>
                      )}

                      <textarea
                        value={meaningChoiceIndex == null ? meaning : ""}
                        onChange={(e) => {
                          setMeaningChoiceIndex(null);
                          setMeaning(e.target.value);
                        }}
                        placeholder="Type your meaning"
                        className="min-h-[80px] w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="mb-1 text-sm font-medium text-stone-700">Page</div>
                      <input
                        value={pageNumber}
                        onChange={(e) => setPageNumber(e.target.value)}
                        placeholder="Page"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-medium text-stone-700">Chapter</div>
                      <input
                        value={chapterNumber}
                        onChange={(e) => setChapterNumber(e.target.value)}
                        placeholder="Chapter"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-medium text-stone-700">Chapter Name</div>
                      <input
                        value={chapterName}
                        onChange={(e) => setChapterName(e.target.value)}
                        placeholder="Chapter name"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={hideKanjiInReadingSupport}
                      onChange={(e) => setHideKanjiInReadingSupport(e.target.checked)}
                    />
                    <span>Hide kanji in Read Along (does not affect Vocab List)</span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                    >
                      {saving ? "Saving..." : editingSessionWordId ? "Update Word" : "Save to Vocab List"}
                    </button>

                    <button
                      type="button"
                      onClick={() => clearForm(true)}
                      className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                    >
                      {editingSessionWordId ? "Cancel Edit" : "Cancel"}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}/words`)}
                      className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
                    >
                      Vocab List
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {sessionWords.length > 0 ? (
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="mb-3 text-sm font-medium text-stone-900">
                  Words saved into Vocab List this session
                </div>

                <div className="space-y-3">
                  {sessionWords.map((item) => (
                    <div key={item.id} className="rounded-lg border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-sm">
                          <div className="font-medium text-stone-900">{item.surface}</div>
                          <div className="text-stone-500">{item.reading || "—"}</div>
                          <div className="mt-1 text-stone-700">{item.meaning || "—"}</div>
                          <div className="mt-1 text-xs text-stone-500">
                            Page {item.pageNumber || "—"} · Ch {item.chapterNumber || "—"} ·{" "}
                            {item.chapterName || "—"}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => loadSessionWordIntoForm(item)}
                            className="rounded bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteSessionWord(item.id)}
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
      </div>
    </main >
  );
}