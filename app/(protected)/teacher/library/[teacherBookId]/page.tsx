// Teacher Book Prep Add
//
// Bulk Add-style teacher prep flow. Final save writes to teacher_book_items only;
// it does not create user_books, user_book_words, sessions, stats, or study progress.

"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ChapterNameCombobox from "@/components/ChapterNameCombobox";
import {
  normalizeChapterNameOptions,
  sortChapterNameOptionsByNumber,
} from "@/lib/chapterNameOptions";
import TeacherLibraryBookAccessState from "./components/TeacherLibraryBookAccessState";
import TeacherLibraryBookHeader from "./components/TeacherLibraryBookHeader";
import TeacherLibraryBookLoadingState from "./components/TeacherLibraryBookLoadingState";
import TeacherLibraryBookMessageBanner from "./components/TeacherLibraryBookMessageBanner";
import TeacherLibraryBookContextCard from "./components/TeacherLibraryBookContextCard";
import TeacherLibraryBookEmptyState from "./components/TeacherLibraryBookEmptyState";
import TeacherPrepStepHeader from "./components/TeacherPrepStepHeader";
import TeacherPrepSavedItemsHeader from "./components/TeacherPrepSavedItemsHeader";
import TeacherPrepDoneState from "./components/TeacherPrepDoneState";
import TeacherPrepPastePanel from "./components/TeacherPrepPastePanel";
import TeacherPrepBulkFieldsPanel from "./components/TeacherPrepBulkFieldsPanel";
import TeacherPrepPrimaryActionBar from "./components/TeacherPrepPrimaryActionBar";

type ItemType = "word" | "phrase" | "grammar" | "sentence" | "translation" | "note";
type PrepStep = "paste" | "definitions" | "details" | "done";

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
  isbn13: string | null;
  page_count: number | null;
  related_links: any[] | null;
};

type TeacherBookRow = {
  id: string;
  teacher_id: string;
  book_id: string;
  user_book_id: string | null;
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
  page_order?: number | null;
  chapter_number?: number | null;
  chapter_name: string | null;
  teacher_note: string | null;
  explanation: string | null;
  translation: string | null;
  support_url?: string | null;
  created_at: string | null;
};

type PrepItemDraft = {
  id: string;
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
  supportUrl: string;
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
  supportUrl: string;
};

const itemTypes: ItemType[] = ["word", "phrase", "grammar", "sentence", "translation", "note"];
let draftIdCounter = 0;

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

function readableSupabaseError(error: any) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;

  return (
    error.message ||
    error.details ||
    error.hint ||
    error.code ||
    JSON.stringify(error)
  );
}

function isMissingOptionalTeacherBookItemColumn(error: any) {
  const text = readableSupabaseError(error).toLowerCase();
  return (
    text.includes("page_order") ||
    text.includes("support_url") ||
    text.includes("column") ||
    error?.code === "42703"
  );
}

function withoutOptionalTeacherBookItemColumns<T extends Record<string, any>>(row: T) {
  const { page_order: _pageOrder, support_url: _supportUrl, ...baseRow } = row;
  return baseRow;
}

function combinedTeacherNote(item: Pick<TeacherBookItem, "teacher_note" | "explanation">) {
  return [item.teacher_note, item.explanation]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
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
    item.support_url,
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
    teacherNote: combinedTeacherNote(item),
    explanation: item.explanation ?? "",
    translation: item.translation ?? "",
    supportUrl: item.support_url ?? "",
  };
}

function createDraftId() {
  draftIdCounter += 1;
  return `prep-draft-${Date.now()}-${draftIdCounter}`;
}

