"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
const KANJI_REGEX = /[\u3400-\u9FFF]/g;

async function getStrokeData(word: string) {
  const chars = word.match(KANJI_REGEX) || [];
  const results: { char: string; strokes: number | null }[] = [];

  for (const ch of chars) {
    try {
      const r = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`);
      if (!r.ok) {
        results.push({ char: ch, strokes: null });
        continue;
      }
      const data = await r.json();
      results.push({ char: ch, strokes: data.stroke_count ?? null });
    } catch {
      results.push({ char: ch, strokes: null });
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

// Grab ALL meanings from Jisho entry.
function extractMeaningChoices(entry: any): string[] {
  const senses = entry?.senses ?? [];
  const choices: string[] = [];

  for (const s of senses) {
    const defs: string[] = s?.english_definitions ?? [];
    const text = defs.join(", ").trim();
    if (text) choices.push(text);
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique = choices.filter((c) => {
    const key = c.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
type BulkItem = {
  surface: string;
  reading: string;
  meaning: string; // chosen meaning (saved as meaning)
  jlpt: string;
  isCommon: boolean;

  meaningChoices: string[];
  meaningChoiceIndex: number;

  page: string;
  chapterNumber: string;
  chapterName: string;

  strokes: { char: string; strokes: number | null }[];
};

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------
export default function BulkVocabPage() {
  const [userBookId, setUserBookId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");

  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [defaultPageNumber, setDefaultPageNumber] = useState("");

  const [rawInput, setRawInput] = useState("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [message, setMessage] = useState<string>("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);

  // ✅ paste pages in order
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

    // Load chapter saved locally
    const saved = localStorage.getItem(`chapter_userBook_${userBookId}`);
    if (saved) {
      try {
        const { number, name } = JSON.parse(saved);
        setChapterNumber(number || "");
        setChapterName(name || "");
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
        number: chapterNumber,
        name: chapterName,
      })
    );
  }, [chapterNumber, chapterName, userBookId]);

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
        let meaningChoiceIndex = 0;
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

        const strokes = await getStrokeData(w);

        results.push({
          surface: w,
          reading,
          meaning,
          jlpt,
          isCommon,

          meaningChoices,
          meaningChoiceIndex,

          page: defaultPageNumber || "",
          chapterNumber: chapterNumber || "",
          chapterName: chapterName || "",

          strokes,
        });
      }

      setItems(results);
      setMessage("✅ Preview ready! Pick the meaning (definition #) if needed, then Save All.");
      setPagePaste("");
    } catch (err: any) {
      console.error(err);
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

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const payload = items.map((i) => {
        const chosen =
          i.meaningChoices?.length && Number.isFinite(i.meaningChoiceIndex)
            ? i.meaningChoices[i.meaningChoiceIndex] ?? i.meaning
            : i.meaning;

        return {
          user_book_id: userBookId,
          surface: i.surface,
          reading: i.reading || null,
          meaning: chosen || null,
          meaning_choices: i.meaningChoices ?? [],
          meaning_choice_index: Number.isFinite(i.meaningChoiceIndex) ? i.meaningChoiceIndex : 0,
          jlpt: normalizeJlpt(i.jlpt),
          is_common: !!i.isCommon,
          page_number: i.page ? Number(i.page) : null,
          chapter_number: i.chapterNumber ? Number(i.chapterNumber) : null,
          chapter_name: i.chapterName || null,
          strokes: i.strokes ?? [],
          seen_on: today,
        };
      });

      const { error } = await supabase
        .from("user_book_words")
        .upsert(payload, { onConflict: "user_book_id,surface,page_number,seen_on" });

      if (error) throw error;

      setMessage(`✅ Saved ${payload.length} words!`);
      setSaveComplete(true);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Failed saving: ${err?.message ?? "unknown error"}`);
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

  function chooseMeaning(index: number, newIndex: number) {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[index];
      const choices = item.meaningChoices ?? [];
      const chosen = choices[newIndex] ?? "";

      copy[index] = {
        ...item,
        meaningChoiceIndex: newIndex,
        meaning: chosen || item.meaning,
      };
      return copy;
    });
  }

  // ✅ NEW: Add More Words button should be next to Save All (top),
  // and simply reset the form without scrolling.
  function resetForMore() {
    setRawInput("");
    setItems([]);
    setPagePaste("");
    setMessage("");
    setSaveComplete(false);
  }

  // -------------------------------------------------------------
  // UI
  // -------------------------------------------------------------
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">🧺 Add Vocabulary</h1>

      {bookTitle ? (
        <div className="flex items-center gap-3 mb-4">
          {bookCover ? <img src={bookCover} alt="" className="w-12 h-16 rounded object-cover" /> : null}
          <p className="text-sm text-gray-700">
            For book: <span className="font-medium">{bookTitle}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">
          (Tip) Open with <code className="px-1 py-0.5 bg-gray-100 rounded">?userBookId=...</code>
        </p>
      )}

      {/* Defaults */}
      <div className="mb-2 text-xs text-gray-500">
        Defaults (optional): you can leave these blank. You can override per word in the preview.
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input
          type="number"
          value={defaultPageNumber}
          onChange={(e) => setDefaultPageNumber(e.target.value)}
          placeholder="Default page"
          className="border p-2 rounded"
        />
        <input
          type="number"
          value={chapterNumber}
          onChange={(e) => setChapterNumber(e.target.value)}
          placeholder="Chapter number"
          className="border p-2 rounded"
        />
        <input
          type="text"
          value={chapterName}
          onChange={(e) => setChapterName(e.target.value)}
          placeholder="Chapter name"
          className="border p-2 rounded"
        />
      </div>

      {/* Raw Input */}
      <form onSubmit={handlePreview} className="flex flex-col gap-3 mb-6">
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          rows={8}
          className="border p-2 rounded font-mono text-sm"
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

          {/* ✅ NEW: Add More Words appears NEXT to Save All when saveComplete */}
          {saveComplete ? (
            <button
              type="button"
              onClick={resetForMore}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              title="Clear the preview and start a new batch"
            >
              ➕ Add More Words
            </button>
          ) : null}
        </div>
      </form>

      {message ? (
        <div className="mb-4 text-sm">
          {message.startsWith("❌") ? (
            <p className="text-red-700">{message}</p>
          ) : (
            <p className="text-gray-700">{message}</p>
          )}
        </div>
      ) : null}

      {/* Preview */}
      {items.length > 0 && (
        <>
          {/* Paste pages block */}
          <div className="mb-4 border rounded p-3 bg-white">
            <div className="text-sm font-medium mb-1">Paste page numbers (optional)</div>
            <p className="text-xs text-gray-500 mb-2">
              Paste one per line (or copied from a spreadsheet). They’ll be applied to the preview list in order.
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

          <h2 className="text-xl font-medium mb-3">Preview ({items.length})</h2>

          <ul className="space-y-3">
            {items.map((i, idx) => (
              <li key={`${i.surface}_${idx}`} className="border p-3 rounded bg-white shadow-sm">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <span className="font-semibold text-lg">{i.surface}</span>

                  <div className="flex gap-2">
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

                  {/* Definition picker */}
                  {i.meaningChoices?.length ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Definition: {i.meaningChoiceIndex + 1}/{i.meaningChoices.length}
                        </span>

                        <select
                          value={i.meaningChoiceIndex}
                          onChange={(e) => chooseMeaning(idx, Number(e.target.value))}
                          className="border p-1 rounded text-xs bg-white"
                          title="Pick which Jisho definition to save as Meaning"
                        >
                          {i.meaningChoices.map((m, mi) => (
                            <option key={mi} value={mi}>
                              {mi + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      <textarea
                        rows={2}
                        value={i.meaning}
                        onChange={(e) => updateItem(idx, "meaning", e.target.value)}
                        className="border p-2 rounded w-full text-sm"
                        placeholder="Meaning"
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
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{normalizeJlpt(i.jlpt)}</span>

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

                  {i.strokes?.length ? (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                      {i.strokes.map((s) => `${s.char}:${s.strokes ?? "?"}`).join(" / ")} strokes
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}