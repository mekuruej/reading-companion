// Teacher Book Prep Add
//
// Bulk Add-style teacher prep flow. Final save writes to teacher_book_items only;
// it does not create user_books, user_book_words, sessions, stats, or study progress.

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ItemType = "word" | "phrase" | "grammar" | "sentence" | "note";
type PrepStep = "paste" | "definitions" | "details" | "done";

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
};

type TeacherBookRow = {
  id: string;
  teacher_id: string;
  book_id: string;
  books: BookMeta | BookMeta[] | null;
};

type TeacherBookItem = {
  id: string;
  item_type: ItemType;
  surface_text: string | null;
  reading: string | null;
  meaning: string | null;
  vocabulary_cache_id?: number | null;
  page_number: number | null;
  chapter_number?: number | null;
  chapter_name: string | null;
  teacher_note: string | null;
  explanation: string | null;
  translation: string | null;
  created_at: string | null;
};

type PrepItemDraft = {
  itemType: ItemType;
  surfaceText: string;
  reading: string;
  meaning: string;
  meaningChoices: string[];
  meaningChoiceIndex: number | null;
  vocabularyCacheId: number | null;
  page: string;
  chapterNumber: string;
  chapterName: string;
  teacherNote: string;
  explanation: string;
  translation: string;
};

const itemTypes: ItemType[] = ["word", "phrase", "grammar", "sentence", "note"];

function isTeacherRole(profile: any) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

function firstBook(book: TeacherBookRow["books"]) {
  if (Array.isArray(book)) return book[0] ?? null;
  return book ?? null;
}

function itemTypeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseItems(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
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

function extractMeaningChoices(entry: any): string[] {
  const choices: string[] = [];
  for (const sense of entry?.senses ?? []) {
    const text = (sense?.english_definitions ?? []).join("; ").trim();
    if (text) choices.push(text);
  }

  const seen = new Set<string>();
  return choices.filter((choice) => {
    const key = choice.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : null;
}

function cleanNullable(value: string) {
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function blankDraft(surfaceText: string, defaultType: ItemType): PrepItemDraft {
  return {
    itemType: defaultType,
    surfaceText,
    reading: "",
    meaning: "",
    meaningChoices: [],
    meaningChoiceIndex: null,
    vocabularyCacheId: null,
    page: "",
    chapterNumber: "",
    chapterName: "",
    teacherNote: "",
    explanation: "",
    translation: "",
  };
}

export default function TeacherBookPrepPage() {
  const params = useParams<{ teacherBookId: string }>();
  const teacherBookId = params.teacherBookId;

  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [teacherBook, setTeacherBook] = useState<TeacherBookRow | null>(null);
  const [savedItems, setSavedItems] = useState<TeacherBookItem[]>([]);
  const [message, setMessage] = useState("");

  const [step, setStep] = useState<PrepStep>("paste");
  const [defaultItemType, setDefaultItemType] = useState<ItemType>("word");
  const [rawInput, setRawInput] = useState("");
  const [drafts, setDrafts] = useState<PrepItemDraft[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [bulkPageNumber, setBulkPageNumber] = useState("");
  const [bulkChapterNumber, setBulkChapterNumber] = useState("");
  const [bulkChapterName, setBulkChapterName] = useState("");

  const itemCount = useMemo(() => parseItems(rawInput).length, [rawInput]);

  useEffect(() => {
    void loadTeacherBook();
  }, [teacherBookId]);

  async function loadTeacherBook() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        setCanAccess(false);
        setTeacherBook(null);
        setSavedItems([]);
        setMessage("Please sign in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!isTeacherRole(profile)) {
        setCanAccess(false);
        setTeacherBook(null);
        setSavedItems([]);
        setMessage("Teacher access is required.");
        return;
      }

      const { data: teacherBookRow, error: teacherBookError } = await supabase
        .from("teacher_books")
        .select(
          `
          id,
          teacher_id,
          book_id,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            book_type
          )
        `
        )
        .eq("id", teacherBookId)
        .maybeSingle();

      if (teacherBookError) throw teacherBookError;

      if (!teacherBookRow) {
        setCanAccess(false);
        setTeacherBook(null);
        setSavedItems([]);
        setMessage("This teacher book could not be found.");
        return;
      }

      const { data: itemRows, error: itemsError } = await supabase
        .from("teacher_book_items")
        .select(
          "id, item_type, surface_text, reading, meaning, vocabulary_cache_id, page_number, chapter_number, chapter_name, teacher_note, explanation, translation, created_at"
        )
        .eq("teacher_book_id", teacherBookId)
        .order("page_number", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      setCanAccess(true);
      setTeacherBook(teacherBookRow as TeacherBookRow);
      setSavedItems((itemRows ?? []) as TeacherBookItem[]);
    } catch (error: any) {
      console.error("Error loading teacher book prep:", error);
      setMessage(error?.message ?? "Could not load teacher book prep.");
      setTeacherBook(null);
      setSavedItems([]);
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(index: number, patch: Partial<PrepItemDraft>) {
    setDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function chooseMeaning(index: number, rawValue: string) {
    const draft = drafts[index];
    if (!draft) return;

    if (rawValue === "other") {
      updateDraft(index, { meaningChoiceIndex: null, meaning: "" });
      return;
    }

    const nextIndex = Number(rawValue);
    const choice = draft.meaningChoices[nextIndex] ?? "";
    updateDraft(index, {
      meaningChoiceIndex: Number.isFinite(nextIndex) ? nextIndex : 0,
      meaning: choice,
    });
  }

  async function handlePreview(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    const rawItems = parseItems(rawInput);
    if (rawItems.length === 0) {
      setMessage("Paste at least one prep item.");
      return;
    }

    setIsPreviewing(true);

    try {
      const nextDrafts: PrepItemDraft[] = [];

      for (const raw of rawItems) {
        const draft = blankDraft(raw, defaultItemType);

        if (["word", "phrase"].includes(defaultItemType)) {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            const response = await fetch(`/api/jisho?keyword=${encodeURIComponent(raw)}`, {
              headers: session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : undefined,
            });

            if (response.ok) {
              const data = await response.json();
              const entry = data?.data?.[0];
              if (entry) {
                const choices = extractMeaningChoices(entry);
                draft.reading = entry.japanese?.[0]?.reading || "";
                draft.meaningChoices = choices;
                draft.meaningChoiceIndex = choices.length ? 0 : null;
                draft.meaning = choices[0] || "";
                normalizeJlpt(entry.jlpt?.[0] || "");
              }
            }
          } catch {
            // Jisho lookup is helpful, but teacher prep items can be saved manually.
          }
        }

        nextDrafts.push(draft);
      }

      setDrafts(nextDrafts);
      setRawInput("");
      setStep("definitions");
      setMessage("Step 1 complete. Check definitions and teaching support fields.");
    } finally {
      setIsPreviewing(false);
    }
  }

  function handleSaveDefinitions() {
    setStep("details");
    setMessage("Definitions and support fields saved for this batch. Add page and chapter info.");
  }

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
    setDrafts((prev) =>
      prev.map((draft) => {
        const current = draft[field].trim();
        if (mode === "blank" && current) return draft;
        changed += 1;
        return { ...draft, [field]: value };
      })
    );

    setMessage(`Applied to ${changed} item${changed === 1 ? "" : "s"}.`);
  }

  async function handleSaveAll() {
    if (drafts.length === 0) return;

    setIsSaving(true);
    setMessage("Saving prep items...");

    try {
      const payload = [];

      for (const draft of drafts) {
        payload.push({
          teacher_book_id: teacherBookId,
          item_type: draft.itemType,
          surface_text: cleanNullable(draft.surfaceText),
          reading: cleanNullable(draft.reading),
          meaning: cleanNullable(draft.meaning),
          vocabulary_cache_id: draft.vocabularyCacheId,
          page_number: toNullableInt(draft.page),
          chapter_number: toNullableInt(draft.chapterNumber),
          chapter_name: cleanNullable(draft.chapterName),
          teacher_note: cleanNullable(draft.teacherNote),
          explanation: cleanNullable(draft.explanation),
          translation: cleanNullable(draft.translation),
        });
      }

      const { error } = await supabase.from("teacher_book_items").insert(payload);
      if (error) throw error;

      setStep("done");
      setMessage(`Saved ${payload.length} teacher prep item${payload.length === 1 ? "" : "s"}.`);
      await loadTeacherBook();
    } catch (error: any) {
      console.error("Error saving teacher prep items:", error);
      setMessage(error?.message ?? "Could not save teacher prep items.");
    } finally {
      setIsSaving(false);
    }
  }

  function resetForMore() {
    setStep("paste");
    setDrafts([]);
    setRawInput("");
    setMessage("");
  }

  const book = firstBook(teacherBook?.books ?? null);

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap gap-3">
          <Link href="/teacher/library" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            &larr; Teacher Library
          </Link>
          {teacherBook ? (
            <Link
              href={`/teacher/library/${teacherBookId}/follow`}
              className="text-sm font-semibold text-stone-500 hover:text-stone-900"
            >
              Follow-Along
            </Link>
          ) : null}
        </div>

        <h1 className="mt-4 text-2xl font-semibold text-stone-900">Prep Add</h1>

        {loading ? (
          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
            Loading teacher book...
          </section>
        ) : !canAccess || !teacherBook ? (
          <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {message || "Teacher access is required."}
          </section>
        ) : (
          <>
            <div className="mb-4 mt-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex min-w-0 items-center gap-4">
                {book?.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
                  />
                ) : (
                  <div className="h-20 w-14 shrink-0 rounded-md bg-stone-200" />
                )}

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-stone-500">For teaching book</p>
                  <div className="truncate text-base font-semibold text-stone-900">
                    {book?.title ?? "Untitled book"}
                  </div>
                  {book?.author ? (
                    <p className="truncate text-sm text-stone-500">{book.author}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                {step === "done" ? (
                  <button
                    type="button"
                    onClick={resetForMore}
                    className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
                  >
                    Add More Items
                  </button>
                ) : null}

                <Link
                  href={`/teacher/library/${teacherBookId}/follow`}
                  className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  Follow-Along
                </Link>
              </div>
            </div>

            {message ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {message}
              </div>
            ) : null}

            {step === "paste" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  Step 1
                </p>
                <h2 className="mt-1 text-xl font-black text-stone-900">
                  Enter prep items
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Enter one item per line. Use word/phrase for dictionary lookup; grammar,
                  sentence, and note can be filled manually in the next step.
                </p>

                <form onSubmit={handlePreview} className="mt-4 space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold text-stone-500">
                      Default item type
                    </span>
                    <select
                      value={defaultItemType}
                      onChange={(event) => setDefaultItemType(event.target.value as ItemType)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 sm:w-64"
                    >
                      {itemTypes.map((type) => (
                        <option key={type} value={type}>
                          {itemTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <textarea
                    value={rawInput}
                    onChange={(event) => setRawInput(event.target.value)}
                    rows={10}
                    placeholder={"知らない言葉\n重要な文\n〜てしまう"}
                    className="w-full rounded-2xl border border-stone-300 bg-white p-4 text-sm"
                  />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-stone-500">
                      {itemCount} item{itemCount === 1 ? "" : "s"} detected.
                    </p>
                    <button
                      type="submit"
                      disabled={isPreviewing}
                      className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
                    >
                      {isPreviewing ? "Checking..." : "Check Items"}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}

            {step === "definitions" ? (
              <>
                <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Step 2
                  </p>
                  <h2 className="mt-1 text-xl font-black text-stone-900">
                    Check definitions and support fields
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Choose dictionary definitions where useful, then add teacher notes,
                    explanations, and translations.
                  </p>
                </section>

                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handleSaveDefinitions}
                    className="w-full rounded-2xl border border-emerald-700 bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    Save Definitions
                  </button>
                </div>

                <ul className="space-y-3">
                  {drafts.map((draft, index) => (
                    <li key={`${draft.surfaceText}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-lg font-semibold">{draft.surfaceText}</div>
                        <select
                          value={draft.itemType}
                          onChange={(event) => updateDraft(index, { itemType: event.target.value as ItemType })}
                          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                        >
                          {itemTypes.map((type) => (
                            <option key={type} value={type}>
                              {itemTypeLabel(type)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-gray-500">Reading</span>
                          <input
                            value={draft.reading}
                            onChange={(event) => updateDraft(index, { reading: event.target.value })}
                            className="w-full rounded border p-2 text-sm"
                          />
                        </label>

                        <label className="text-sm md:col-span-2">
                          <span className="mb-1 block text-xs text-gray-500">Definition #</span>
                          <div className="flex flex-col gap-3 md:flex-row">
                            <select
                              value={draft.meaningChoiceIndex == null ? "other" : String(draft.meaningChoiceIndex)}
                              onChange={(event) => chooseMeaning(index, event.target.value)}
                              className="w-full rounded border bg-white px-3 py-2 text-sm md:w-40"
                            >
                              {draft.meaningChoices.map((_, choiceIndex) => (
                                <option key={choiceIndex} value={choiceIndex}>
                                  Def {choiceIndex + 1}
                                </option>
                              ))}
                              <option value="other">Other</option>
                            </select>
                            <textarea
                              value={draft.meaning}
                              onChange={(event) => updateDraft(index, { meaning: event.target.value, meaningChoiceIndex: null })}
                              rows={2}
                              className="w-full rounded border bg-white p-2 text-sm"
                              placeholder="Meaning or teaching definition"
                            />
                          </div>
                        </label>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-gray-500">Teacher note</span>
                          <textarea
                            value={draft.teacherNote}
                            onChange={(event) => updateDraft(index, { teacherNote: event.target.value })}
                            rows={4}
                            className="w-full rounded border bg-white p-2 text-sm"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-gray-500">Explanation</span>
                          <textarea
                            value={draft.explanation}
                            onChange={(event) => updateDraft(index, { explanation: event.target.value })}
                            rows={4}
                            className="w-full rounded border bg-white p-2 text-sm"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-gray-500">Translation</span>
                          <textarea
                            value={draft.translation}
                            onChange={(event) => updateDraft(index, { translation: event.target.value })}
                            rows={4}
                            className="w-full rounded border bg-white p-2 text-sm"
                          />
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleSaveDefinitions}
                    className="w-full rounded-2xl border border-emerald-700 bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    Save Definitions
                  </button>
                </div>
              </>
            ) : null}

            {step === "details" ? (
              <>
                <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Step 3
                  </p>
                  <h2 className="mt-1 text-xl font-black text-stone-900">
                    Add page and chapter info
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Match regular Bulk Add rhythm: apply shared location details or edit each row.
                  </p>
                </section>

                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => void handleSaveAll()}
                    disabled={isSaving}
                    className="w-full rounded-2xl border border-emerald-700 bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save All"}
                  </button>
                </div>

                <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-base font-black text-stone-900">Apply fields</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {[
                      ["page", bulkPageNumber, setBulkPageNumber, "Page"],
                      ["chapterNumber", bulkChapterNumber, setBulkChapterNumber, "Chapter #"],
                      ["chapterName", bulkChapterName, setBulkChapterName, "Chapter Name"],
                    ].map(([field, value, setter, label]) => (
                      <label key={field as string} className="text-sm">
                        <span className="mb-1 block text-xs text-gray-500">{label as string}</span>
                        <input
                          value={value as string}
                          onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                          className="w-full rounded border p-2 text-sm"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => applyBulkField(field as any, value as string, "blank")}
                            className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-700"
                          >
                            Fill blanks
                          </button>
                          <button
                            type="button"
                            onClick={() => applyBulkField(field as any, value as string, "all")}
                            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700"
                          >
                            Apply all
                          </button>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                <ul className="space-y-3">
                  {drafts.map((draft, index) => (
                    <li key={`${draft.surfaceText}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 text-lg font-semibold">{draft.surfaceText}</div>
                      <div className="mb-2 text-sm text-gray-600">
                        {itemTypeLabel(draft.itemType)} · {draft.reading || "—"} · {draft.meaning || "—"}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-gray-500">Page</span>
                          <input
                            value={draft.page}
                            onChange={(event) => updateDraft(index, { page: event.target.value })}
                            className="w-full rounded border p-2 text-sm"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-gray-500">Chapter #</span>
                          <input
                            value={draft.chapterNumber}
                            onChange={(event) => updateDraft(index, { chapterNumber: event.target.value })}
                            className="w-full rounded border p-2 text-sm"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-gray-500">Chapter Name</span>
                          <input
                            value={draft.chapterName}
                            onChange={(event) => updateDraft(index, { chapterName: event.target.value })}
                            className="w-full rounded border p-2 text-sm"
                          />
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => void handleSaveAll()}
                    disabled={isSaving}
                    className="w-full rounded-2xl border border-emerald-700 bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save All"}
                  </button>
                </div>
              </>
            ) : null}

            {step === "done" ? (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-sm">
                <h2 className="text-xl font-black">Prep items saved.</h2>
                <p className="mt-2 text-sm">
                  These items are available in Teacher Follow-Along and did not affect learner reading data.
                </p>
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="text-xl font-black text-stone-900">Saved prep items</h2>
              {savedItems.length === 0 ? (
                <div className="mt-3 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
                  No prep items yet.
                </div>
              ) : (
                <div className="mt-3 grid gap-3">
                  {savedItems.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                          {itemTypeLabel(item.item_type)}
                        </span>
                        {item.page_number != null ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                            Page {item.page_number}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-xl font-black text-stone-900">{item.surface_text || "Teaching note"}</h3>
                      {item.reading ? <p className="mt-1 text-sm text-stone-500">{item.reading}</p> : null}
                      {item.meaning ? <p className="mt-1 text-sm text-stone-700">{item.meaning}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
