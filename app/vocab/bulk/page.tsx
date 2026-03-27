"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
const KANJI_REGEX = /[\u3400-\u9FFF]/g;

async function getStrokeData(word: string) {
  const chars = word.match(KANJI_REGEX) || [];
  const results: { kanji: string; strokes: number | null }[] = [];

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

function parseWords(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

function extractMeaningChoices(entry: any): string[] {
  const senses = entry?.senses ?? [];
  const choices: string[] = [];

  for (const s of senses) {
    const defs: string[] = s?.english_definitions ?? [];
    const text = defs.join(", ").trim();
    if (text) choices.push(text);
  }

  const seen = new Set<string>();
  const unique = choices.filter((c) => {
    const key = c.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

function toNullableInt(value: string): number | null {
  const t = (value ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
type BulkItem = {
  surface: string;
  reading: string;
  meaning: string;
  otherDefinition: string;
  jlpt: string;
  isCommon: boolean;

  meaningChoices: string[];
  meaningChoiceIndex: number | null;

  page: string;
  chapterNumber: string;
  chapterName: string;

  kanjiMeta: { kanji: string; strokes: number | null }[];
};

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------
export default function BulkVocabPage() {
  const router = useRouter();

  const [userBookId, setUserBookId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");

  // Bulk tools
  const [bulkPageNumber, setBulkPageNumber] = useState("");
  const [bulkChapterNumber, setBulkChapterNumber] = useState("");
  const [bulkChapterName, setBulkChapterName] = useState("");

  const [rawInput, setRawInput] = useState("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [message, setMessage] = useState<string>("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  const [pagePaste, setPagePaste] = useState("");

  const wordCount = useMemo(() => parseWords(rawInput).length, [rawInput]);

  // -------------------------------------------------------------
  // Get userBookId from URL (?userBookId=...)
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("userBookId") || "";
    setUserBookId(id);
  }, []);

  // -------------------------------------------------------------
  // Load book info via user_books -> books
  // -------------------------------------------------------------
  useEffect(() => {
    if (!userBookId) return;

    const saved = localStorage.getItem(`chapter_userBook_${userBookId}`);
    if (saved) {
      try {
        const { number, name } = JSON.parse(saved);
        setBulkChapterNumber(number || "");
        setBulkChapterName(name || "");
      } catch {}
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
        setMessage(`❌ Could not load user_books/book info: ${error.message}`);
        return;
      }

      const b = (data as any)?.books;
      setBookTitle(b?.title ?? "");
      setBookCover(b?.cover_url ?? "");
    })();
  }, [userBookId]);

  // Save chapter info locally
  useEffect(() => {
    if (!userBookId) return;
    localStorage.setItem(
      `chapter_userBook_${userBookId}`,
      JSON.stringify({
        number: bulkChapterNumber,
        name: bulkChapterName,
      })
    );
  }, [bulkChapterNumber, bulkChapterName, userBookId]);

  // -------------------------------------------------------------
  // Bulk apply helpers
  // -------------------------------------------------------------
  function applyBulkField(
    field: "page" | "chapterNumber" | "chapterName",
    value: string,
    mode: "blank" | "all"
  ) {
    const trimmed = value.trim();

    if (!trimmed) {
      setMessage("Fill in a value first.");
      return;
    }

    let changed = 0;

    setItems((prev) =>
      prev.map((item) => {
        const currentValue = (item[field] ?? "").toString().trim();
        const shouldUpdate = mode === "all" || currentValue === "";

        if (!shouldUpdate) return item;

        changed += 1;
        return {
          ...item,
          [field]: value,
        };
      })
    );

    const label =
      field === "page"
        ? "page number"
        : field === "chapterNumber"
        ? "chapter number"
        : "chapter name";

    setMessage(
      `✅ Applied ${label} to ${changed} row${changed === 1 ? "" : "s"} (${mode === "all" ? "all" : "blanks only"}).`
    );
  }

  // -------------------------------------------------------------
  // Apply pasted page numbers to preview list (in order)
  // -------------------------------------------------------------
  function applyPastedPages() {
    const nums = pagePaste
      .split(/[\n,\t]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (nums.length === 0) return;

    setItems((prev) => {
      const copy = [...prev];
      const n = Math.min(copy.length, nums.length);

      for (let i = 0; i < n; i++) {
        copy[i] = { ...copy[i], page: nums[i] };
      }
      return copy;
    });

    setMessage(`✅ Applied ${Math.min(items.length, nums.length)} page numbers to the preview list.`);
  }

  // -------------------------------------------------------------
  // Preview — fetch Jisho + strokes
  // -------------------------------------------------------------
  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setSaveComplete(false);

    if (!userBookId) {
      setMessage("❌ Missing userBookId. Open this page like: /vocab?userBookId=...");
      return;
    }

    const words = parseWords(rawInput);
    if (words.length === 0) {
      setMessage("Paste at least one word.");
      return;
    }

    setIsPreviewing(true);

    try {
      const results: BulkItem[] = [];

      for (const w of words) {
        let reading = "";
        let jlpt = "NON-JLPT";
        let isCommon = false;

        let meaningChoices: string[] = [];
        let meaningChoiceIndex: number | null = 0;
        let meaning = "";

        try {
          const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(w)}`);
          if (res.ok) {
            const data = await res.json();
            const entry = data?.data?.[0];

            if (entry) {
              reading = entry.japanese?.[0]?.reading || "";
              jlpt = normalizeJlpt(entry.jlpt?.[0] || "");
              isCommon = entry.is_common || false;

              meaningChoices = extractMeaningChoices(entry);
              meaningChoiceIndex = 0;
              meaning = meaningChoices[0] || "";
            }
          }
        } catch {}

        const kanjiMeta = await getStrokeData(w);

        results.push({
          surface: w,
          reading,
          meaning,
          otherDefinition: "",
          jlpt,
          isCommon,
          meaningChoices,
          meaningChoiceIndex,
          page: "",
          chapterNumber: "",
          chapterName: "",
          kanjiMeta,
        });
      }

            setItems(results);
      setMessage("✅ Preview ready! Now bulk apply page/chapter info if you want, then review and save.");
      setRawInput("");
      setPagePaste("");

        } catch (err: any) {
  console.error("PREVIEW ERROR:", err);
  setMessage(`❌ Error generating preview: ${err?.message ?? "unknown error"}`);
} finally {
  setIsPreviewing(false);
}
  }

  // -------------------------------------------------------------
  // Save ALL items to user_book_words
  // -------------------------------------------------------------
  async function handleSaveAll() {
    setMessage("");
    setSaveComplete(false);

    if (!userBookId || items.length === 0) return;

        const incompleteItems = items.filter(
      (i) => !i.reading.trim() || !i.meaning.trim()
    );

    if (incompleteItems.length > 0) {
      const confirmed = window.confirm(
        `${incompleteItems.length} word${
          incompleteItems.length === 1 ? "" : "s"
        } ${incompleteItems.length === 1 ? "is" : "are"} missing a reading or definition.\n\nDo you want to save anyway?`
      );

      if (!confirmed) return;
    }

    setIsSaving(true);
    setMessage("Saving to Supabase…");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setMessage("❌ Please sign in.");
        setIsSaving(false);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      const comboKeys = Array.from(
        new Set(
          items.map((i) => {
            const ch = toNullableInt(i.chapterNumber);
            const pg = toNullableInt(i.page);
            return `${ch ?? "null"}||${pg ?? "null"}`;
          })
        )
      );

      const maxOrderByCombo = new Map<string, number>();

      for (const key of comboKeys) {
        const [chRaw, pgRaw] = key.split("||");
        const chNum = chRaw === "null" ? null : Number(chRaw);
        const pgNum = pgRaw === "null" ? null : Number(pgRaw);

        let query = supabase
          .from("user_book_words")
          .select("page_order")
          .eq("user_book_id", userBookId);

        if (chNum == null) {
          query = query.is("chapter_number", null);
        } else {
          query = query.eq("chapter_number", chNum);
        }

        if (pgNum == null) {
          query = query.is("page_number", null);
        } else {
          query = query.eq("page_number", pgNum);
        }

        const { data: existingRows, error: existingErr } = await query;
        if (existingErr) throw existingErr;

        const maxPageOrder = Math.max(
          0,
          ...(existingRows ?? []).map((r: any) => Number(r.page_order) || 0)
        );

        maxOrderByCombo.set(key, maxPageOrder);
      }

      const nextOrderByCombo = new Map<string, number>(maxOrderByCombo);

      const payload = items.map((i) => {
        const chNum = toNullableInt(i.chapterNumber);
        const pgNum = toNullableInt(i.page);
        const comboKey = `${chNum ?? "null"}||${pgNum ?? "null"}`;

        const current = nextOrderByCombo.get(comboKey) ?? 0;
        const nextPageOrder = current + 1;
        nextOrderByCombo.set(comboKey, nextPageOrder);

        const useOther = i.meaningChoiceIndex == null;
        const chosen =
          !useOther && i.meaningChoices?.length
            ? i.meaningChoices[i.meaningChoiceIndex ?? 0] ?? i.meaning
            : i.meaning;

        return {
          user_book_id: userBookId,
          surface: i.surface,
          reading: i.reading || null,
          meaning: chosen?.trim() || null,
          other_definition: i.otherDefinition?.trim() || null,
          meaning_choices: i.meaningChoices ?? [],
          meaning_choice_index: i.meaningChoiceIndex == null ? null : i.meaningChoiceIndex,
          jlpt: normalizeJlpt(i.jlpt),
          is_common: !!i.isCommon,
          page_number: pgNum,
          page_order: nextPageOrder,
          chapter_number: chNum,
          chapter_name: i.chapterName?.trim() || null,
          kanji_meta: i.kanjiMeta ?? [],
          seen_on: today,
        };
      });

            const { error } = await supabase
  .from("user_book_words")
  .upsert(payload);

      if (error) throw error;

      setMessage(`✅ Saved ${payload.length} words!`);
      setSaveComplete(true);
        } catch (err: any) {
      console.error("SAVE ALL ERROR:", JSON.stringify(err, null, 2), err);
      setMessage(
        `❌ Failed saving: ${
          err?.message ||
          err?.error_description ||
          err?.details ||
          JSON.stringify(err) ||
          "unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  }

  // -------------------------------------------------------------
  // Update item field
  // -------------------------------------------------------------
  function updateItem(index: number, field: keyof BulkItem, value: any) {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function chooseMeaning(index: number, rawValue: string) {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[index];

      if (rawValue === "other") {
        copy[index] = {
          ...item,
          meaningChoiceIndex: null,
          meaning: "",
        };
        return copy;
      }

      const newIndex = Number(rawValue);
      const choices = item.meaningChoices ?? [];
      const chosen = choices[newIndex] ?? "";

      copy[index] = {
        ...item,
        meaningChoiceIndex: Number.isFinite(newIndex) ? newIndex : 0,
        meaning: chosen || item.meaning,
      };
      return copy;
    });
  }

  function resetForMore() {
    setRawInput("");
    setItems([]);
    setPagePaste("");
    setMessage("");
    setSaveComplete(false);
  }

  function goToVocabList() {
    if (!userBookId) return;
    router.push(`/books/${encodeURIComponent(userBookId)}/words`);
  }

  // -------------------------------------------------------------
  // UI
  // -------------------------------------------------------------
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">🧺 Add Vocabulary</h1>

        {bookTitle ? (
          <div className="flex items-center gap-3 mb-6">
            {bookCover ? (
              <img src={bookCover} alt="" className="w-12 h-16 rounded object-cover" />
            ) : null}
            <div>
              <p className="text-sm text-gray-700">
                For book: <span className="font-medium">{bookTitle}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Paste words first. Then apply page/chapter info in bulk.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-6">
            (Tip) Open with <code className="px-1 py-0.5 bg-gray-100 rounded">?userBookId=...</code>
          </p>
        )}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-lg font-medium mb-1">Step 1 — Paste Words</div>
          <p className="text-sm text-gray-500 mb-3">
            Paste one word per line or comma-separated. You can organize page and chapter info after preview.
          </p>

          <form onSubmit={handlePreview} className="flex flex-col gap-3">
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={8}
              className="border p-3 rounded font-mono text-sm bg-white"
              placeholder={`Paste one per line (or comma-separated)\n\n生意気\nメンヘラ\n都市伝説`}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={isPreviewing}
                className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 disabled:opacity-60"
              >
                {isPreviewing ? "Loading…" : `Preview Words${wordCount ? ` (${wordCount})` : ""}`}
              </button>

              {items.length > 0 ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveAll}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : "Save All"}
                </button>
              ) : null}

              {saveComplete ? (
                <>
                  <button
                    type="button"
                    onClick={resetForMore}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    title="Clear the preview and start a new batch"
                  >
                    ➕ Add More Words
                  </button>

                  <button
                    type="button"
                    onClick={goToVocabList}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
                    title="Go to the vocab list for this book"
                  >
                    📄 Go to Vocab List
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </div>

        {message ? (
  <div className="mb-4">
    {message.startsWith("❌") ? (
      <p className="text-red-700 text-base font-medium">{message}</p>
    ) : (
      <p className="text-green-700 text-lg font-semibold">{message}</p>
    )}
  </div>
) : null}

        {items.length > 0 && (
          <>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-lg font-medium mb-1">Step 2 — Bulk Apply Info</div>
              <p className="text-sm text-gray-500 mb-4">
                Apply page or chapter info to all rows, or just to blanks. You can still edit anything row by row below.
              </p>

              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[160px_1fr_auto_auto] items-center">
                  <div className="text-sm font-medium text-gray-700">Page number</div>
                  <input
                    type="number"
                    value={bulkPageNumber}
                    onChange={(e) => setBulkPageNumber(e.target.value)}
                    placeholder="e.g. 45"
                    className="border p-2 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => applyBulkField("page", bulkPageNumber, "blank")}
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Apply to blanks
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkField("page", bulkPageNumber, "all")}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Apply to all
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-[160px_1fr_auto_auto] items-center">
                  <div className="text-sm font-medium text-gray-700">Chapter number</div>
                  <input
                    type="number"
                    value={bulkChapterNumber}
                    onChange={(e) => setBulkChapterNumber(e.target.value)}
                    placeholder="e.g. 3"
                    className="border p-2 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => applyBulkField("chapterNumber", bulkChapterNumber, "blank")}
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Apply to blanks
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkField("chapterNumber", bulkChapterNumber, "all")}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Apply to all
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-[160px_1fr_auto_auto] items-center">
                  <div className="text-sm font-medium text-gray-700">Chapter name</div>
                  <input
                    type="text"
                    value={bulkChapterName}
                    onChange={(e) => setBulkChapterName(e.target.value)}
                    placeholder="e.g. Summer Festival"
                    className="border p-2 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => applyBulkField("chapterName", bulkChapterName, "blank")}
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Apply to blanks
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkField("chapterName", bulkChapterName, "all")}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Apply to all
                  </button>
                </div>
              </div>

              <div className="mt-6 border-t pt-4">
                <div className="text-sm font-medium mb-1">Paste page numbers in order (optional)</div>
                <p className="text-xs text-gray-500 mb-2">
                  Paste one per line or copied from a spreadsheet. They’ll be applied to the preview list in order.
                </p>

                <textarea
                  rows={4}
                  value={pagePaste}
                  onChange={(e) => setPagePaste(e.target.value)}
                  className="border p-2 rounded font-mono text-sm w-full"
                  placeholder={`10\n10\n11\n11\n12`}
                />

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={applyPastedPages}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Apply pages
                  </button>

                  <button
                    type="button"
                    onClick={() => setPagePaste("")}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
  <h2 className="text-xl font-medium">Step 3 — Review and Save ({items.length})</h2>

  <div className="flex items-center gap-3 flex-wrap">
    {saveComplete ? (
      <div className="text-green-700 text-lg font-semibold">
        {message}
      </div>
    ) : null}

    <button
      type="button"
      disabled={isSaving}
      onClick={handleSaveAll}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60"
    >
      {isSaving ? "Saving…" : "Save All"}
    </button>
  </div>
</div>

            <ul className="space-y-3">
              {items.map((i, idx) => (
                <li key={`${i.surface}_${idx}`} className="border border-slate-200 p-3 rounded-2xl bg-white shadow-sm">
                  <div className="flex justify-between items-start gap-3 mb-2 flex-wrap">
                    <span className="font-semibold text-lg">{i.surface}</span>

                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="number"
                        placeholder="Ch #"
                        value={i.chapterNumber}
                        onChange={(e) => updateItem(idx, "chapterNumber", e.target.value)}
                        className="border p-1 rounded text-xs w-16 text-right"
                      />

                      <input
                        type="text"
                        placeholder="Chapter name"
                        value={i.chapterName}
                        onChange={(e) => updateItem(idx, "chapterName", e.target.value)}
                        className="border p-1 rounded text-xs w-40"
                      />

                      <input
                        type="number"
                        placeholder="Page"
                        value={i.page}
                        onChange={(e) => updateItem(idx, "page", e.target.value)}
                        className="border p-1 rounded text-xs w-20 text-right"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <input
                      value={i.reading}
                      onChange={(e) => updateItem(idx, "reading", e.target.value)}
                      className="border p-2 rounded w-full text-sm"
                      placeholder="Reading"
                    />

                    {i.meaningChoices?.length ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Definition:{" "}
                            {i.meaningChoiceIndex == null
                              ? "Other"
                              : `${i.meaningChoiceIndex + 1}/${i.meaningChoices.length}`}
                          </span>

                          <select
                            value={i.meaningChoiceIndex == null ? "other" : String(i.meaningChoiceIndex)}
                            onChange={(e) => chooseMeaning(idx, e.target.value)}
                            className="border p-1 rounded text-xs bg-white"
                            title="Pick which Jisho definition to save as Meaning"
                          >
                            {i.meaningChoices.map((m, mi) => (
                              <option key={mi} value={mi}>
                                {mi + 1}
                              </option>
                            ))}
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <textarea
                          rows={2}
                          value={i.meaning}
                          onChange={(e) => updateItem(idx, "meaning", e.target.value)}
                          className="border p-2 rounded w-full text-sm"
                          placeholder={i.meaningChoiceIndex == null ? "Type your custom definition" : "Meaning"}
                        />

                        <details className="text-xs text-gray-600">
                          <summary className="cursor-pointer select-none">Show all definitions</summary>
                          <ol className="list-decimal ml-5 mt-1 space-y-1">
                            {i.meaningChoices.map((m, mi) => (
                              <li key={mi} className={mi === i.meaningChoiceIndex ? "font-medium" : ""}>
                                {m}
                              </li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    ) : (
                      <textarea
                        rows={2}
                        value={i.meaning}
                        onChange={(e) => updateItem(idx, "meaning", e.target.value)}
                        className="border p-2 rounded w-full text-sm"
                        placeholder="Meaning"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs mt-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {normalizeJlpt(i.jlpt)}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateItem(idx, "isCommon", !i.isCommon)}
                      className={`px-2 py-1 rounded border ${
                        i.isCommon
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-gray-100 text-gray-700 border-gray-300"
                      }`}
                    >
                      {i.isCommon ? "Common" : "Rare"}
                    </button>

                    {i.kanjiMeta?.length ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                        {i.kanjiMeta.map((s) => `${s.kanji}:${s.strokes ?? "?"}`).join(" / ")} strokes
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6">
  {saveComplete ? (
    <div className="mb-3 text-green-700 text-lg font-semibold">
      {message}
    </div>
  ) : null}

  <div className="flex flex-wrap gap-3">
    <button
      type="button"
      disabled={isSaving}
      onClick={handleSaveAll}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60"
    >
      {isSaving ? "Saving…" : "Save All"}
    </button>

    {saveComplete ? (
      <>
        <button
          type="button"
          onClick={resetForMore}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Add More Words
        </button>

        <button
          type="button"
          onClick={goToVocabList}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
        >
          📄 Go to Vocab List
        </button>
      </>
    ) : null}
  </div>
</div>
          </>
        )}
      </div>
    </main>
  );
}