// Bulk Add Page
// 
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

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
type BulkItem = {
  surface: string;
  reading: string;
  meaning: string;
  jlpt: string;
  isCommon: boolean;

  meaningChoices: string[];
  meaningChoiceIndex: number | null;

  page: string;
  chapterNumber: string;
  chapterName: string;
  hideKanjiInReadingSupport: boolean;

  kanjiMeta: { kanji: string; strokes: number | null }[];
};

type BulkStep = "paste" | "definitions" | "details" | "done";

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------
export default function BulkVocabPage() {
  const router = useRouter();

  const [userBookId, setUserBookId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");

  const [step, setStep] = useState<BulkStep>("paste");

  const [bulkPageNumber, setBulkPageNumber] = useState("");
  const [bulkChapterNumber, setBulkChapterNumber] = useState("");
  const [bulkChapterName, setBulkChapterName] = useState("");

  const [bulkPageList, setBulkPageList] = useState("");
  const [bulkChapterNumberList, setBulkChapterNumberList] = useState("");
  const [bulkChapterNameList, setBulkChapterNameList] = useState("");

  const [rawInput, setRawInput] = useState("");
  const [items, setItems] = useState<BulkItem[]>([]);

  const [message, setMessage] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const wordCount = useMemo(() => parseWords(rawInput).length, [rawInput]);

  const [recentAction, setRecentAction] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Get userBookId from URL
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("userBookId") || "";
    setUserBookId(id);
  }, []);

  // -------------------------------------------------------------
  // Load book info
  // -------------------------------------------------------------
  useEffect(() => {
    if (!userBookId) return;

    const saved = localStorage.getItem(`chapter_userBook_${userBookId}`);
    if (saved) {
      try {
        const { number, name } = JSON.parse(saved);
        setBulkChapterNumber(number || "");
        setBulkChapterName(name || "");
      } catch { }
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
        setMessage(`❌ Could not load book info: ${error.message}`);
        return;
      }

      const b = (data as any)?.books;
      setBookTitle(b?.title ?? "");
      setBookCover(b?.cover_url ?? "");
    })();
  }, [userBookId]);

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
  // Helpers
  // -------------------------------------------------------------
  function flashAction(actionKey: string) {
    setRecentAction(actionKey);
    window.setTimeout(() => {
      setRecentAction((current) => (current === actionKey ? null : current));
    }, 1200);
  }
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
        meaning: chosen,
      };
      return copy;
    });
  }

  function applyBulkField(
    field: "page" | "chapterNumber" | "chapterName",
    value: string,
    mode: "blank" | "all",
    actionKey?: string
  ): void {
    const trimmed = value.trim();
    if (!trimmed) {
      setMessage("Fill in a value first.");
      return;
    }

    let changed = 0;

    const nextItems = items.map((item) => {
      const currentValue = (item[field] ?? "").toString().trim();
      const shouldUpdate = mode === "all" || currentValue === "";

      if (!shouldUpdate) return item;

      changed += 1;
      return {
        ...item,
        [field]: value,
      };
    });

    setItems(nextItems);

    if (changed === 0) {
      setMessage("No rows were updated.");
      return;
    }

    if (actionKey) {
      flashAction(actionKey);
    }

    const label =
      field === "page"
        ? "page number"
        : field === "chapterNumber"
          ? "chapter number"
          : "chapter name";

    setMessage(
      `✅ Applied ${label} to ${changed} row${changed === 1 ? "" : "s"}.`
    );
  }

  function parseColumnLines(raw: string): string[] {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  function applyBulkColumnList(
    field: "page" | "chapterNumber" | "chapterName",
    raw: string,
    actionKey?: string
  ): void {
    const lines = parseColumnLines(raw);

    if (lines.length === 0) {
      setMessage("Paste at least one line first.");
      return;
    }

    let changed = 0;

    const nextItems = items.map((item, index) => {
      const nextValue = lines[index];
      if (nextValue == null) return item;

      changed += 1;
      return {
        ...item,
        [field]: nextValue,
      };
    });

    setItems(nextItems);

    if (changed === 0) {
      setMessage("No rows were updated.");
      return;
    }

    if (actionKey) {
      flashAction(actionKey);
    }

    const label =
      field === "page"
        ? "page number"
        : field === "chapterNumber"
          ? "chapter number"
          : "chapter name";

    setMessage(
      `✅ Applied pasted ${label} list to ${changed} row${changed === 1 ? "" : "s"}.`
    );
  }

  function getIncompleteWordLabels() {
    return items
      .filter((i) => !i.reading.trim() || !i.meaning.trim())
      .map((i) => i.surface.trim() || "(blank word)");
  }

  function resetForMore() {
    setRawInput("");
    setItems([]);
    setMessage("");
    setStep("paste");
    setBulkPageList("");
    setBulkChapterNumberList("");
    setBulkChapterNameList("");
  }

  function goToVocabList() {
    if (!userBookId) return;
    router.push(`/books/${encodeURIComponent(userBookId)}/words`);
  }

  // -------------------------------------------------------------
  // Step 1: Preview
  // -------------------------------------------------------------
  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!userBookId) {
      setMessage("❌ Missing userBookId.");
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
              meaningChoiceIndex = meaningChoices.length ? 0 : null;
              meaning = meaningChoices[0] || "";
            }
          }
        } catch { }

        const kanjiMeta = await getStrokeData(w);

        results.push({
          surface: w,
          reading,
          meaning,
          jlpt,
          isCommon,
          meaningChoices,
          meaningChoiceIndex,
          page: "",
          chapterNumber: "",
          chapterName: "",
          hideKanjiInReadingSupport: false,
          kanjiMeta,
        });
      }

      setItems(results);
      setRawInput("");
      setStep("definitions");
      setMessage("✅ Step 1 complete. Check the definitions, then save definitions to move on.");
    } catch (err: any) {
      console.error("PREVIEW ERROR:", err);
      setMessage(`❌ Error generating preview: ${err?.message ?? "unknown error"}`);
    } finally {
      setIsPreviewing(false);
    }
  }

  // -------------------------------------------------------------
  // Step 2: Save definitions locally and move to details
  // -------------------------------------------------------------
  function handleSaveDefinitions() {
    const missingWords = getIncompleteWordLabels();
    const missingCount = missingWords.length;

    if (missingCount > 0) {
      const confirmed = window.confirm(
        `${missingCount} word${missingCount === 1 ? "" : "s"} ${missingCount === 1 ? "is" : "are"
        } missing a reading or definition.\n\n` +
        `Words:\n- ${missingWords.join("\n- ")}\n\n` +
        `Do you want to continue anyway?`
      );
      if (!confirmed) return;
    }

    setStep("details");
    setMessage("✅ Definitions saved for this batch. Now add page and chapter info.");
  }

  // -------------------------------------------------------------
  // Step 3: Save ALL to DB
  // -------------------------------------------------------------
  async function handleSaveAll() {
    setMessage("");

    if (!userBookId || items.length === 0) return;

    const incompleteWords = getIncompleteWordLabels();

    if (incompleteWords.length > 0) {
      const confirmed = window.confirm(
        `${incompleteWords.length} word${incompleteWords.length === 1 ? "" : "s"} ${incompleteWords.length === 1 ? "is" : "are"
        } missing a reading or definition.\n\n` +
        `Words:\n- ${incompleteWords.join("\n- ")}\n\n` +
        `Do you want to save anyway?`
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

        if (chNum == null) query = query.is("chapter_number", null);
        else query = query.eq("chapter_number", chNum);

        if (pgNum == null) query = query.is("page_number", null);
        else query = query.eq("page_number", pgNum);

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

        return {
          user_book_id: userBookId,
          surface: i.surface,
          reading: i.reading || null,
          meaning: i.meaning?.trim() || null,
          other_definition: i.meaningChoiceIndex == null ? i.meaning?.trim() || null : null,
          meaning_choices: i.meaningChoices ?? [],
          meaning_choice_index: i.meaningChoiceIndex,
          jlpt: normalizeJlpt(i.jlpt),
          is_common: !!i.isCommon,
          page_number: pgNum,
          page_order: nextPageOrder,
          chapter_number: chNum,
          chapter_name: i.chapterName?.trim() || null,
          hide_kanji_in_reading_support: i.hideKanjiInReadingSupport,
          kanji_meta: i.kanjiMeta ?? [],
          seen_on: today,
        };
      });

      const { error } = await supabase.from("user_book_words").upsert(payload);

      if (error) throw error;

      setStep("done");
      setMessage(`✅ Saved ${payload.length} words!`);
    } catch (err: any) {
      console.error("SAVE ALL ERROR:", JSON.stringify(err, null, 2), err);
      setMessage(
        `❌ Failed saving: ${err?.message ||
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
  // UI helpers
  // -------------------------------------------------------------
  function SaveBar({
    label,
    onClick,
    disabled = false,
  }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
        >
          {label}
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // UI
  // -------------------------------------------------------------
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-semibold">🧺 Add Vocabulary in Bulk</h1>

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
          <p className="mb-6 text-sm text-gray-500">
            Open with <code className="rounded bg-gray-100 px-1 py-0.5">?userBookId=...</code>
          </p>
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

        {step === "paste" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-lg font-medium">Step 1 — Paste Words</div>
            <p className="mb-3 text-sm text-gray-500">
              Paste one word per line or comma-separated, then preview them.
            </p>

            <form onSubmit={handlePreview} className="flex flex-col gap-3">
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={8}
                className="rounded border bg-white p-3 font-mono text-sm"
                placeholder={`Paste one per line (or comma-separated)\n\n生意気\nメンヘラ\n都市伝説`}
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  disabled={isPreviewing}
                  className="rounded bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {isPreviewing ? "Loading…" : `Preview Words${wordCount ? ` (${wordCount})` : ""}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "definitions" && (
          <>
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-1 text-lg font-medium">Step 2 — Check Definitions</div>
              <p className="text-sm text-gray-500">
                Choose the best definition number for each word. Use Other if needed.
              </p>
            </div>

            <div className="mb-4">
              <SaveBar label="Save Definitions" onClick={handleSaveDefinitions} />
            </div>

            <ul className="space-y-3">
              {items.map((i, idx) => (
                <li
                  key={`${i.surface}_${idx}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 text-lg font-semibold">{i.surface}</div>

                  <div className="grid gap-3">
                    <div>
                      <div className="mb-1 text-xs text-gray-500">Reading</div>
                      <input
                        value={i.reading}
                        onChange={(e) => updateItem(idx, "reading", e.target.value)}
                        className="w-full rounded border p-2 text-sm"
                        placeholder="Reading"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-xs text-gray-500">Definition #</div>
                      <div className="flex flex-col gap-3 md:flex-row">
                        <select
                          value={i.meaningChoiceIndex == null ? "other" : String(i.meaningChoiceIndex)}
                          onChange={(e) => chooseMeaning(idx, e.target.value)}
                          className="w-full rounded border bg-white px-3 py-2 text-sm md:w-40"
                        >
                          {i.meaningChoices.map((_, mi) => (
                            <option key={mi} value={mi}>
                              {`Def ${mi + 1}`}
                            </option>
                          ))}
                          <option value="other">Other</option>
                        </select>

                        <textarea
                          rows={2}
                          value={i.meaning}
                          onChange={(e) => updateItem(idx, "meaning", e.target.value)}
                          readOnly={i.meaningChoiceIndex != null}
                          className={`w-full rounded border p-2 text-sm ${i.meaningChoiceIndex == null
                            ? "bg-white"
                            : "bg-slate-100 text-slate-700"
                            }`}
                          placeholder={
                            i.meaningChoiceIndex == null
                              ? "Type your custom meaning"
                              : "Meaning"
                          }
                        />
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        Choose Other to write your own definition.
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <SaveBar label="Save Definitions" onClick={handleSaveDefinitions} />
            </div>
          </>
        )}

        {step === "details" && (
          <>
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-1 text-lg font-medium">Step 3 — Add Page and Chapter Info</div>
              <p className="text-sm text-gray-500">
                Use the bulk tools or edit row by row, then save everything.
              </p>
            </div>

            <div className="mb-4">
              <SaveBar
                label={isSaving ? "Saving…" : "Save All"}
                onClick={handleSaveAll}
                disabled={isSaving}
              />
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="space-y-4">
                <div className="grid items-center gap-3 md:grid-cols-[160px_520px_auto]">
                  <div className="text-sm font-medium text-gray-700">Page number</div>
                  <input
                    type="number"
                    value={bulkPageNumber}
                    onChange={(e) => setBulkPageNumber(e.target.value)}
                    placeholder="e.g. 45"
                    className="rounded border p-2"
                  />
                  <button
                    type="button"
                    onClick={() => applyBulkField("page", bulkPageNumber, "all", "page-all")}
                    className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                  >
                    {recentAction === "page-all" ? "Added!" : "Apply to all"}
                  </button>
                </div>

                <div className="grid items-center gap-3 md:grid-cols-[160px_520px_auto]">
                  <div className="text-sm font-medium text-gray-700">Chapter number</div>
                  <input
                    type="number"
                    value={bulkChapterNumber}
                    onChange={(e) => setBulkChapterNumber(e.target.value)}
                    placeholder="e.g. 3"
                    className="rounded border p-2"
                  />
                  <button
                    type="button"
                    onClick={() => applyBulkField("chapterNumber", bulkChapterNumber, "all", "chapter-number-all")}
                    className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                  >
                    {recentAction === "chapter-number-all" ? "Added!" : "Apply to all"}
                  </button>
                </div>

                <div className="grid items-center gap-3 md:grid-cols-[160px_520px_auto]">
                  <div className="text-sm font-medium text-gray-700">Chapter name</div>
                  <input
                    type="text"
                    value={bulkChapterName}
                    onChange={(e) => setBulkChapterName(e.target.value)}
                    placeholder="e.g. Summer Festival"
                    className="rounded border p-2"
                  />
                  <button
                    type="button"
                    onClick={() => applyBulkField("chapterName", bulkChapterName, "all", "chapter-name-all")}
                    className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                  >
                    {recentAction === "chapter-name-all" ? "Added!" : "Apply to all"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-1 text-lg font-medium">Paste Row-by-Row Columns</div>
              <p className="mb-3 text-sm text-gray-500">
                Paste one value per line. Line 1 matches word 1, line 2 matches word 2, and so on.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="mb-1 text-sm font-medium text-gray-700">Page numbers</div>
                  <textarea
                    value={bulkPageList}
                    onChange={(e) => setBulkPageList(e.target.value)}
                    rows={5}
                    placeholder={`45\n46\n46\n47`}
                    className="w-full rounded border p-3 font-mono text-sm"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => applyBulkColumnList("page", bulkPageList, "page-list")}
                      className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                    >
                      {recentAction === "page-list" ? "Added!" : "Apply page list"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-sm font-medium text-gray-700">Chapter numbers</div>
                  <textarea
                    value={bulkChapterNumberList}
                    onChange={(e) => setBulkChapterNumberList(e.target.value)}
                    rows={5}
                    placeholder={`3\n3\n3\n4`}
                    className="w-full rounded border p-3 font-mono text-sm"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => applyBulkColumnList("chapterNumber", bulkChapterNumberList, "chapter-number-list")}
                      className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                    >
                      {recentAction === "chapter-number-list" ? "Added!" : "Apply chapter # list"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-sm font-medium text-gray-700">Chapter names</div>
                  <textarea
                    value={bulkChapterNameList}
                    onChange={(e) => setBulkChapterNameList(e.target.value)}
                    rows={5}
                    placeholder={`Festival\nFestival\nFestival\nAftermath`}
                    className="w-full rounded border p-3 font-mono text-sm"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => applyBulkColumnList("chapterName", bulkChapterNameList, "chapter-name-list")}
                      className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                    >
                      {recentAction === "chapter-name-list" ? "Added!" : "Apply chapter name list"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <ul className="space-y-3">
              {items.map((i, idx) => (
                <li
                  key={`${i.surface}_${idx}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 font-semibold text-lg">{i.surface}</div>
                  <div className="mb-2 text-sm text-gray-600">
                    {i.reading || "—"} · {i.meaning || "—"}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="mb-1 text-xs text-gray-500">Page</div>
                      <input
                        type="number"
                        placeholder="Page"
                        value={i.page}
                        onChange={(e) => updateItem(idx, "page", e.target.value)}
                        className="w-full rounded border p-2 text-sm"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-xs text-gray-500">Chapter #</div>
                      <input
                        type="number"
                        placeholder="Chapter #"
                        value={i.chapterNumber}
                        onChange={(e) => updateItem(idx, "chapterNumber", e.target.value)}
                        className="w-full rounded border p-2 text-sm"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-xs text-gray-500">Chapter Name</div>
                      <input
                        type="text"
                        placeholder="Chapter name"
                        value={i.chapterName}
                        onChange={(e) => updateItem(idx, "chapterName", e.target.value)}
                        className="w-full rounded border p-2 text-sm"
                      />
                    </div>
                  </div>

                  <label className="mt-3 flex items-start gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={i.hideKanjiInReadingSupport}
                      onChange={(e) =>
                        updateItem(idx, "hideKanjiInReadingSupport", e.target.checked)
                      }
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Hide kanji in Reading Support</span>
                      <span className="block text-xs text-stone-500">
                        Use kana to match the book.
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <SaveBar
                label={isSaving ? "Saving…" : "Save All"}
                onClick={handleSaveAll}
                disabled={isSaving}
              />
            </div>
          </>
        )}

        {step === "done" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-xl font-medium">Done</div>
            <p className="mb-6 text-sm text-gray-600">
              Your words have been saved. Add more words or go to the vocab list.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetForMore}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                ➕ Add More Words
              </button>

              <button
                type="button"
                onClick={goToVocabList}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
              >
                📄 Go to Vocab List
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}