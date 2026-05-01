// Vocab List
//
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  computeLibraryStudyColorStatus,
  type LibraryStudyColor,
  type LibraryStudyColorStatus,
} from "@/lib/libraryStudyColor";

const DEFAULT_LEARNING_SETTINGS = {
  red_stages: 1,
  orange_stages: 1,
  yellow_stages: 1,
  show_badge_numbers: true,
};

const GLOBAL_ENCOUNTER_PAGE_SIZE = 1000;

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
  page_order: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  seen_on: string | null;
  created_at: string;
  hidden: boolean | null;
  meaning_choices: any | null;
  meaning_choice_index: number | null;
  hide_kanji_in_reading_support?: boolean | null;
  vocabulary_cache_id?: number | null;
  cache_surface?: string | null;
};

type ProfileRole = "teacher" | "student";

type LearningSettingsRow = {
  red_stages: number;
  orange_stages: number;
  yellow_stages: number;
  show_badge_numbers: boolean;
};

type GlobalEncounterRow = {
  surface: string | null;
  reading: string | null;
};

type LibraryWordSummaryRow = {
  study_identity_key: string;
  total_encounter_count: number | null;
};

async function loadAllGlobalEncounterRows(ownerUserId: string) {
  const allRows: GlobalEncounterRow[] = [];
  let from = 0;

  while (true) {
    const to = from + GLOBAL_ENCOUNTER_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("user_book_words")
      .select(
        `
          surface,
          reading,
          user_books!inner (
            user_id
          )
        `
      )
      .eq("user_books.user_id", ownerUserId)
      .or("hidden.is.null,hidden.eq.false")
      .range(from, to);

    if (error) throw error;

    allRows.push(...((data ?? []) as GlobalEncounterRow[]));

    if (!data || data.length < GLOBAL_ENCOUNTER_PAGE_SIZE) {
      break;
    }

    from += GLOBAL_ENCOUNTER_PAGE_SIZE;
  }

  return allRows;
}

function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

function chapterDisplayParts(w: WordRow) {
  const num = w.chapter_number;
  const name = (w.chapter_name ?? "").trim();

  return {
    num: num != null ? `Chapter ${num}:` : "",
    name,
    fallback:
      num != null && name
        ? `Chapter ${num}: ${name}`
        : num != null
          ? `Chapter ${num}`
          : name
            ? name
            : "(none)",
  };
}

function chapterKey(w: WordRow) {
  const num = w.chapter_number != null ? String(w.chapter_number) : "";
  const name = (w.chapter_name ?? "").trim();
  return `${num}||${name}`;
}

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

