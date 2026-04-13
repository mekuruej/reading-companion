"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type JishoChoice = {
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

function sortSessionWords(words: SessionWord[]) {
  return [...words].sort((a, b) => {
    const aChapter = toNullableInt(a.chapterNumber) ?? Number.MAX_SAFE_INTEGER;
    const bChapter = toNullableInt(b.chapterNumber) ?? Number.MAX_SAFE_INTEGER;
    if (aChapter !== bChapter) return aChapter - bChapter;

    const aPage = toNullableInt(a.pageNumber) ?? Number.MAX_SAFE_INTEGER;
    const bPage = toNullableInt(b.pageNumber) ?? Number.MAX_SAFE_INTEGER;
    if (aPage !== bPage) return aPage - bPage;

    const aOrder = a.pageOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.pageOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;

    return a.surface.localeCompare(b.surface);
  });
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

  const hasWord = useMemo(() => word.trim().length > 0, [word]);

  useEffect(() => {
    if (!userBookId) return;

    const saved = localStorage.getItem(`chapter_userBook_${userBookId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChapterNumber(parsed?.number || "");
        setChapterName(parsed?.name || "");
      } catch {}
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

    if (!keepLocation) {
      setPageNumber("");
      setChapterNumber("");
      setChapterName("");
    }
  }

  function applyJisho(entry: JishoChoice) {
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
    setMessage(`Editing "${sessionWord.surface}"`);
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
        setMessage("❌ No dictionary result found. You can still enter it manually.");
        return;
      }

      const choices = extractMeaningChoices(entry);

      applyJisho({
        reading: entry.japanese?.[0]?.reading || "",
        jlpt: normalizeJlpt(entry.jlpt?.[0] || ""),
        isCommon: !!entry.is_common,
        meaningChoices: choices,
        defaultMeaning: choices[0] || "",
      });

      setMessage("✅ Dictionary info loaded.");
    } catch (err: any) {
      console.error("Lookup error:", err);
      setMessage("❌ Could not load dictionary data.");
    } finally {
      setLookupLoading(false);
    }
  }

  function handleDefinitionChange(rawValue: string) {
    if (rawValue === "other") {
      setMeaningChoiceIndex(null);
      setMeaning("");
      return;
    }

    const idx = Number(rawValue);
    const safeIdx = Number.isFinite(idx) ? idx : 0;
    setMeaningChoiceIndex(safeIdx);
    setMeaning(meaningChoices[safeIdx] ?? "");
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

        setSessionWords((prev) => sortSessionWords([...prev, newSessionWord]));
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

        setSessionWords((prev) =>
          sortSessionWords(
            prev.map((item) => (item.id === updatedSessionWord.id ? updatedSessionWord : item))
          )
        );
        setMessage(`✅ Updated "${finalSurface}".`);
      }

      clearForm(true);
    } catch (err: any) {
      console.error("Save error:", err);
      setMessage(`❌ Failed saving: ${err?.message ?? "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-semibold">Add Word</h1>

        {bookTitle ? (
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

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-1 text-lg font-medium">
            {editingSessionWordId ? "Edit word" : "Add a word"}
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Look up a word, adjust anything you want, then save it to this book.
          </p>

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Word</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleLookup();
                    }
                  }}
                  placeholder="Enter a word"
                  className="w-full rounded border p-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void handleLookup()}
                  disabled={!hasWord || lookupLoading}
                  className="rounded bg-amber-500 px-4 py-3 text-sm text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {lookupLoading ? "Looking up…" : "Look Up"}
                </button>
              </div>

              <label className="mt-2 flex items-center gap-2 text-sm text-stone-700">
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
                  className="mt-2 w-full rounded border px-3 py-2 text-sm"
                />
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reading</label>
                <input
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  placeholder="Reading"
                  className="w-full rounded border p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">JLPT</label>
                <select
                  value={jlpt}
                  onChange={(e) => setJlpt(e.target.value)}
                  className="w-full rounded border bg-white p-3 text-sm"
                >
                  <option value="NON-JLPT">NON-JLPT</option>
                  <option value="N5">N5</option>
                  <option value="N4">N4</option>
                  <option value="N3">N3</option>
                  <option value="N2">N2</option>
                  <option value="N1">N1</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Definition #
                </label>
                <select
                  value={meaningChoiceIndex == null ? "other" : String(meaningChoiceIndex)}
                  onChange={(e) => handleDefinitionChange(e.target.value)}
                  className="w-full rounded border bg-white p-3 text-sm"
                >
                  {meaningChoices.map((_, i) => (
                    <option key={i} value={i}>
                      Def {i + 1}
                    </option>
                  ))}
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Meaning</label>
                <textarea
                  rows={3}
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  readOnly={meaningChoiceIndex != null}
                  placeholder={
                    meaningChoiceIndex == null ? "Type your custom meaning" : "Meaning"
                  }
                  className={`w-full rounded border p-3 text-sm ${
                    meaningChoiceIndex == null ? "bg-white" : "bg-slate-100 text-slate-700"
                  }`}
                />
                <p className="mt-1 text-xs text-stone-500">
                  Choose Other to write your own definition.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Page</label>
                <input
                  type="number"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full rounded border p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Chapter #
                </label>
                <input
                  type="number"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full rounded border p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Chapter Name
                </label>
                <input
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                  placeholder="e.g. Summer Festival"
                  className="w-full rounded border p-3 text-sm"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={hideKanjiInReadingSupport}
                onChange={(e) => setHideKanjiInReadingSupport(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Hide kanji in Reading Support</span>
                <span className="block text-xs text-stone-500">
                  Use kana to match the book.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : editingSessionWordId ? "Update Word" : "Save Word"}
              </button>

              <button
                type="button"
                onClick={() => clearForm(true)}
                className="rounded bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
              >
                {editingSessionWordId ? "Cancel Edit" : "Clear"}
              </button>

              <button
                type="button"
                onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}/words`)}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
              >
                Go to Vocab List
              </button>
            </div>
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

                      <button
                        type="button"
                        onClick={() => loadSessionWordIntoForm(item)}
                        className="shrink-0 rounded bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}