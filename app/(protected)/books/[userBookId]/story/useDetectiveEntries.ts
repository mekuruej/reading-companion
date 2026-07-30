"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { DetectiveEntry } from "../components/tabs/readingJournalTypes";

const detectiveSelect =
  "id, user_id, user_book_id, title, chapter_label, chapter_number, page_number, certain_text, likely_text, possible_text, unknown_text, sort_order, created_at, updated_at";

function hasDetectiveContent(
  entry: Pick<DetectiveEntry, "certain_text" | "likely_text" | "possible_text" | "unknown_text">
) {
  return Boolean(
    entry.certain_text?.trim() ||
      entry.likely_text?.trim() ||
      entry.possible_text?.trim() ||
      entry.unknown_text?.trim()
  );
}

type DetectiveContext = {
  userBookId: string;
  ownerUserId: string;
};

type DetectiveEntryDefaults = {
  pageNumber?: number | null;
  chapterLabel?: string | null;
  chapterNumber?: number | null;
};

export function useDetectiveEntries() {
  const [detectiveEntries, setDetectiveEntries] = useState<DetectiveEntry[]>([]);
  const [detectiveSearch, setDetectiveSearch] = useState("");
  const [collapsedDetectiveGroups, setCollapsedDetectiveGroups] = useState<string[]>([]);
  const [expandedDetectiveIds, setExpandedDetectiveIds] = useState<string[]>([]);
  const [editingDetectiveIds, setEditingDetectiveIds] = useState<string[]>([]);
  const [savingDetectiveIds, setSavingDetectiveIds] = useState<string[]>([]);
  const [savedDetectiveIds, setSavedDetectiveIds] = useState<string[]>([]);

  async function loadDetectiveEntries(context: DetectiveContext) {
    const { data, error } = await supabase
      .from("user_book_detective_entries")
      .select(detectiveSelect)
      .eq("user_book_id", context.userBookId)
      .eq("user_id", context.ownerUserId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading detective entries:", error);
      setDetectiveEntries([]);
      return;
    }

    setDetectiveEntries((data as DetectiveEntry[]) ?? []);
  }

  function addDetectiveEntry(
    context: DetectiveContext,
    defaults: DetectiveEntryDefaults = {}
  ) {
    const newId = `new-detective-${Date.now()}`;
    const newEntry: DetectiveEntry = {
      id: newId,
      user_id: context.ownerUserId,
      user_book_id: context.userBookId,
      title: "",
      chapter_label: defaults.chapterLabel ?? "",
      chapter_number: defaults.chapterNumber ?? null,
      page_number: defaults.pageNumber ?? null,
      certain_text: "",
      likely_text: "",
      possible_text: "",
      unknown_text: "",
      sort_order:
        detectiveEntries.length > 0
          ? Math.max(...detectiveEntries.map((entry) => entry.sort_order ?? 0)) + 1
          : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDetectiveEntries((prev) => [newEntry, ...prev]);
    setEditingDetectiveIds((prev) => [...prev, newId]);
    setExpandedDetectiveIds((prev) => [...prev, newId]);
  }

  function updateDetectiveEntry(
    id: string,
    field: keyof DetectiveEntry,
    value: string | number | null
  ) {
    setDetectiveEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  }

  function startEditingDetectiveEntry(id: string) {
    setEditingDetectiveIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setExpandedDetectiveIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function stopEditingDetectiveEntry(id: string) {
    if (id.startsWith("new-detective-")) {
      setDetectiveEntries((prev) => prev.filter((entry) => entry.id !== id));
      setExpandedDetectiveIds((prev) => prev.filter((entryId) => entryId !== id));
    }
    setEditingDetectiveIds((prev) => prev.filter((entryId) => entryId !== id));
  }

  function toggleDetectiveEntryExpanded(id: string) {
    setExpandedDetectiveIds((prev) =>
      prev.includes(id) ? prev.filter((entryId) => entryId !== id) : [...prev, id]
    );
  }

  function toggleDetectiveGroup(groupKey: string) {
    setCollapsedDetectiveGroups((prev) =>
      prev.includes(groupKey) ? prev.filter((key) => key !== groupKey) : [...prev, groupKey]
    );
  }

  function markDetectiveSaved(id: string) {
    setSavedDetectiveIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setSavedDetectiveIds((prev) => prev.filter((entryId) => entryId !== id));
    }, 1800);
  }

  async function saveDetectiveEntry(entry: DetectiveEntry, context: DetectiveContext) {
    const payload = {
      user_id: context.ownerUserId,
      user_book_id: context.userBookId,
      title: entry.title?.trim() || null,
      chapter_label: entry.chapter_label?.trim() || null,
      chapter_number:
        typeof entry.chapter_number === "number" && Number.isFinite(entry.chapter_number)
          ? Math.max(1, Math.trunc(entry.chapter_number))
          : null,
      page_number:
        typeof entry.page_number === "number" && Number.isFinite(entry.page_number)
          ? Math.max(1, Math.trunc(entry.page_number))
          : null,
      certain_text: entry.certain_text?.trim() || null,
      likely_text: entry.likely_text?.trim() || null,
      possible_text: entry.possible_text?.trim() || null,
      unknown_text: entry.unknown_text?.trim() || null,
      sort_order: entry.sort_order ?? 0,
    };

    if (!hasDetectiveContent(payload)) {
      alert("Add something to Certain, Likely, Possible, or Unknown before saving.");
      return;
    }

    setSavingDetectiveIds((prev) => [...prev, entry.id]);

    if (entry.id.startsWith("new-detective-")) {
      const oldId = entry.id;
      const { data, error } = await supabase
        .from("user_book_detective_entries")
        .insert(payload)
        .select(detectiveSelect)
        .single();

      setSavingDetectiveIds((prev) => prev.filter((id) => id !== oldId));

      if (error) {
        console.error("Error creating detective entry:", error);
        alert(`Could not save detective entry.\n${error.message}`);
        return;
      }

      const saved = data as DetectiveEntry;
      setDetectiveEntries((prev) => prev.map((item) => (item.id === oldId ? saved : item)));
      setEditingDetectiveIds((prev) => prev.map((id) => (id === oldId ? saved.id : id)));
      setExpandedDetectiveIds((prev) => prev.map((id) => (id === oldId ? saved.id : id)));
      stopEditingDetectiveEntry(saved.id);
      markDetectiveSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_detective_entries")
      .update(payload)
      .eq("id", entry.id)
      .eq("user_book_id", context.userBookId)
      .eq("user_id", context.ownerUserId)
      .select(detectiveSelect)
      .single();

    setSavingDetectiveIds((prev) => prev.filter((id) => id !== entry.id));

    if (error) {
      console.error("Error updating detective entry:", error);
      alert(`Could not update detective entry.\n${error.message}`);
      return;
    }

    const saved = data as DetectiveEntry;
    setDetectiveEntries((prev) => prev.map((item) => (item.id === entry.id ? saved : item)));
    stopEditingDetectiveEntry(saved.id);
    markDetectiveSaved(saved.id);
  }

  async function deleteDetectiveEntry(id: string, context: DetectiveContext) {
    if (id.startsWith("new-detective-")) {
      setDetectiveEntries((prev) => prev.filter((entry) => entry.id !== id));
      setEditingDetectiveIds((prev) => prev.filter((entryId) => entryId !== id));
      setExpandedDetectiveIds((prev) => prev.filter((entryId) => entryId !== id));
      return;
    }

    const ok = window.confirm("Delete this detective entry?");
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_detective_entries")
      .delete()
      .eq("id", id)
      .eq("user_book_id", context.userBookId)
      .eq("user_id", context.ownerUserId);

    if (error) {
      console.error("Error deleting detective entry:", error);
      alert("Could not delete detective entry.");
      return;
    }

    setDetectiveEntries((prev) => prev.filter((entry) => entry.id !== id));
    setEditingDetectiveIds((prev) => prev.filter((entryId) => entryId !== id));
    setExpandedDetectiveIds((prev) => prev.filter((entryId) => entryId !== id));
  }

  return {
    detectiveEntries,
    detectiveSearch,
    setDetectiveSearch,
    collapsedDetectiveGroups,
    expandedDetectiveIds,
    editingDetectiveIds,
    savingDetectiveIds,
    savedDetectiveIds,
    loadDetectiveEntries,
    addDetectiveEntry,
    updateDetectiveEntry,
    startEditingDetectiveEntry,
    stopEditingDetectiveEntry,
    toggleDetectiveEntryExpanded,
    toggleDetectiveGroup,
    saveDetectiveEntry,
    deleteDetectiveEntry,
  };
}