function normalizeText(val: string | null | undefined) {
  return (val ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeKana(val: string | null | undefined) {
  return (val ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function isKatakanaOnly(value: string | null | undefined) {
  const compact = (value ?? "").trim().replace(/\s+/g, "");
  return compact.length > 0 && /^[ァ-ヶー・･]+$/.test(compact);
}

function KatakanaBadge() {
  return (
    <span
      title="Katakana-only word"
      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white"
    >
      カ
    </span>
  );
}

function repeatKey(w: WordRow) {
  const s = normalizeText(w.surface);
  if (!s) return "";

  const choices = asStringArray((w as any).meaning_choices);
  const idx = w.meaning_choice_index;

  if (choices.length > 0 && idx != null && Number.isFinite(idx)) {
    return `${s}||IDX:${idx}`;
  }

  const m = normalizeText(w.meaning);
  return `${s}||MEAN:${m}`;
}

function studyIdentityKey(surface: string | null | undefined, reading: string | null | undefined) {
  const normalizedSurface = normalizeText(surface);
  const normalizedReading = normalizeKana(reading);
  if (!normalizedSurface) return "";
  return `${normalizedSurface}||${normalizedReading}`;
}

function badgeColorClass(color: LibraryStudyColor) {
  if (color === "red") return "border-red-800 bg-red-600 text-white";
  if (color === "orange") return "border-orange-700 bg-orange-400 text-stone-950";
  if (color === "yellow") return "border-yellow-500 bg-yellow-300 text-stone-900";
  if (color === "green") return "border-green-800 bg-green-600 text-white";
  if (color === "blue") return "border-blue-800 bg-blue-600 text-white";
  if (color === "purple") return "border-purple-800 bg-purple-600 text-white";
  if (color === "grey") return "border-slate-700 bg-slate-500 text-white";
  return "border-stone-400 bg-stone-300 text-stone-700";
}

function colorLabel(color: LibraryStudyColor) {
  if (color === "none") return "No color yet";
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function LibraryStudyStatusBadge({
  status,
  showNumbers,
  encounterCount,
}: {
  status: LibraryStudyColorStatus;
  showNumbers: boolean;
  encounterCount: number;
}) {
  const showStageNumber =
    showNumbers &&
    status.stageNumber != null &&
    status.stageCount != null &&
    status.stageCount > 1;

  const title = [
    `${colorLabel(status.color)}${showStageNumber ? ` ${status.stageNumber}` : ""}`,
    status.reason,
    `${encounterCount} encounter${encounterCount === 1 ? "" : "s"} across saved books`,
  ].join(" · ");

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold shadow-sm ${badgeColorClass(
        status.color
      )} ${showStageNumber ? "h-6 min-w-6 px-1.5" : "h-4 w-4"}`}
    >
      {showStageNumber ? status.stageNumber : ""}
    </span>
  );
}

export default function BookWordsPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<ProfileRole>("student");
  const isTeacher = myRole === "teacher";
  const [learningSettings, setLearningSettings] = useState<LearningSettingsRow>(
    DEFAULT_LEARNING_SETTINGS
  );
  const [globalEncounterCounts, setGlobalEncounterCounts] = useState<Record<string, number>>({});

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [bookOptions, setBookOptions] = useState<
    { id: string; title: string; started_at: string | null; finished_at: string | null; dnf_at: string | null }[]
  >([]);

  const [words, setWords] = useState<WordRow[]>([]);
  const [query, setQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [chapterOptions, setChapterOptions] = useState<{ value: string; label: string }[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  const [editing, setEditing] = useState<WordRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [editSurface, setEditSurface] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const [editOtherDefinition, setEditOtherDefinition] = useState("");
  const [editJlpt, setEditJlpt] = useState("");
  const [editPage, setEditPage] = useState<string>("");
  const [editChapterNum, setEditChapterNum] = useState<string>("");
  const [editChapterName, setEditChapterName] = useState("");
  const [editMeaningChoices, setEditMeaningChoices] = useState<string[]>([]);
  const [editMeaningChoiceIndex, setEditMeaningChoiceIndex] = useState<number | null>(0);
  const [editHideKanjiInReadingSupport, setEditHideKanjiInReadingSupport] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const stickyControlsRef = useRef<HTMLDivElement | null>(null);
  const [stickyOffset, setStickyOffset] = useState(0);

  useLayoutEffect(() => {
    function measure() {
      if (!stickyControlsRef.current) return;
      setStickyOffset(stickyControlsRef.current.offsetHeight);
    }

    measure();

    const el = stickyControlsRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    }

    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, []);

  function sameOrderGroup(a: WordRow, b: WordRow) {
    return (
      (a.chapter_number ?? null) === (b.chapter_number ?? null) &&
      (a.chapter_name ?? "").trim() === (b.chapter_name ?? "").trim() &&
      (a.page_number ?? null) === (b.page_number ?? null)
    );
  }

  function sortWithinGroup(list: WordRow[]) {
    return [...list].sort((a, b) => {
      const aOrder = a.page_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.page_order ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.created_at.localeCompare(b.created_at);
    });
  }

  async function moveWordInGroup(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;

    const dragged = words.find((w) => w.id === draggedId);
    const target = words.find((w) => w.id === targetId);

    if (!dragged || !target) return;
    if (!sameOrderGroup(dragged, target)) return;

    const group = sortWithinGroup(words.filter((w) => sameOrderGroup(w, dragged)));

    const fromIndex = group.findIndex((w) => w.id === draggedId);
    const toIndex = group.findIndex((w) => w.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...group];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updatedGroup = reordered.map((w, index) => ({
      ...w,
      page_order: index + 1,
    }));

    setWords((prev) =>
      prev.map((word) => {
        const updated = updatedGroup.find((w) => w.id === word.id);
        return updated ?? word;
      })
    );

    setReordering(true);

    try {
      for (const w of updatedGroup) {
        const { error } = await supabase
          .from("user_book_words")
          .update({ page_order: w.page_order })
          .eq("id", w.id)
          .eq("user_book_id", userBookId);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Failed to save reorder:", error);
      alert(error?.message || "Failed to save new order.");
    } finally {
      setReordering(false);
    }
  }

  function openEdit(w: WordRow) {
    setEditErr(null);
    setEditing(w);

    setEditSurface(w.surface ?? "");
    setEditReading(w.reading ?? "");
    setEditMeaning(w.meaning ?? "");
    setEditOtherDefinition(w.other_definition ?? "");
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

    if (idx != null && choices.length && choices[idx]) {
      setEditMeaning(choices[idx]);
    } else {
      setEditMeaning(w.meaning ?? "");
    }
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

    const newIndex = Number(newValue);
    const safe = Math.max(0, newIndex);

    setEditMeaningChoiceIndex(safe);

    if (choices.length) {
      const clamped = Math.min(safe, choices.length - 1);
      const chosen = choices[clamped] ?? "";
      setEditMeaning(chosen);
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

      setWords((prev) =>
        prev.map((w) =>
          w.id === editing.id
            ? ({
              ...w,
              ...patch,
            } as WordRow)
            : w
        )
      );

      closeEdit();
    } catch (e: any) {
      setEditErr(e?.message ?? "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteWord(w: WordRow) {
    const ok = window.confirm(`Delete "${w.surface}"? This cannot be undone.`);
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("user_book_words")
        .delete()
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;
      setWords((prev) => prev.filter((x) => x.id !== w.id));
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete word");
    }
  }

  async function hideWord(w: WordRow) {
    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({ hidden: true })
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      if (showHidden) {
        setWords((prev) => prev.map((x) => (x.id === w.id ? { ...x, hidden: true } : x)));
      } else {
        setWords((prev) => prev.filter((x) => x.id !== w.id));
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to hide word");
    }
  }

  async function unhideWord(w: WordRow) {
    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({ hidden: false })
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      setWords((prev) => prev.map((x) => (x.id === w.id ? { ...x, hidden: false } : x)));
    } catch (e: any) {
      alert(e?.message ?? "Failed to unhide word");
    }
  }

  useEffect(() => {
    async function loadBookOptions() {
      if (!userId) return;

      const { data, error } = await supabase
        .from("user_books")
        .select(`
          id,
          started_at,
          finished_at,
          dnf_at,
          books (
            title
          )
        `)
        .eq("user_id", userId);

      if (error) {
        console.error("Error loading book options:", error);
        setBookOptions([]);
        return;
      }

      setBookOptions(
        (data ?? [])
          .map((item: any) => ({
            id: item.id,
            title: item.books?.title ?? "Untitled",
            started_at: item.started_at ?? null,
            finished_at: item.finished_at ?? null,
            dnf_at: item.dnf_at ?? null,
          }))
          .sort((a, b) => a.title.localeCompare(b.title))
      );
    }

    loadBookOptions();
  }, [userId]);

  useEffect(() => {
    if (!userBookId) return;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      setNeedsSignIn(false);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          setNeedsSignIn(true);
          setLoading(false);
          return;
        }

        const authedUser = user;
        setUserId(authedUser.id);

        const { data: meProfile, error: meProfileErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authedUser.id)
          .single();

        if (meProfileErr) {
          console.error("Error loading profile role:", meProfileErr);
        }

        setMyRole((meProfile?.role as ProfileRole | null) ?? "student");

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
          .single();

        if (ubErr) throw ubErr;

        setBookTitle((ub as any)?.books?.title ?? "");
        setBookCover((ub as any)?.books?.cover_url ?? "");
        const ownerUserId = (ub as any)?.user_id ?? authedUser.id;

        const { data: learningSettingsRow, error: learningSettingsErr } = await supabase
          .from("user_learning_settings")
          .select("red_stages, orange_stages, yellow_stages, show_badge_numbers")
          .eq("user_id", ownerUserId)
          .maybeSingle();

        if (learningSettingsErr) {
          console.error("Error loading learning settings:", learningSettingsErr);
          setLearningSettings(DEFAULT_LEARNING_SETTINGS);
        } else {
          setLearningSettings({
            ...DEFAULT_LEARNING_SETTINGS,
            ...((learningSettingsRow as Partial<LearningSettingsRow> | null) ?? {}),
          });
        }

        try {
          const counts: Record<string, number> = {};

          const { data: summaryRows, error: summaryErr } = await supabase
            .from("user_library_word_summaries")
            .select("study_identity_key, total_encounter_count")
            .eq("user_id", ownerUserId)
            .returns<LibraryWordSummaryRow[]>();

          if (!summaryErr && summaryRows && summaryRows.length > 0) {
            for (const row of summaryRows) {
              const key = row.study_identity_key;
              if (!key) continue;
              counts[key] = row.total_encounter_count ?? 0;
            }
          } else {
            if (summaryErr) {
              console.warn("Library word summaries are not available yet:", summaryErr);
            }

            const globalWords = await loadAllGlobalEncounterRows(ownerUserId);
            for (const row of globalWords) {
              const key = studyIdentityKey(row.surface, row.reading);
              if (!key) continue;
              counts[key] = (counts[key] ?? 0) + 1;
            }
          }

          setGlobalEncounterCounts(counts);
        } catch (globalWordsErr) {
          console.error("Error loading global word encounters:", globalWordsErr);
          setGlobalEncounterCounts({});
        }

        let wordsQuery = supabase
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
              page_order,
              chapter_number,
              chapter_name,
              seen_on,
              created_at,
              hidden,
              meaning_choices,
              meaning_choice_index,
              hide_kanji_in_reading_support,
              vocabulary_cache_id,
              vocabulary_cache: vocabulary_cache_id (
                surface
              )
            `
          )
          .eq("user_book_id", userBookId)
          .order("chapter_number", { ascending: true, nullsFirst: false })
          .order("page_number", { ascending: true, nullsFirst: false })
          .order("page_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true });

        if (showHidden) {
          wordsQuery = wordsQuery.eq("hidden", true);
        } else {
          wordsQuery = wordsQuery.eq("hidden", false);
        }

        const { data: rows, error: wErr } = await wordsQuery.returns<WordRow[]>();

        if (wErr) throw wErr;

        const list = (rows ?? []).map((w: any) => ({
          ...w,
          cache_surface: w.vocabulary_cache?.surface ?? null,
        }));
        setWords(list);

        const optMap = new Map<string, string>();
        for (const w of list) {
          optMap.set(chapterKey(w), chapterDisplayParts(w).fallback);
        }

        const opts = Array.from(optMap.entries()).map(([value, label]) => ({ value, label }));

        opts.sort((a, b) => {
          const anum = a.label.match(/Chapter\s+(\d+)/i)?.[1];
          const bnum = b.label.match(/Chapter\s+(\d+)/i)?.[1];
          if (anum && bnum) return Number(anum) - Number(bnum);
          return a.label.localeCompare(b.label);
        });

        setChapterOptions(opts);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load words");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userBookId, showHidden]);

  const repeatCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of words) {
      const key = repeatKey(w);
      if (!key) continue;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [words]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return words.filter((w) => {
      const chValue = chapterKey(w);
      const chLabel = chapterDisplayParts(w).fallback;

      if (chapterFilter !== "all" && chValue !== chapterFilter) return false;
      if (!q) return true;

      const hay = [
        w.surface,
        w.reading ?? "",
        w.meaning ?? "",
        normalizeJlpt(w.jlpt),
        chLabel,
        w.page_number?.toString() ?? "",
        w.meaning_choice_index != null ? String(w.meaning_choice_index + 1) : "o",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [words, query, chapterFilter]);

  const filteredSorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
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
  }, [filtered]);

  const currentlyReadingOptions = useMemo(() => {
    return bookOptions.filter((b: any) => b.started_at && !b.finished_at && !b.dnf_at);
  }, [bookOptions]);

  const otherBookOptions = useMemo(() => {
    return bookOptions.filter((b: any) => !(b.started_at && !b.finished_at && !b.dnf_at));
  }, [bookOptions]);

  const headerStickyStyle = { top: "0px" };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading words…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">You need to sign in.</p>
        <button onClick={() => router.push("/login")} className="px-4 py-2 bg-gray-200 rounded">
          Go to Login
        </button>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-700">{errorMsg}</p>
        <button onClick={() => router.push("/books")} className="px-4 py-2 bg-gray-200 rounded">
          Back to Books
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 pb-24">
      {editing && isTeacher ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Edit word</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {editing.surface} • {editing.id}
                </p>
              </div>
              <button
                onClick={closeEdit}
                className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              >
                ✕ Close
              </button>
            </div>

            {editErr ? <p className="mt-3 text-sm text-red-700">{editErr}</p> : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Word (book form)</span>
                <input
                  value={editSurface}
                  onChange={(e) => setEditSurface(e.target.value)}
                  className="border p-2 rounded"
                />

                {editing?.cache_surface && editing.cache_surface !== editSurface ? (
                  <span className="text-[11px] text-gray-500">
                    Dictionary form: {editing.cache_surface}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Reading</span>
                <input
                  value={editReading}
                  onChange={(e) => setEditReading(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">JLPT</span>
                <select
                  value={editJlpt}
                  onChange={(e) => setEditJlpt(e.target.value)}
                  className="border p-2 rounded bg-white"
                >
                  <option value="">NON-JLPT</option>
                  <option value="N5">N5</option>
                  <option value="N4">N4</option>
                  <option value="N3">N3</option>
                  <option value="N2">N2</option>
                  <option value="N1">N1</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Definition #</span>
                {editMeaningChoices.length > 0 ? (
                  <select
                    value={editMeaningChoiceIndex == null ? "other" : String(editMeaningChoiceIndex)}
                    onChange={(e) => changeDefinition(e.target.value)}
                    className="border p-2 rounded bg-white"
                  >
                    {editMeaningChoices.map((_, i) => (
                      <option key={i} value={i}>
                        {i + 1}
                      </option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <select
                    value={editMeaningChoiceIndex == null ? "other" : "0"}
                    onChange={(e) => changeDefinition(e.target.value)}
                    className="border p-2 rounded bg-white"
                  >
                    <option value="other">Other</option>
                  </select>
                )}
              </label>

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs text-gray-600">Meaning</span>
                <textarea
                  value={editMeaning}
                  onChange={(e) => setEditMeaning(e.target.value)}
                  className="border p-2 rounded min-h-[90px]"
                />
                {editMeaningChoices.length > 1 ? (
                  <p className="text-[11px] text-gray-500">
                    Tip: changing “Definition #” will overwrite Meaning to match that definition.
                  </p>
                ) : null}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Chapter #</span>
                <input
                  value={editChapterNum}
                  onChange={(e) => setEditChapterNum(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Chapter title</span>
                <input
                  value={editChapterName}
                  onChange={(e) => setEditChapterName(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Page</span>
                <input
                  value={editPage}
                  onChange={(e) => setEditPage(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>

              <label className="flex items-start gap-2 text-sm text-stone-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={editHideKanjiInReadingSupport}
                  onChange={(e) => setEditHideKanjiInReadingSupport(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Hide kanji in Reading Support</span>
                  <span className="block text-xs text-stone-500">Use kana to match the book.</span>
                </span>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeEdit}
                disabled={editSaving}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving || !editSurface.trim()}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-2 mb-4 w-full border-b border-gray-300 pb-4">
        <p className="text-sm text-gray-500 text-center">
          The words you’ve added from this book, organized in reading order to support your reading.
        </p>
        <p className="mt-1 text-sm text-stone-500 text-center">
          Use search, chapter filters, and hidden-word mode to focus the list.
        </p>
      </div>

      <div
        ref={stickyControlsRef}
        className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur"
      >
        <div className="grid gap-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <button
            type="button"
            onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
            className="flex min-w-0 items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-left shadow-sm transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
            title="Open Book Hub"
          >
            {bookCover ? (
              <img
                src={bookCover}
                alt={bookTitle || "Book cover"}
                className="h-20 w-14 shrink-0 rounded-lg object-cover shadow-sm"
              />
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                For Book
              </p>
              <h1 className="mt-1 break-words text-2xl font-semibold leading-tight text-stone-900">
                {bookTitle || "Words"}
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Total: {words.length} • Showing: {filteredSorted.length}
              </p>
              <p className="mt-3 text-sm font-medium text-emerald-700">
                Open Book Hub
              </p>
            </div>
          </button>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="min-w-0">
                <div className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  Switch Book
                </div>
                <select
                  value={userBookId}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (!newValue) return;

                    if (newValue === "all-vocab") {
                      router.push("/vocab");
                      return;
                    }

                    if (newValue === userBookId) return;
                    router.push(`/books/${encodeURIComponent(newValue)}/words`);
                  }}
                  className="h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                >
                  <option value="all-vocab">All Vocab Lists</option>

                  {currentlyReadingOptions.length > 0 ? (
                    <optgroup label="Currently Reading">
                      {currentlyReadingOptions.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}

                  {otherBookOptions.length > 0 ? (
                    <optgroup label="Other Books">
                      {otherBookOptions.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </div>

              <div className="min-w-0">
                <div className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  Search
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try 犬, いぬ, dog, p45, etc."
                  className="h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="flex h-14 items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 shadow-sm">
                <input
                  type="checkbox"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                  className="h-5 w-5 rounded border-stone-300 text-stone-900 focus:ring-stone-300"
                />
                <span className="font-medium">Hidden Words Only</span>
              </label>

              <div className="min-w-0">
                <select
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                  className="h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                >
                  <option value="all">All chapters</option>
                  {chapterOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {reordering ? (
        <p className="mb-2 text-sm text-stone-500">Saving new order…</p>
      ) : (
        <p className="mb-2 text-sm text-stone-500">
          Drag words by ☰ to adjust their reading order.
        </p>
      )}

      <div className="relative overflow-x-auto overflow-y-visible rounded border bg-white">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th
                className="sticky z-20 w-10 bg-gray-50 p-2"
                style={headerStickyStyle}
                title="Drag to reorder within the same page"
              >
                ↕
              </th>

              <th
                className="sticky z-20 w-5 bg-gray-50 p-2 text-center"
                style={headerStickyStyle}
                title="How many times this word appears in this book (same word + same definition)"
              >
                <span className="block leading-tight">
                  <span className="block">Book</span>
                  <span className="block">Repeats</span>
                </span>
              </th>

              <th
                className="sticky z-20 w-5 bg-gray-50 p-2 text-center"
                style={headerStickyStyle}
                title="Library Study color from encounters across saved books"
              >
                <span className="block leading-tight">
                  <span className="block">Library</span>
                  <span className="block">Encounters</span>
                </span>
              </th>

              <th className="sticky z-20 w-20 bg-gray-50 p-2" style={headerStickyStyle}>
                Word
              </th>
              <th className="sticky z-20 w-30 bg-gray-50 p-2" style={headerStickyStyle}>
                Reading
              </th>
              <th className="sticky z-20 w-60 bg-gray-50 p-2" style={headerStickyStyle}>
                Meaning
              </th>
              <th className="sticky z-20 w-10 bg-gray-50 p-2" style={headerStickyStyle}>
                Def #
              </th>
              <th className="sticky z-20 w-5 bg-gray-50 p-2" style={headerStickyStyle}>
                Chapter
              </th>
              <th className="sticky z-20 w-10 bg-gray-50 p-2" style={headerStickyStyle}>
                Page
              </th>
              <th className="sticky z-20 w-25 bg-gray-50 p-2" style={headerStickyStyle}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredSorted.map((w) => {
              const rep = repeatCounts.get(repeatKey(w)) ?? 0;
              const globalEncounterCount =
                globalEncounterCounts[studyIdentityKey(w.surface, w.reading)] ?? rep;
              const status = computeLibraryStudyColorStatus({
                encounterCount: globalEncounterCount,
                settings: learningSettings,
              });

              return (
                <tr
                  key={w.id}
                  draggable
                  onDragStart={() => {
                    setDraggingId(w.id);
                    setDropTargetId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggingId && draggingId !== w.id) {
                      setDropTargetId(w.id);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();

                    const scrollY = window.scrollY;

                    if (draggingId && draggingId !== w.id) {
                      await moveWordInGroup(draggingId, w.id);
                    }

                    setDraggingId(null);
                    setDropTargetId(null);

                    requestAnimationFrame(() => {
                      window.scrollTo({ top: scrollY });
                    });
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropTargetId(null);
                  }}
                  className={`border-t ${w.hidden ? "bg-gray-50 text-gray-400" : ""} ${dropTargetId === w.id ? "bg-blue-50" : ""
                    } ${draggingId === w.id ? "opacity-50" : ""}`}
                >
                  <td
                    className="cursor-grab select-none p-2 text-center text-gray-400"
                    title="Drag to reorder within this page"
                  >
                    ☰
                  </td>

                  <td className="p-2 text-center text-xs text-gray-600">
                    {rep > 1 ? rep : ""}
                  </td>

                  <td className="p-2 text-center text-xs text-gray-600 align-middle">
                    <span className="mx-auto flex w-8 -translate-x-1 items-center justify-center">
                      <LibraryStudyStatusBadge
                        status={status}
                        showNumbers={learningSettings.show_badge_numbers}
                        encounterCount={globalEncounterCount}
                      />
                    </span>
                  </td>

                  <td className="p-2 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {w.surface}
                      {isKatakanaOnly(w.surface) ? <KatakanaBadge /> : null}
                    </span>
                  </td>
                  <td className="p-2">{w.reading ?? "—"}</td>

                  <td className="p-2">
                    <div>{w.meaning ?? "—"}</div>
                  </td>

                  <td className="p-2 text-center">
                    {w.meaning_choice_index != null
                      ? w.meaning_choice_index + 1
                      : w.meaning
                        ? "O"
                        : "—"}
                  </td>

                  <td className="p-2">
                    {(() => {
                      const ch = chapterDisplayParts(w);
                      if (ch.num && ch.name) {
                        return (
                          <span className="leading-tight">
                            <span className="block">{ch.num}</span>
                            <span className="block text-gray-600">{ch.name}</span>
                          </span>
                        );
                      }
                      return ch.fallback;
                    })()}
                  </td>

                  <td className="p-2">{w.page_number ?? "—"}</td>

                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          router.push(`/books/${encodeURIComponent(userBookId)}/words/${w.id}`)
                        }
                        className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                        title="Open word card"
                      >
                        Open
                      </button>

                      <>
                        <button
                          onClick={() => openEdit(w)}
                          className="rounded bg-blue-400 px-2 py-1 text-xs hover:bg-green-500"
                        >
                          Edit
                        </button>

                        {w.hidden ? (
                          <button
                            onClick={() => unhideWord(w)}
                            className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-800"
                          >
                            Unhide
                          </button>
                        ) : (
                          <button
                            onClick={() => hideWord(w)}
                            className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700"
                          >
                            Hide
                          </button>
                        )}

                        <button
                          onClick={() => deleteWord(w)}
                          className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredSorted.length === 0 ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={10}>
                  No words match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
