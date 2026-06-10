// Teacher Book Prep Add
//
// Bulk Add-style teacher prep flow. Final save writes to teacher_book_items only;
// it does not create user_books, user_book_words, sessions, stats, or study progress.

"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import TeacherLibraryBookAccessState from "./components/TeacherLibraryBookAccessState";
import TeacherLibraryBookHeader from "./components/TeacherLibraryBookHeader";
import TeacherLibraryBookLoadingState from "./components/TeacherLibraryBookLoadingState";
import TeacherLibraryBookMessageBanner from "./components/TeacherLibraryBookMessageBanner";
import TeacherLibraryBookContextCard from "./components/TeacherLibraryBookContextCard";
import TeacherLibraryBookEmptyState from "./components/TeacherLibraryBookEmptyState";
import TeacherPrepStepHeader from "./components/TeacherPrepStepHeader";
import TeacherPrepSavedItemsHeader from "./components/TeacherPrepSavedItemsHeader";
import TeacherPrepDoneState from "./components/TeacherPrepDoneState";

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

type SavedItemEditDraft = {
  itemType: ItemType;
  surfaceText: string;
  reading: string;
  meaning: string;
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

function compactText(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  return cleaned || "—";
}

function chapterDisplay(item: TeacherBookItem) {
  const numberPart = item.chapter_number == null ? "" : `Ch ${item.chapter_number}`;
  const namePart = (item.chapter_name ?? "").trim();
  if (numberPart && namePart) return `${numberPart} · ${namePart}`;
  return numberPart || namePart || "—";
}

function savedItemSearchText(item: TeacherBookItem) {
  return [
    item.item_type,
    item.surface_text,
    item.reading,
    item.meaning,
    item.teacher_note,
    item.explanation,
    item.translation,
    item.chapter_name,
    item.chapter_number == null ? "" : String(item.chapter_number),
    item.page_number == null ? "" : String(item.page_number),
  ]
    .join(" ")
    .toLowerCase();
}

function editDraftFromItem(item: TeacherBookItem): SavedItemEditDraft {
  return {
    itemType: item.item_type,
    surfaceText: item.surface_text ?? "",
    reading: item.reading ?? "",
    meaning: item.meaning ?? "",
    page: item.page_number == null ? "" : String(item.page_number),
    chapterNumber: item.chapter_number == null ? "" : String(item.chapter_number),
    chapterName: item.chapter_name ?? "",
    teacherNote: item.teacher_note ?? "",
    explanation: item.explanation ?? "",
    translation: item.translation ?? "",
  };
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SavedItemEditDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => new Set());
  const [savedSearch, setSavedSearch] = useState("");
  const [savedPageFilter, setSavedPageFilter] = useState("all");
  const editPanelRef = useRef<HTMLElement | null>(null);

  const itemCount = useMemo(() => parseItems(rawInput).length, [rawInput]);
  const savedPageOptions = useMemo(() => {
    return Array.from(
      new Set(
        savedItems
          .map((item) => item.page_number)
          .filter((page): page is number => page != null)
      )
    ).sort((a, b) => a - b);
  }, [savedItems]);

  const visibleSavedItems = useMemo(() => {
    const query = savedSearch.trim().toLowerCase();
    const pageNumber =
      savedPageFilter === "all" ? null : Number.parseInt(savedPageFilter, 10);

    return savedItems.filter((item) => {
      if (pageNumber != null && item.page_number !== pageNumber) return false;
      if (!query) return true;
      return savedItemSearchText(item).includes(query);
    });
  }, [savedItems, savedSearch, savedPageFilter]);

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

  function startEditItem(item: TeacherBookItem) {
    setEditingItemId(item.id);
    setEditDraft(editDraftFromItem(item));
    setMessage("");
    window.requestAnimationFrame(() => {
      editPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function updateEditDraft(patch: Partial<SavedItemEditDraft>) {
    setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function toggleExpandedItem(itemId: string) {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  async function saveEditedItem() {
    if (!editingItemId || !editDraft) return;

    setEditSaving(true);
    setMessage("Saving prep item...");

    try {
      const payload = {
        item_type: editDraft.itemType,
        surface_text: cleanNullable(editDraft.surfaceText),
        reading: cleanNullable(editDraft.reading),
        meaning: cleanNullable(editDraft.meaning),
        page_number: toNullableInt(editDraft.page),
        chapter_number: toNullableInt(editDraft.chapterNumber),
        chapter_name: cleanNullable(editDraft.chapterName),
        teacher_note: cleanNullable(editDraft.teacherNote),
        explanation: cleanNullable(editDraft.explanation),
        translation: cleanNullable(editDraft.translation),
      };

      const { error } = await supabase
        .from("teacher_book_items")
        .update(payload)
        .eq("id", editingItemId)
        .eq("teacher_book_id", teacherBookId);

      if (error) throw error;

      setEditingItemId(null);
      setEditDraft(null);
      setMessage("Prep item updated.");
      await loadTeacherBook();
    } catch (error: any) {
      console.error("Error updating teacher prep item:", error);
      setMessage(error?.message ?? "Could not update prep item.");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteSavedItem(item: TeacherBookItem) {
    const label = item.surface_text?.trim() || "this prep item";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setDeletingItemId(item.id);
    setMessage("Deleting prep item...");

    try {
      const { error } = await supabase
        .from("teacher_book_items")
        .delete()
        .eq("id", item.id)
        .eq("teacher_book_id", teacherBookId);

      if (error) throw error;

      setSavedItems((prev) => prev.filter((saved) => saved.id !== item.id));
      if (editingItemId === item.id) {
        setEditingItemId(null);
        setEditDraft(null);
      }
      setMessage("Prep item deleted.");
    } catch (error: any) {
      console.error("Error deleting teacher prep item:", error);
      setMessage(error?.message ?? "Could not delete prep item.");
    } finally {
      setDeletingItemId(null);
    }
  }

  const book = firstBook(teacherBook?.books ?? null);
  const isShortStoryBook = book?.book_type === "short_story";
  const chapterNameLabel = isShortStoryBook ? "Story Name" : "Chapter Name";

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <TeacherLibraryBookHeader
          teacherBookId={teacherBookId}
          showFollowLink={!!teacherBook}
        />

        <h1 className="mt-4 text-2xl font-semibold text-stone-900">Prep Add</h1>

        {loading ? (
          <TeacherLibraryBookLoadingState />
        ) : !canAccess || !teacherBook ? (
          <TeacherLibraryBookAccessState message={message} />
        ) : (
          <>
            <TeacherLibraryBookContextCard
              book={book}
              teacherBookId={teacherBookId}
              showAddMore={step === "done"}
              onAddMore={resetForMore}
            />

            <TeacherLibraryBookMessageBanner message={message} />

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
                <TeacherPrepStepHeader
                  className="mb-4"
                  stepLabel="Step 2"
                  title="Check definitions and support fields"
                  description="Choose dictionary definitions where useful, then add teacher notes, explanations, and translations."
                />

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
                <TeacherPrepStepHeader
                  className="mb-4"
                  stepLabel="Step 3"
                  title="Add page and chapter info"
                  description="Match regular Bulk Add rhythm: apply shared location details or edit each row."
                />

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
                      ["chapterName", bulkChapterName, setBulkChapterName, chapterNameLabel],
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
                          <span className="mb-1 block text-xs text-gray-500">{chapterNameLabel}</span>
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

            {step === "done" ? <TeacherPrepDoneState /> : null}

            <section className="mt-8">
              <TeacherPrepSavedItemsHeader
                savedCount={savedItems.length}
                visibleCount={visibleSavedItems.length}
                search={savedSearch}
                onSearchChange={setSavedSearch}
                pageFilter={savedPageFilter}
                onPageFilterChange={setSavedPageFilter}
                pageOptions={savedPageOptions}
              />

              {savedItems.length === 0 ? (
                <TeacherLibraryBookEmptyState message="No prep items yet." />
              ) : visibleSavedItems.length === 0 ? (
                <TeacherLibraryBookEmptyState message="No prep items match those filters." />
              ) : (
                <div className="mt-3 overflow-x-auto rounded border bg-white">
                  <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="w-24 p-2 text-xs font-semibold text-stone-600">
                          Type
                        </th>
                        <th className="w-36 p-2 text-xs font-semibold text-stone-600">
                          Word
                        </th>
                        <th className="w-32 p-2 text-xs font-semibold text-stone-600">
                          Reading
                        </th>
                        <th className="w-56 p-2 text-xs font-semibold text-stone-600">
                          Meaning
                        </th>
                        <th className="w-32 p-2 text-xs font-semibold text-stone-600">
                          Chapter
                        </th>
                        <th className="w-20 p-2 text-xs font-semibold text-stone-600">
                          Page
                        </th>
                        <th className="w-36 p-2 text-xs font-semibold text-stone-600">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleSavedItems.map((item) => {
                        const isExpanded = expandedItemIds.has(item.id);
                        return (
                          <Fragment key={item.id}>
                            <tr className="border-t align-top">
                              <td className="border-t border-stone-100 p-2">
                                <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                                  {itemTypeLabel(item.item_type)}
                                </span>
                              </td>
                              <td className="border-t border-stone-100 p-2 font-medium text-stone-900">
                                {compactText(item.surface_text || "Teaching note")}
                              </td>
                              <td className="border-t border-stone-100 p-2 text-stone-700">
                                {compactText(item.reading)}
                              </td>
                              <td className="border-t border-stone-100 p-2 text-stone-700">
                                <div className="max-w-80 leading-snug">
                                  {compactText(item.meaning)}
                                </div>
                              </td>
                              <td className="border-t border-stone-100 p-2 text-stone-700">
                                {chapterDisplay(item)}
                              </td>
                              <td className="border-t border-stone-100 p-2 text-stone-700">
                                {item.page_number ?? "—"}
                              </td>
                              <td className="border-t border-stone-100 p-2">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEditItem(item)}
                                    className="rounded bg-blue-400 px-2 py-1 text-xs hover:bg-green-500"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteSavedItem(item)}
                                    disabled={deletingItemId === item.id}
                                    className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {deletingItemId === item.id ? "Deleting..." : "Delete"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandedItem(item.id)}
                                    className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                                  >
                                    {isExpanded ? "Hide Details" : "Details"}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded ? (
                              <tr>
                                <td colSpan={7} className="border-t border-stone-100 bg-stone-50 p-3">
                                  <div className="grid gap-3 text-sm md:grid-cols-3">
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                                        Teacher note
                                      </div>
                                      <div className="mt-1 whitespace-pre-wrap leading-6 text-stone-700">
                                        {compactText(item.teacher_note)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                                        Explanation
                                      </div>
                                      <div className="mt-1 whitespace-pre-wrap leading-6 text-stone-700">
                                        {compactText(item.explanation)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                                        Translation
                                      </div>
                                      <div className="mt-1 whitespace-pre-wrap leading-6 text-stone-700">
                                        {compactText(item.translation)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {editingItemId && editDraft ? (
              <section
                ref={editPanelRef}
                className="mt-4 scroll-mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-black text-stone-900">
                      Edit prep item
                    </h2>
                    <p className="mt-1 text-sm text-stone-500">
                      Updates this teacher prep item only. It does not affect learner vocab.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemId(null);
                      setEditDraft(null);
                    }}
                    className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-300"
                  >
                    Cancel
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Type</span>
                    <select
                      value={editDraft.itemType}
                      onChange={(event) =>
                        updateEditDraft({ itemType: event.target.value as ItemType })
                      }
                      className="w-full rounded border bg-white p-2 text-sm"
                    >
                      {itemTypes.map((type) => (
                        <option key={type} value={type}>
                          {itemTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Word / item</span>
                    <input
                      value={editDraft.surfaceText}
                      onChange={(event) => updateEditDraft({ surfaceText: event.target.value })}
                      className="w-full rounded border p-2 text-sm"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Reading</span>
                    <input
                      value={editDraft.reading}
                      onChange={(event) => updateEditDraft({ reading: event.target.value })}
                      className="w-full rounded border p-2 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="text-sm md:col-span-3">
                    <span className="mb-1 block text-xs text-gray-500">Meaning</span>
                    <textarea
                      value={editDraft.meaning}
                      onChange={(event) => updateEditDraft({ meaning: event.target.value })}
                      rows={2}
                      className="w-full rounded border bg-white p-2 text-sm"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Teacher note</span>
                    <textarea
                      value={editDraft.teacherNote}
                      onChange={(event) => updateEditDraft({ teacherNote: event.target.value })}
                      rows={4}
                      className="w-full rounded border bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Explanation</span>
                    <textarea
                      value={editDraft.explanation}
                      onChange={(event) => updateEditDraft({ explanation: event.target.value })}
                      rows={4}
                      className="w-full rounded border bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Translation</span>
                    <textarea
                      value={editDraft.translation}
                      onChange={(event) => updateEditDraft({ translation: event.target.value })}
                      rows={4}
                      className="w-full rounded border bg-white p-2 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Page</span>
                    <input
                      value={editDraft.page}
                      onChange={(event) => updateEditDraft({ page: event.target.value })}
                      className="w-full rounded border p-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Chapter #</span>
                    <input
                      value={editDraft.chapterNumber}
                      onChange={(event) => updateEditDraft({ chapterNumber: event.target.value })}
                      className="w-full rounded border p-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">{chapterNameLabel}</span>
                    <input
                      value={editDraft.chapterName}
                      onChange={(event) => updateEditDraft({ chapterName: event.target.value })}
                      className="w-full rounded border p-2 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveEditedItem()}
                    disabled={editSaving}
                    className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemId(null);
                      setEditDraft(null);
                    }}
                    className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-300"
                  >
                    Cancel
                  </button>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