function blankDraft(surfaceText: string, defaultType: ItemType): PrepItemDraft {
  return {
    id: createDraftId(),
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
    supportUrl: "",
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
  const [refreshingDraftIndex, setRefreshingDraftIndex] = useState<number | null>(null);

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

  const chapterNameOptions = useMemo(() => {
    return normalizeChapterNameOptions([
      ...savedItems.map((item) => item.chapter_name),
      ...drafts.map((draft) => draft.chapterName),
      editDraft?.chapterName,
      bulkChapterName,
    ]);
  }, [bulkChapterName, drafts, editDraft?.chapterName, savedItems]);

  const chapterNumberByName = useMemo(() => {
    const map: Record<string, string> = {};

    for (const item of savedItems) {
      const name = String(item.chapter_name ?? "").trim();
      if (!name || map[name] || item.chapter_number == null) continue;
      map[name] = String(item.chapter_number);
    }

    for (const draft of drafts) {
      const name = draft.chapterName.trim();
      if (!name || map[name] || !draft.chapterNumber.trim()) continue;
      map[name] = draft.chapterNumber.trim();
    }

    if (editDraft?.chapterName.trim() && editDraft.chapterNumber.trim()) {
      const name = editDraft.chapterName.trim();
      if (!map[name]) map[name] = editDraft.chapterNumber.trim();
    }

    if (bulkChapterName.trim() && bulkChapterNumber.trim()) {
      const name = bulkChapterName.trim();
      if (!map[name]) map[name] = bulkChapterNumber.trim();
    }

    return map;
  }, [bulkChapterName, bulkChapterNumber, drafts, editDraft, savedItems]);

  const sortedChapterNameOptions = useMemo(
    () => sortChapterNameOptionsByNumber(chapterNameOptions, chapterNumberByName),
    [chapterNameOptions, chapterNumberByName]
  );

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
    setCanAccess(false);
    setTeacherBook(null);
    setSavedItems([]);
    setMessage("");
    setStep("paste");
    setDefaultItemType("word");
    setRawInput("");
    setDrafts([]);
    setIsPreviewing(false);
    setIsSaving(false);
    setRefreshingDraftIndex(null);
    setBulkPageNumber("");
    setBulkChapterNumber("");
    setBulkChapterName("");
    setEditingItemId(null);
    setEditDraft(null);
    setEditSaving(false);
    setDeletingItemId(null);
    setExpandedItemIds(new Set());
    setSavedSearch("");
    setSavedPageFilter("all");
  }, [teacherBookId]);

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
          user_book_id,
          books:book_id (
            id,
            title,
            author,
            cover_url,
            book_type,
            isbn13,
            page_count,
            related_links
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
          "id, item_type, surface_text, reading, meaning, vocabulary_cache_id, page_number, page_order, chapter_number, chapter_name, teacher_note, explanation, translation, support_url, created_at"
        )
        .eq("teacher_book_id", teacherBookId)
        .order("page_number", { ascending: true, nullsFirst: false })
        .order("page_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      let loadedItems: Partial<TeacherBookItem>[] = itemRows ?? [];

      if (itemsError) {
        if (!isMissingOptionalTeacherBookItemColumn(itemsError)) throw itemsError;

        console.warn(
          "Teacher prep optional column missing; retrying with the base teacher_book_items columns:",
          readableSupabaseError(itemsError)
        );

        const { data: fallbackRows, error: fallbackError } = await supabase
          .from("teacher_book_items")
          .select(
            "id, item_type, surface_text, reading, meaning, vocabulary_cache_id, page_number, chapter_number, chapter_name, teacher_note, explanation, translation, created_at"
          )
          .eq("teacher_book_id", teacherBookId)
          .order("page_number", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });

        if (fallbackError) throw fallbackError;
        loadedItems = fallbackRows ?? [];
      }

      setCanAccess(true);
      setTeacherBook(teacherBookRow as TeacherBookRow);
      setSavedItems(loadedItems as TeacherBookItem[]);
    } catch (error: any) {
      console.error("Error loading teacher book prep:", readableSupabaseError(error), error);
      setMessage(readableSupabaseError(error) || "Could not load teacher book prep.");
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

  function updateDraftChapterName(index: number, value: string) {
    const knownChapterNumber = chapterNumberByName[value.trim()];
    updateDraft(index, {
      chapterName: value,
      ...(knownChapterNumber ? { chapterNumber: knownChapterNumber } : {}),
    });
  }

  function updateBulkChapterName(value: string) {
    const knownChapterNumber = chapterNumberByName[value.trim()];
    setBulkChapterName(value);
    if (knownChapterNumber) {
      setBulkChapterNumber(knownChapterNumber);
    }
  }

  function updateEditDraftChapterName(value: string) {
    const knownChapterNumber = chapterNumberByName[value.trim()];
    updateEditDraft({
      chapterName: value,
      ...(knownChapterNumber ? { chapterNumber: knownChapterNumber } : {}),
    });
  }

  function moveDraft(index: number, direction: "up" | "down") {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= drafts.length) return;

    const nextDrafts = [...drafts];
    const [draft] = nextDrafts.splice(index, 1);
    nextDrafts.splice(nextIndex, 0, draft);
    setDrafts(nextDrafts);
  }

  function deleteDraft(index: number) {
    const nextDrafts = drafts.filter((_, draftIndex) => draftIndex !== index);
    setDrafts(nextDrafts);

    if (nextDrafts.length === 0) {
      setStep("paste");
      setMessage("All draft items were removed. Paste a new list to continue.");
      return;
    }

    setMessage(`Removed draft item ${index + 1}.`);
  }

  async function refreshDraftLookup(index: number) {
    const draft = drafts[index];
    if (!draft) return;

    const surface = draft.surfaceText.trim();
    if (!surface) {
      setMessage("Enter a word or phrase before searching again.");
      return;
    }

    if (!["word", "phrase"].includes(draft.itemType)) {
      setMessage("Jisho search is only used for word and phrase rows.");
      return;
    }

    setRefreshingDraftIndex(index);
    setMessage(`Searching again for ${surface}...`);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`/api/jisho?keyword=${encodeURIComponent(surface)}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (!response.ok) {
        throw new Error("Jisho lookup failed.");
      }

      const data = await response.json();
      const entry = data?.data?.[0];

      if (!entry) {
        updateDraft(index, {
          meaningChoices: [],
          meaningChoiceIndex: null,
          vocabularyCacheId: null,
        });
        setMessage(`No Jisho result found for ${surface}. You can still edit it manually.`);
        return;
      }

      const choices = extractMeaningChoices(entry);
      updateDraft(index, {
        reading: entry.japanese?.[0]?.reading || "",
        meaningChoices: choices,
        meaningChoiceIndex: choices.length ? 0 : null,
        meaning: choices[0] || "",
        vocabularyCacheId: null,
      });
      setMessage(`Updated dictionary choices for ${surface}.`);
    } catch (error: any) {
      console.error("Teacher prep draft lookup error:", error);
      setMessage(error?.message ?? "Could not search that draft item.");
    } finally {
      setRefreshingDraftIndex(null);
    }
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

    const knownChapterNumber =
      field === "chapterName" ? chapterNumberByName[trimmed] : "";
    let changed = 0;
    setDrafts((prev) =>
      prev.map((draft) => {
        const current = draft[field].trim();
        if (mode === "blank" && current) return draft;
        changed += 1;
        return {
          ...draft,
          [field]: value,
          ...(field === "chapterName" && knownChapterNumber
            ? { chapterNumber: knownChapterNumber }
            : {}),
        };
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
      const existingMaxPageOrder = savedItems.reduce((maxOrder, item) => {
        const pageOrder = Number(item.page_order);
        return Number.isFinite(pageOrder) ? Math.max(maxOrder, pageOrder) : maxOrder;
      }, 0);

      for (const draft of drafts) {
        const pageValue = draft.page.trim() || bulkPageNumber.trim();
        const chapterNameValue = draft.chapterName.trim() || bulkChapterName.trim();
        const knownChapterNumber =
          chapterNameValue ? chapterNumberByName[chapterNameValue] : "";
        const chapterNumberValue =
          draft.chapterNumber.trim() ||
          bulkChapterNumber.trim() ||
          knownChapterNumber ||
          "";

        payload.push({
          teacher_book_id: teacherBookId,
          item_type: draft.itemType,
          surface_text: cleanNullable(draft.surfaceText),
          reading: cleanNullable(draft.reading),
          meaning: cleanNullable(draft.meaning),
          vocabulary_cache_id: draft.vocabularyCacheId,
          page_number: toNullableInt(pageValue),
          page_order: existingMaxPageOrder + payload.length + 1,
          chapter_number: toNullableInt(chapterNumberValue),
          chapter_name: cleanNullable(chapterNameValue),
          teacher_note: cleanNullable(draft.teacherNote),
          explanation: null,
          translation: cleanNullable(draft.translation),
          support_url: cleanNullable(draft.supportUrl),
        });
      }

      const { error } = await supabase.from("teacher_book_items").insert(payload);
      if (error) {
        if (!isMissingOptionalTeacherBookItemColumn(error)) throw error;

        console.warn(
          "Teacher prep optional column missing during insert; retrying with base columns:",
          readableSupabaseError(error)
        );

        const fallbackPayload = payload.map(withoutOptionalTeacherBookItemColumns);
        const { error: fallbackError } = await supabase
          .from("teacher_book_items")
          .insert(fallbackPayload);

        if (fallbackError) throw fallbackError;
      }

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
        explanation: null,
        translation: cleanNullable(editDraft.translation),
        support_url: cleanNullable(editDraft.supportUrl),
      };

      const { error } = await supabase
        .from("teacher_book_items")
        .update(payload)
        .eq("id", editingItemId)
        .eq("teacher_book_id", teacherBookId);

      if (error) {
        if (!isMissingOptionalTeacherBookItemColumn(error)) throw error;

        console.warn(
          "Teacher prep optional column missing during update; retrying with base columns:",
          readableSupabaseError(error)
        );

        const { error: fallbackError } = await supabase
          .from("teacher_book_items")
          .update(withoutOptionalTeacherBookItemColumns(payload))
          .eq("id", editingItemId)
          .eq("teacher_book_id", teacherBookId);

        if (fallbackError) throw fallbackError;
      }

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

  async function moveSavedItem(itemId: string, direction: "up" | "down") {
    const visibleIndex = visibleSavedItems.findIndex((item) => item.id === itemId);
    const nextVisibleIndex = direction === "up" ? visibleIndex - 1 : visibleIndex + 1;
    if (visibleIndex < 0 || nextVisibleIndex < 0 || nextVisibleIndex >= visibleSavedItems.length) {
      return;
    }

    const swapWithId = visibleSavedItems[nextVisibleIndex].id;
    const currentIndex = savedItems.findIndex((item) => item.id === itemId);
    const swapIndex = savedItems.findIndex((item) => item.id === swapWithId);
    if (currentIndex < 0 || swapIndex < 0) return;

    const reordered = [...savedItems];
    const [movedItem] = reordered.splice(currentIndex, 1);
    reordered.splice(swapIndex, 0, movedItem);

    const orderedItems = reordered.map((item, index) => ({
      ...item,
      page_order: index + 1,
    }));

    setMessage("Saving reading order...");

    try {
      const updates = orderedItems
        .filter((item) => item.page_order !== savedItems.find((saved) => saved.id === item.id)?.page_order)
        .map((item) =>
          supabase
            .from("teacher_book_items")
            .update({ page_order: item.page_order })
            .eq("id", item.id)
            .eq("teacher_book_id", teacherBookId)
        );

      const results = await Promise.all(updates);
      const updateError = results.find((result) => result.error)?.error;
      if (updateError) throw updateError;

      setSavedItems(orderedItems);
      setMessage("Reading order updated.");
    } catch (error: any) {
      console.error("Error updating teacher prep order:", readableSupabaseError(error), error);
      setMessage(readableSupabaseError(error) || "Could not update reading order.");
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
              <TeacherPrepPastePanel
                itemTypes={itemTypes}
                defaultItemType={defaultItemType}
                onDefaultItemTypeChange={(value) => setDefaultItemType(value as ItemType)}
                itemTypeLabel={itemTypeLabel}
                rawInput={rawInput}
                onRawInputChange={setRawInput}
                itemCount={itemCount}
                isPreviewing={isPreviewing}
                onSubmit={handlePreview}
              />
            ) : null}

            {step === "definitions" ? (
              <>
                <TeacherPrepStepHeader
                  className="mb-4"
                  stepLabel="Step 2"
                  title="Check definitions and support fields"
                  description="Choose dictionary definitions where useful, then add teacher notes or a reference link."
                />

                <TeacherPrepPrimaryActionBar
                  label="Save Definitions"
                  onClick={handleSaveDefinitions}
                />

                <ul className="space-y-3">
                  {drafts.map((draft, index) => (
                    <li key={draft.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveDraft(index, "up")}
                            disabled={index === 0}
                            className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDraft(index, "down")}
                            disabled={index === drafts.length - 1}
                            className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                          >
                            Move down
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDraft(index)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void refreshDraftLookup(index)}
                            disabled={
                              refreshingDraftIndex === index ||
                              !draft.surfaceText.trim() ||
                              !["word", "phrase"].includes(draft.itemType)
                            }
                            className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                          >
                            {refreshingDraftIndex === index ? "Searching..." : "Search again"}
                          </button>
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
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="text-sm md:col-span-3">
                          <span className="mb-1 block text-xs text-gray-500">Word / item</span>
                          <textarea
                            value={draft.surfaceText}
                            onChange={(event) =>
                              updateDraft(index, {
                                surfaceText: event.target.value,
                                vocabularyCacheId: null,
                              })
                            }
                            rows={2}
                            className="w-full rounded border p-2 text-sm"
                          />
                        </label>

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
                        <label className="text-sm md:col-span-2">
                          <span className="mb-1 block text-xs text-gray-500">Teacher notes</span>
                          <textarea
                            value={draft.teacherNote}
                            onChange={(event) => updateDraft(index, { teacherNote: event.target.value })}
                            rows={4}
                            className="w-full rounded border bg-white p-2 text-sm"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-gray-500">Reference link</span>
                          <input
                            value={draft.supportUrl}
                            onChange={(event) => updateDraft(index, { supportUrl: event.target.value })}
                            className="w-full rounded border bg-white p-2 text-sm"
                            placeholder="https://..."
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

                <TeacherPrepPrimaryActionBar
                  label="Save All"
                  loadingLabel="Saving..."
                  isLoading={isSaving}
                  onClick={() => void handleSaveAll()}
                />

                <TeacherPrepBulkFieldsPanel
                  pageNumber={bulkPageNumber}
                  onPageNumberChange={setBulkPageNumber}
                  chapterNumber={bulkChapterNumber}
                  onChapterNumberChange={setBulkChapterNumber}
                  chapterName={bulkChapterName}
                  onChapterNameChange={updateBulkChapterName}
                  chapterNameLabel={chapterNameLabel}
                  chapterNameOptions={sortedChapterNameOptions}
                  onApplyField={applyBulkField}
                />

                <ul className="space-y-3">
                  {drafts.map((draft, index) => (
                    <li key={draft.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold">{draft.surfaceText}</div>
                          <div className="mt-1 text-sm text-gray-600">
                            {itemTypeLabel(draft.itemType)} · {draft.reading || "—"} · {draft.meaning || "—"}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveDraft(index, "up")}
                            disabled={index === 0}
                            className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDraft(index, "down")}
                            disabled={index === drafts.length - 1}
                            className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                          >
                            Move down
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDraft(index)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
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
                        <ChapterNameCombobox
                          value={draft.chapterName}
                          onChange={(value) => updateDraftChapterName(index, value)}
                          chapterOptions={sortedChapterNameOptions}
                          label={chapterNameLabel}
                          labelClassName="mb-1 block text-xs text-gray-500"
                          inputClassName="w-full rounded border p-2 text-sm"
                        />
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-gray-500">Chapter #</span>
                          <input
                            value={draft.chapterNumber}
                            onChange={(event) => updateDraft(index, { chapterNumber: event.target.value })}
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
                  <table className="w-full min-w-[840px] border-separate border-spacing-0 text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="w-20 p-2 text-xs font-semibold text-stone-600">
                          Order
                        </th>
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
                      {visibleSavedItems.map((item, visibleIndex) => {
                        const isExpanded = expandedItemIds.has(item.id);
                        return (
                          <Fragment key={item.id}>
                            <tr className="border-t align-top">
                              <td className="border-t border-stone-100 p-2">
                                <div className="flex items-center gap-1">
                                  <span
                                    aria-hidden="true"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-stone-200 bg-stone-50 text-sm font-black leading-none text-stone-500"
                                    title="Drag-style order handle"
                                  >
                                    ☰
                                  </span>
                                  <div className="flex flex-col gap-1">
                                    <button
                                      type="button"
                                      onClick={() => void moveSavedItem(item.id, "up")}
                                      disabled={visibleIndex === 0}
                                      className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                                    >
                                      Up
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void moveSavedItem(item.id, "down")}
                                      disabled={visibleIndex === visibleSavedItems.length - 1}
                                      className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                                    >
                                      Down
                                    </button>
                                  </div>
                                </div>
                              </td>
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
                                <td colSpan={8} className="border-t border-stone-100 bg-stone-50 p-3">
                                  <div className="grid gap-3 text-sm md:grid-cols-2">
                                    <div className="md:col-span-2">
                                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                                        Teacher notes
                                      </div>
                                      <div className="mt-1 whitespace-pre-wrap leading-6 text-stone-700">
                                        {compactText(combinedTeacherNote(item))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                                        Reference link
                                      </div>
                                      <div className="mt-1 leading-6 text-stone-700">
                                        {item.support_url?.trim() ? (
                                          <a
                                            href={item.support_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-semibold text-blue-700 underline"
                                          >
                                            {item.support_url}
                                          </a>
                                        ) : (
                                          "—"
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                                        Legacy translation
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
                    <textarea
                      value={editDraft.surfaceText}
                      onChange={(event) => updateEditDraft({ surfaceText: event.target.value })}
                      rows={2}
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

                  <label className="text-sm md:col-span-2">
                    <span className="mb-1 block text-xs text-gray-500">Teacher notes</span>
                    <textarea
                      value={editDraft.teacherNote}
                      onChange={(event) => updateEditDraft({ teacherNote: event.target.value })}
                      rows={4}
                      className="w-full rounded border bg-white p-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Reference link</span>
                    <input
                      value={editDraft.supportUrl}
                      onChange={(event) => updateEditDraft({ supportUrl: event.target.value })}
                      className="w-full rounded border bg-white p-2 text-sm"
                      placeholder="https://..."
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
                  <ChapterNameCombobox
                    value={editDraft.chapterName}
                    onChange={updateEditDraftChapterName}
                    chapterOptions={sortedChapterNameOptions}
                    label={chapterNameLabel}
                    labelClassName="mb-1 block text-xs text-gray-500"
                    inputClassName="w-full rounded border p-2 text-sm"
                  />
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-gray-500">Chapter #</span>
                    <input
                      value={editDraft.chapterNumber}
                      onChange={(event) => updateEditDraft({ chapterNumber: event.target.value })}
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
