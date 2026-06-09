// Teacher Kanji Enrichment Queue
//

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import TeacherKanjiHeader from "./components/TeacherKanjiHeader";
import TeacherKanjiAccessState from "./components/TeacherKanjiAccessState";
import TeacherKanjiLoadingState from "./components/TeacherKanjiLoadingState";
import TeacherKanjiMessageBanner from "./components/TeacherKanjiMessageBanner";
import TeacherKanjiSummaryCards from "./components/TeacherKanjiSummaryCards";
import TeacherKanjiEmptyState from "./components/TeacherKanjiEmptyState";
import TeacherKanjiFilterBar from "./components/TeacherKanjiFilterBar";
import TeacherKanjiBulkActionBar from "./components/TeacherKanjiBulkActionBar";
import TeacherKanjiStatusBadge from "./components/TeacherKanjiStatusBadge";
import TeacherKanjiRowCounts from "./components/TeacherKanjiRowCounts";
import TeacherKanjiWordCell from "./components/TeacherKanjiWordCell";
import TeacherKanjiStudentCell from "./components/TeacherKanjiStudentCell";
import TeacherKanjiBookCell from "./components/TeacherKanjiBookCell";
import TeacherKanjiQueueActions from "./components/TeacherKanjiQueueActions";
import TeacherKanjiQueueItem from "./components/TeacherKanjiQueueItem";

const KANJI_ENRICHMENT_TEST_START = "2026-04-20T00:00:00";
const BULK_OPEN_LIMIT = 10;

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  role: string | null;
  is_super_teacher?: boolean | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  book_id: string;
  status: string | null;
  created_at: string | null;
  books:
  | {
    id: string;
    title: string | null;
  }
  | {
    id: string;
    title: string | null;
  }[]
  | null;
};

type WordRow = {
  id: string;
  user_book_id: string;
  surface: string | null;
  reading: string | null;
  vocabulary_cache_id: number | null;
  created_at: string | null;
  ignore_kanji_enrichment?: boolean | null;
};

type KanjiMapRow = {
  id: number;
  vocabulary_cache_id: number;
  kanji: string;
  kanji_position: number;
  reading_type: "on" | "kun" | "other" | null;
  base_reading: string | null;
  realized_reading: string | null;
  flagged_for_review?: boolean | null;
  flagged_at?: string | null;
  excluded_from_kanji_practice?: boolean | null;
};

type VocabularyCacheRow = {
  id: number;
  surface: string | null;
  reading: string | null;
};

type QueueStatus =
  | "flagged_review"
  | "missing_cache"
  | "missing_rows"
  | "missing_positions"
  | "incomplete_rows"
  | "cleanup"
  | "complete"
  | "excluded";

type StatusFilter =
  | "all"
  | "active"
  | "flagged_review"
  | "needs_reading"
  | "needs_work"
  | "complete"
  | "excluded";

type QueueItem = {
  userBookWordId: string;
  userBookId: string;
  userId: string;
  studentName: string;
  username: string | null;
  bookTitle: string;
  surface: string;
  reading: string;
  vocabularyCacheId: number | null;
  createdAt: string | null;
  kanjiCount: number;
  mapRowCount: number;
  completePositionCount: number;
  incompleteRowCount: number;
  flaggedMapRowCount: number;
  status: QueueStatus;
};

function hasKanji(value: string) {
  return /[\p{Script=Han}]/u.test(value);
}

function kanjiChars(value: string) {
  return Array.from(value).filter((ch) => /\p{Script=Han}/u.test(ch));
}

function hiraToKata(text: string) {
  return text.replace(/[\u3041-\u3096]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

function getBookTitle(book: UserBookRow["books"]) {
  if (Array.isArray(book)) return book[0]?.title ?? "Untitled";
  return book?.title ?? "Untitled";
}

function statusLabel(status: QueueStatus) {
  switch (status) {
    case "flagged_review":
      return "Flagged";
    case "missing_cache":
    case "missing_rows":
    case "missing_positions":
      return "Needs work";
    case "incomplete_rows":
      return "Needs reading";
    case "cleanup":
      return "Needs reading";
    case "complete":
      return "Complete";
    case "excluded":
      return "Excluded";
    default:
      return status;
  }
}

function statusTone(status: QueueStatus) {
  switch (status) {
    case "flagged_review":
      return "border-red-200 bg-red-50 text-red-700";
    case "missing_cache":
    case "missing_rows":
    case "missing_positions":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "incomplete_rows":
    case "cleanup":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "complete":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "excluded":
      return "border-stone-200 bg-stone-100 text-stone-600";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

function statusDetailLabel(status: QueueStatus) {
  switch (status) {
    case "flagged_review":
      return "Flagged from Kanji Study";
    case "missing_cache":
      return "Choose whether to include it";
    case "missing_rows":
      return "Open editor to make rows";
    case "missing_positions":
      return "Open editor to add missing kanji";
    case "incomplete_rows":
      return "Needs reading details";
    case "cleanup":
      return "Check extra rows";
    case "complete":
      return "Complete";
    case "excluded":
      return "Hidden from kanji readings";
    default:
      return status;
  }
}

function isNeedsReadingStatus(status: QueueStatus) {
  return status === "incomplete_rows" || status === "cleanup";
}

function isNeedsWorkStatus(status: QueueStatus) {
  return status === "missing_cache" || status === "missing_rows" || status === "missing_positions";
}

function isActiveStatus(status: QueueStatus) {
  return status !== "complete" && status !== "excluded";
}

function effectiveReadingType(row: Pick<KanjiMapRow, "reading_type" | "base_reading" | "realized_reading">) {
  if (row.reading_type) return row.reading_type;
  return row.base_reading?.trim() && row.realized_reading?.trim() ? "on" : null;
}

function getQueueStatus(params: {
  vocabularyCacheId: number | null;
  surface: string;
  mapRows: KanjiMapRow[];
  ignored?: boolean | null;
}): {
  status: QueueStatus;
  kanjiCount: number;
  mapRowCount: number;
  completePositionCount: number;
  incompleteRowCount: number;
  flaggedMapRowCount: number;
} {
  const kanjiCount = kanjiChars(params.surface).length;
  const mapRows = params.mapRows;
  const flaggedMapRowCount = mapRows.filter((row) => row.flagged_for_review).length;
  const excludedMapRowCount = mapRows.filter((row) => row.excluded_from_kanji_practice).length;

  if (params.ignored || (mapRows.length > 0 && excludedMapRowCount === mapRows.length)) {
    return {
      status: "excluded",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: 0,
      incompleteRowCount: 0,
      flaggedMapRowCount,
    };
  }

  if (!params.vocabularyCacheId) {
    return {
      status: "missing_cache",
      kanjiCount,
      mapRowCount: 0,
      completePositionCount: 0,
      incompleteRowCount: 0,
      flaggedMapRowCount: 0,
    };
  }

  const completePositions = new Set(
    mapRows
      .filter(
        (row) =>
          typeof row.kanji_position === "number" &&
          !!effectiveReadingType(row) &&
          !!row.base_reading &&
          !!row.realized_reading
      )
      .map((row) => row.kanji_position)
  );

  const incompleteRowCount = mapRows.filter(
    (row) => !effectiveReadingType(row) || !row.base_reading || !row.realized_reading
  ).length;

  if (mapRows.length === 0) {
    return {
      status: "missing_rows",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: completePositions.size,
      incompleteRowCount,
      flaggedMapRowCount,
    };
  }

  if (flaggedMapRowCount > 0) {
    return {
      status: "flagged_review",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: completePositions.size,
      incompleteRowCount,
      flaggedMapRowCount,
    };
  }

  if (completePositions.size < kanjiCount && incompleteRowCount > 0) {
    return {
      status: "incomplete_rows",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: completePositions.size,
      incompleteRowCount,
      flaggedMapRowCount,
    };
  }

  if (completePositions.size < kanjiCount) {
    return {
      status: "missing_positions",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: completePositions.size,
      incompleteRowCount,
      flaggedMapRowCount,
    };
  }

  if (incompleteRowCount > 0) {
    return {
      status: "cleanup",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: completePositions.size,
      incompleteRowCount,
      flaggedMapRowCount,
    };
  }

  return {
    status: "complete",
    kanjiCount,
    mapRowCount: mapRows.length,
    completePositionCount: completePositions.size,
    incompleteRowCount,
    flaggedMapRowCount,
  };
}

export default function TeacherKanjiPage() {
  const [loading, setLoading] = useState(true);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [bulkOpening, setBulkOpening] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [savingEditorId, setSavingEditorId] = useState<string | null>(null);
  const [ignoringId, setIgnoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [studentFilter, setStudentFilter] = useState("all");
  const [bookFilter, setBookFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const [editorOpenByWordId, setEditorOpenByWordId] = useState<Record<string, boolean>>({});
  const [editorRowsByWordId, setEditorRowsByWordId] = useState<Record<string, KanjiMapRow[]>>({});

  async function loadQueue() {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setCanAccess(false);
        setCurrentUserId(null);
        setQueueItems([]);
        setError("Please sign in.");
        return;
      }

      setCurrentUserId(user.id);

      const { data: meProfile, error: meProfileError } = await supabase
        .from("profiles")
        .select("id, display_name, username, role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (meProfileError) throw meProfileError;

      const isTeacher =
        meProfile?.role === "teacher" ||
        meProfile?.role === "super_teacher" ||
        !!meProfile?.is_super_teacher;

      setCanAccess(isTeacher);

      if (!isTeacher) {
        setQueueItems([]);
        return;
      }

      const { data: teacherLinks, error: teacherLinksError } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user.id)
        .is("archived_at", null);

      if (teacherLinksError) {
        console.error("Error loading linked students:", teacherLinksError);
      }

      const studentIds = Array.from(
        new Set([
          user.id,
          ...((teacherLinks ?? [])
            .map((row: any) => row.student_id)
            .filter(Boolean) as string[]),
        ])
      );

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, username, role")
        .in("id", studentIds);

      if (profilesError) throw profilesError;

      const profileById = new Map<string, ProfileRow>();
      for (const profile of (profiles ?? []) as ProfileRow[]) {
        profileById.set(profile.id, profile);
      }

      const { data: userBooks, error: userBooksError } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          book_id,
          status,
          created_at,
          books (
            id,
            title
          )
        `
        )
        .in("user_id", studentIds);

      if (userBooksError) throw userBooksError;

      const books = ((userBooks ?? []) as UserBookRow[]).filter((book) => !!book.id);
      const userBookIds = books.map((book) => book.id);

      if (userBookIds.length === 0) {
        setQueueItems([]);
        return;
      }

      const userBookById = new Map<string, UserBookRow>();
      for (const book of books) {
        userBookById.set(book.id, book);
      }

      const { data: words, error: wordsError } = await supabase
        .from("user_book_words")
        .select(
          "id, user_book_id, surface, reading, vocabulary_cache_id, created_at, ignore_kanji_enrichment"
        )
        .in("user_book_id", userBookIds)
        .eq("is_manual_override", false)
        .gte("created_at", KANJI_ENRICHMENT_TEST_START)
        .limit(5000);

      if (wordsError) throw wordsError;

      const kanjiWords = ((words ?? []) as WordRow[]).filter((word) =>
        hasKanji(word.surface ?? "")
      );

      const cacheIds = Array.from(
        new Set(
          kanjiWords
            .map((word) =>
              word.vocabulary_cache_id == null ? null : Number(word.vocabulary_cache_id)
            )
            .filter((id): id is number => Number.isFinite(id))
        )
      );

      const mapRowsByCacheId = new Map<string, KanjiMapRow[]>();

      if (cacheIds.length > 0) {
        const chunkSize = 100;

        for (let i = 0; i < cacheIds.length; i += chunkSize) {
          const cacheIdChunk = cacheIds.slice(i, i + chunkSize);

          const { data: mapRows, error: mapError } = await supabase
            .from("vocabulary_kanji_map")
            .select(
              "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, flagged_at, excluded_from_kanji_practice"
            )
            .in("vocabulary_cache_id", cacheIdChunk)
            .limit(5000);

          if (mapError) throw mapError;

          for (const row of (mapRows ?? []) as KanjiMapRow[]) {
            const cacheKey = String(row.vocabulary_cache_id);
            const existing = mapRowsByCacheId.get(cacheKey) ?? [];
            existing.push(row);
            mapRowsByCacheId.set(cacheKey, existing);
          }
        }
      }

      const knownCacheIds = new Set(cacheIds.map((id) => String(id)));

      const [
        { data: oldFlaggedRows, error: oldFlaggedRowsError },
        { data: reportRows, error: reportRowsError },
      ] = await Promise.all([
        supabase
          .from("vocabulary_kanji_map")
          .select(
            "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, flagged_at, excluded_from_kanji_practice"
          )
          .eq("flagged_for_review", true)
          .limit(1000),

        supabase
          .from("kanji_map_reports")
          .select("id, vocabulary_kanji_map_id, created_at, status")
          .in("status", ["open", "reviewing"])
          .limit(1000),
      ]);

      if (oldFlaggedRowsError) throw oldFlaggedRowsError;
      if (reportRowsError) throw reportRowsError;

      const reportByKanjiMapId = new Map<number, { created_at: string | null }>();

      const reportedKanjiMapIds = Array.from(
        new Set(
          ((reportRows ?? []) as any[])
            .map((row) => Number(row.vocabulary_kanji_map_id))
            .filter((id) => Number.isFinite(id))
        )
      );

      for (const report of (reportRows ?? []) as any[]) {
        const mapId = Number(report.vocabulary_kanji_map_id);
        if (!Number.isFinite(mapId)) continue;

        reportByKanjiMapId.set(mapId, {
          created_at: report.created_at ?? null,
        });
      }

      let reportedMapRows: KanjiMapRow[] = [];

      if (reportedKanjiMapIds.length > 0) {
        const { data: reportMapRows, error: reportMapRowsError } = await supabase
          .from("vocabulary_kanji_map")
          .select(
            "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, flagged_at, excluded_from_kanji_practice"
          )
          .in("id", reportedKanjiMapIds)
          .limit(1000);

        if (reportMapRowsError) throw reportMapRowsError;

        reportedMapRows = ((reportMapRows ?? []) as KanjiMapRow[]).map((row) => {
          const report = reportByKanjiMapId.get(Number(row.id));

          return {
            ...row,
            // Treat learner reports as "flagged" in the teacher queue,
            // without giving learners direct update access to the global map row.
            flagged_for_review: true,
            flagged_at: row.flagged_at ?? report?.created_at ?? null,
          };
        });
      }

      const flaggedRowsById = new Map<number, KanjiMapRow>();

      for (const row of (oldFlaggedRows ?? []) as KanjiMapRow[]) {
        flaggedRowsById.set(Number(row.id), row);
      }

      for (const row of reportedMapRows) {
        flaggedRowsById.set(Number(row.id), row);
      }

      const flaggedRows = Array.from(flaggedRowsById.values());

      const flaggedCacheIds = Array.from(
        new Set(
          flaggedRows
            .map((row) => Number(row.vocabulary_cache_id))
            .filter((id) => Number.isFinite(id))
        )
      );

      for (const row of flaggedRows) {
        const cacheKey = String(row.vocabulary_cache_id);
        if (knownCacheIds.has(cacheKey)) continue;

        const existing = mapRowsByCacheId.get(cacheKey) ?? [];
        existing.push(row);
        mapRowsByCacheId.set(cacheKey, existing);
      }

      const cacheRowsById = new Map<number, VocabularyCacheRow>();
      const flaggedOnlyCacheIds = flaggedCacheIds.filter(
        (id) => !knownCacheIds.has(String(id))
      );

      if (flaggedOnlyCacheIds.length > 0) {
        const { data: cacheRows, error: cacheRowsError } = await supabase
          .from("vocabulary_cache")
          .select("id, surface, reading")
          .in("id", flaggedOnlyCacheIds);

        if (cacheRowsError) throw cacheRowsError;

        for (const row of (cacheRows ?? []) as VocabularyCacheRow[]) {
          cacheRowsById.set(Number(row.id), row);
        }
      }

      const nextItems: QueueItem[] = kanjiWords.map((word) => {
        const userBook = userBookById.get(word.user_book_id);
        const profile = userBook ? profileById.get(userBook.user_id) : null;
        const surface = String(word.surface ?? "");
        const reading = String(word.reading ?? "");
        const mapRows =
          word.vocabulary_cache_id != null
            ? mapRowsByCacheId.get(String(Number(word.vocabulary_cache_id))) ?? []
            : [];

        const statusInfo = getQueueStatus({
          vocabularyCacheId: word.vocabulary_cache_id,
          surface,
          mapRows,
          ignored: word.ignore_kanji_enrichment,
        });

        return {
          userBookWordId: word.id,
          userBookId: word.user_book_id,
          userId: userBook?.user_id ?? "",
          studentName:
            profile?.display_name ||
            profile?.username ||
            (userBook?.user_id === user.id ? "Me" : "Unknown student"),
          username: profile?.username ?? null,
          bookTitle: getBookTitle(userBook?.books ?? null),
          surface,
          reading,
          vocabularyCacheId: word.vocabulary_cache_id,
          createdAt: word.created_at,
          ...statusInfo,
        };
      });

      for (const cacheId of flaggedOnlyCacheIds) {
        const cacheRow = cacheRowsById.get(cacheId);
        const surface = String(cacheRow?.surface ?? "");
        if (!surface || !hasKanji(surface)) continue;

        const mapRows = mapRowsByCacheId.get(String(cacheId)) ?? [];
        const statusInfo = getQueueStatus({
          vocabularyCacheId: cacheId,
          surface,
          mapRows,
        });

        nextItems.push({
          userBookWordId: `cache:${cacheId}`,
          userBookId: "",
          userId: "",
          studentName: "Shared kanji bank",
          username: null,
          bookTitle: "Flagged from Kanji Study",
          surface,
          reading: String(cacheRow?.reading ?? ""),
          vocabularyCacheId: cacheId,
          createdAt: null,
          ...statusInfo,
        });
      }

      function createdAtTime(item: QueueItem) {
        if (!item.createdAt) return Number.POSITIVE_INFINITY;
        const time = new Date(item.createdAt).getTime();
        return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
      }

      nextItems.sort((a, b) => {
        const aDone = a.status === "complete" || a.status === "excluded";
        const bDone = b.status === "complete" || b.status === "excluded";
        const aFlagged = a.status === "flagged_review";
        const bFlagged = b.status === "flagged_review";
        const createdAtDifference = createdAtTime(a) - createdAtTime(b);

        if (aFlagged !== bFlagged) return aFlagged ? -1 : 1;
        if (aDone !== bDone) return aDone ? 1 : -1;
        if (createdAtDifference !== 0) return createdAtDifference;
        if (a.studentName !== b.studentName) return a.studentName.localeCompare(b.studentName);
        if (a.bookTitle !== b.bookTitle) return a.bookTitle.localeCompare(b.bookTitle);
        return a.surface.localeCompare(b.surface);
      });

      setQueueItems(nextItems);
    } catch (err: any) {
      console.error("Error loading teacher kanji queue:", err);
      setError(err?.message ?? "Could not load kanji enrichment queue.");
      setQueueItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  const studentOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of queueItems) {
      if (!item.userId) continue;
      map.set(item.userId, item.studentName);
    }

    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [queueItems]);

  const bookOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of queueItems) {
      if (!item.userBookId) continue;
      map.set(item.userBookId, item.bookTitle);
    }

    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [queueItems]);

  const filteredItems = useMemo(() => {
    return queueItems.filter((item) => {
      if (studentFilter !== "all" && item.userId !== studentFilter) return false;
      if (bookFilter !== "all" && item.userBookId !== bookFilter) return false;

      if (statusFilter === "active") {
        return isActiveStatus(item.status);
      }

      if (statusFilter === "flagged_review") return item.status === "flagged_review";
      if (statusFilter === "needs_reading") return isNeedsReadingStatus(item.status);
      if (statusFilter === "needs_work") return isNeedsWorkStatus(item.status);
      if (statusFilter === "complete") return item.status === "complete";
      if (statusFilter === "excluded") return item.status === "excluded";
      if (statusFilter !== "all") return false;

      return true;
    });
  }, [queueItems, studentFilter, bookFilter, statusFilter]);

  const bulkOpenItems = useMemo(() => {
    return filteredItems
      .filter((item) => isActiveStatus(item.status))
      .slice(0, BULK_OPEN_LIMIT);
  }, [filteredItems]);

  const openEditorItems = useMemo(() => {
    return queueItems.filter(
      (item) =>
        item.status !== "excluded" &&
        editorOpenByWordId[item.userBookWordId] &&
        (editorRowsByWordId[item.userBookWordId] ?? []).length > 0
    );
  }, [queueItems, editorOpenByWordId, editorRowsByWordId]);

  const summary = useMemo(() => {
    const active = queueItems.filter((item) => isActiveStatus(item.status));

    return {
      total: queueItems.length,
      active: active.length,
      flagged: queueItems.filter((item) => item.status === "flagged_review").length,
      needsReading: queueItems.filter((item) => isNeedsReadingStatus(item.status)).length,
      needsWork: queueItems.filter((item) => isNeedsWorkStatus(item.status)).length,
      complete: queueItems.filter((item) => item.status === "complete").length,
      excluded: queueItems.filter((item) => item.status === "excluded").length,
    };
  }, [queueItems]);

  async function ensureKanjiRows(item: QueueItem) {
    const surface = item.surface.trim();
    const reading = item.reading.trim();
    const isCacheOnlyItem = item.userBookWordId.startsWith("cache:");

    if (!surface) {
      throw new Error("This word has no surface text.");
    }

    let cacheId = item.vocabularyCacheId ?? null;

    if (!cacheId) {
      const { data: existingCache, error: cacheLookupError } = await supabase
        .from("vocabulary_cache")
        .select("id")
        .eq("surface", surface)
        .eq("reading", reading)
        .maybeSingle();

      if (cacheLookupError) throw cacheLookupError;
      cacheId = existingCache?.id ?? null;
    }

    if (!cacheId) {
      const { data: createdCache, error: createCacheError } = await supabase
        .from("vocabulary_cache")
        .insert({
          surface,
          reading,
        })
        .select("id")
        .single();

      if (createCacheError) throw createCacheError;
      cacheId = createdCache.id;
    }

    if (!isCacheOnlyItem) {
      const { error: updateWordError } = await supabase
        .from("user_book_words")
        .update({
          vocabulary_cache_id: cacheId,
          is_manual_override: false,
          ignore_kanji_enrichment: false,
        })
        .eq("id", item.userBookWordId);

      if (updateWordError) throw updateWordError;
    }

    const chars = kanjiChars(surface);

    const { data: existingRows, error: existingRowsError } = await supabase
      .from("vocabulary_kanji_map")
      .select("id, kanji, kanji_position")
      .eq("vocabulary_cache_id", cacheId);

    if (existingRowsError) throw existingRowsError;

    const existingByPosition = new Map<number, { id: number; kanji: string | null }>();

    for (const row of existingRows ?? []) {
      existingByPosition.set(Number((row as any).kanji_position), {
        id: Number((row as any).id),
        kanji: (row as any).kanji ?? null,
      });
    }

    const missingRows = chars
      .map((kanji, index) => ({
        vocabulary_cache_id: cacheId,
        kanji,
        kanji_position: index,
        reading_type: "on",
      }))
      .filter((row) => !existingByPosition.has(row.kanji_position));

    if (missingRows.length > 0) {
      const { error: insertError } = await supabase
        .from("vocabulary_kanji_map")
        .insert(missingRows);

      if (insertError) throw insertError;
    }

    for (const [index, kanji] of chars.entries()) {
      const existing = existingByPosition.get(index);

      if (existing && existing.kanji !== kanji) {
        const { error: updateKanjiError } = await supabase
          .from("vocabulary_kanji_map")
          .update({ kanji })
          .eq("id", existing.id);

        if (updateKanjiError) throw updateKanjiError;
      }
    }

    return cacheId;
  }

  async function loadEditorRows(cacheId: number) {
    const { data: rows, error: rowsError } = await supabase
      .from("vocabulary_kanji_map")
      .select(
        "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, flagged_at"
      )
      .eq("vocabulary_cache_id", cacheId)
      .order("kanji_position", { ascending: true });

    if (rowsError) throw rowsError;

    return (rows ?? []) as KanjiMapRow[];
  }

  async function openKanjiEditor(item: QueueItem) {
    setPreparingId(item.userBookWordId);
    setError(null);

    try {
      const cacheId = await ensureKanjiRows(item);
      const rows = await loadEditorRows(cacheId);

      setEditorRowsByWordId((prev) => ({
        ...prev,
        [item.userBookWordId]: rows,
      }));

      setEditorOpenByWordId((prev) => ({
        ...prev,
        [item.userBookWordId]: true,
      }));

      await loadQueue();
    } catch (err: any) {
      console.error("Error opening kanji editor:", err);
      setError(err?.message ?? "Could not open kanji editor.");
    } finally {
      setPreparingId(null);
    }
  }

  async function openFirstVisibleBatch() {
    if (bulkOpenItems.length === 0) return;

    const ok = window.confirm(
      `Open editors for the first ${bulkOpenItems.length} visible item${bulkOpenItems.length === 1 ? "" : "s"
      } that need attention?`
    );

    if (!ok) return;

    setBulkOpening(true);
    setError(null);

    try {
      const nextRowsByWordId: Record<string, KanjiMapRow[]> = {};
      const nextOpenByWordId: Record<string, boolean> = {};

      for (const item of bulkOpenItems) {
        const cacheId = await ensureKanjiRows(item);
        const rows = await loadEditorRows(cacheId);

        nextRowsByWordId[item.userBookWordId] = rows;
        nextOpenByWordId[item.userBookWordId] = true;
      }

      setEditorRowsByWordId((prev) => ({
        ...prev,
        ...nextRowsByWordId,
      }));

      setEditorOpenByWordId((prev) => ({
        ...prev,
        ...nextOpenByWordId,
      }));

      await loadQueue();
    } catch (err: any) {
      console.error("Error opening bulk kanji editors:", err);
      setError(err?.message ?? "Could not open the batch.");
    } finally {
      setBulkOpening(false);
    }
  }

  function updateEditorRow(
    userBookWordId: string,
    rowId: number,
    field: keyof Pick<KanjiMapRow, "reading_type" | "base_reading" | "realized_reading">,
    value: string
  ) {
    setEditorRowsByWordId((prev) => ({
      ...prev,
      [userBookWordId]: (prev[userBookWordId] ?? []).map((row) => {
        if (row.id !== rowId) return row;

        if (field === "reading_type") {
          return {
            ...row,
            reading_type: value ? (value as "on" | "kun" | "other") : null,
          };
        }

        const nextValue = value.trim() ? value : null;

        if (field === "base_reading") {
          const shouldSyncRealized =
            !row.realized_reading || row.realized_reading === row.base_reading;

          return {
            ...row,
            base_reading: nextValue,
            realized_reading: shouldSyncRealized ? nextValue : row.realized_reading,
          };
        }

        return {
          ...row,
          [field]: nextValue,
        };
      }),
    }));
  }

  async function saveKanjiRowsForItem(item: QueueItem) {
    const rows = editorRowsByWordId[item.userBookWordId] ?? [];
    if (rows.length === 0) return;

    for (const row of rows) {
      const { error: saveError } = await supabase
        .from("vocabulary_kanji_map")
        .update({
          reading_type: row.reading_type ?? "on",
          base_reading: row.base_reading,
          realized_reading: row.realized_reading,
        })
        .eq("id", row.id);

      if (saveError) throw saveError;
    }

    if (item.vocabularyCacheId && item.flaggedMapRowCount > 0) {
      const { error: clearFlagError } = await supabase
        .from("vocabulary_kanji_map")
        .update({ flagged_for_review: false })
        .eq("vocabulary_cache_id", item.vocabularyCacheId);

      if (clearFlagError) throw clearFlagError;
    }

    if (item.vocabularyCacheId) {
      await updateKanjiReportsForCache(item.vocabularyCacheId, "resolved");
    }
  }

  async function updateKanjiReportsForCache(
    vocabularyCacheId: number,
    status: "resolved" | "dismissed"
  ) {
    const { data: mapRows, error: mapRowsError } = await supabase
      .from("vocabulary_kanji_map")
      .select("id")
      .eq("vocabulary_cache_id", vocabularyCacheId);

    if (mapRowsError) throw mapRowsError;

    const mapIds = (mapRows ?? [])
      .map((row: any) => Number(row.id))
      .filter((id) => Number.isFinite(id));

    if (mapIds.length === 0) return;

    const { error: reportUpdateError } = await supabase
      .from("kanji_map_reports")
      .update({ status })
      .in("vocabulary_kanji_map_id", mapIds)
      .in("status", ["open", "reviewing"]);

    if (reportUpdateError) throw reportUpdateError;
  }

  async function saveAllOpenEditors() {
    const itemsToSave = openEditorItems;

    if (itemsToSave.length === 0) return;

    const ok = window.confirm(
      `Save readings for ${itemsToSave.length} open editor${itemsToSave.length === 1 ? "" : "s"
      }?`
    );

    if (!ok) return;

    setBulkSaving(true);
    setError(null);

    try {
      for (const item of itemsToSave) {
        await saveKanjiRowsForItem(item);
      }

      await loadQueue();

      setEditorOpenByWordId((prev) => {
        const next = { ...prev };

        for (const item of itemsToSave) {
          next[item.userBookWordId] = false;
        }

        return next;
      });

      setEditorRowsByWordId((prev) => {
        const next = { ...prev };

        for (const item of itemsToSave) {
          delete next[item.userBookWordId];
        }

        return next;
      });

      setSaveMessage(
        `Saved readings for ${itemsToSave.length} word${itemsToSave.length === 1 ? "" : "s"
        }.`
      );

      window.setTimeout(() => setSaveMessage(null), 2500);
    } catch (err: any) {
      console.error("Error saving all open kanji editors:", err);
      setError(err?.message ?? "Could not save all open kanji rows.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function saveEditorRows(item: QueueItem) {
    const rows = editorRowsByWordId[item.userBookWordId] ?? [];
    if (rows.length === 0) return;

    setSavingEditorId(item.userBookWordId);
    setError(null);

    try {
      await saveKanjiRowsForItem(item);

      await loadQueue();

      setEditorOpenByWordId((prev) => ({
        ...prev,
        [item.userBookWordId]: false,
      }));

      setEditorRowsByWordId((prev) => {
        const next = { ...prev };
        delete next[item.userBookWordId];
        return next;
      });

      setSaveMessage(`Saved readings for ${item.surface}.`);
      window.setTimeout(() => setSaveMessage(null), 2500);
    } catch (err: any) {
      console.error("Error saving kanji editor rows:", err);
      setError(err?.message ?? "Could not save kanji rows.");
    } finally {
      setSavingEditorId(null);
    }
  }

  async function ignoreWord(item: QueueItem) {
    const ok = window.confirm(`Exclude ${item.surface} from kanji readings?`);
    if (!ok) return;

    setIgnoringId(item.userBookWordId);
    setError(null);

    try {
      if (item.vocabularyCacheId) {
        const { error: excludeError } = await supabase
          .from("vocabulary_kanji_map")
          .update({
            excluded_from_kanji_practice: true,
            flagged_for_review: false,
          })
          .eq("vocabulary_cache_id", item.vocabularyCacheId);

        if (excludeError) throw excludeError;

        await updateKanjiReportsForCache(item.vocabularyCacheId, "dismissed");
      }

      if (!item.userBookWordId.startsWith("cache:")) {
        const { error: ignoreError } = await supabase
          .from("user_book_words")
          .update({
            ignore_kanji_enrichment: true,
            kanji_enrichment_ignore_reason: "Ignored from Teacher Kanji page",
            kanji_enrichment_ignored_at: new Date().toISOString(),
            kanji_enrichment_ignored_by: currentUserId,
          })
          .eq("id", item.userBookWordId);

        if (ignoreError) throw ignoreError;
      }

      setEditorOpenByWordId((prev) => ({
        ...prev,
        [item.userBookWordId]: false,
      }));
      setEditorRowsByWordId((prev) => {
        const next = { ...prev };
        delete next[item.userBookWordId];
        return next;
      });

      await loadQueue();
      setSaveMessage(`Removed ${item.surface} from kanji readings.`);
      window.setTimeout(() => setSaveMessage(null), 2500);
    } catch (err: any) {
      console.error("Error ignoring kanji queue item:", err);
      setError(err?.message ?? "Could not remove this word from the queue.");
    } finally {
      setIgnoringId(null);
    }
  }

  async function clearKanjiFlag(item: QueueItem) {
    if (!item.vocabularyCacheId) {
      setError("This flagged word has no vocabulary cache id.");
      return;
    }

    setIgnoringId(item.userBookWordId);
    setError(null);

    try {
      const { error: clearFlagError } = await supabase
        .from("vocabulary_kanji_map")
        .update({ flagged_for_review: false })
        .eq("vocabulary_cache_id", item.vocabularyCacheId);

      if (clearFlagError) throw clearFlagError;

      await updateKanjiReportsForCache(item.vocabularyCacheId, "dismissed");

      await loadQueue();
      setSaveMessage(`Cleared the kanji flag for ${item.surface}.`);
      window.setTimeout(() => setSaveMessage(null), 2500);
    } catch (err: any) {
      console.error("Error clearing kanji flag:", err);
      setError(err?.message ?? "Could not clear this kanji flag.");
    } finally {
      setIgnoringId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <TeacherKanjiHeader homeHref="/teacher" />

      {loading ? (
        <TeacherKanjiLoadingState />
      ) : !canAccess ? (
        <TeacherKanjiAccessState />
      ) : (
        <>
          <TeacherKanjiMessageBanner type="error" message={error} />
          <TeacherKanjiMessageBanner type="success" message={saveMessage} />


          <TeacherKanjiSummaryCards summary={summary} />

          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
            <TeacherKanjiFilterBar
              studentFilter={studentFilter}
              bookFilter={bookFilter}
              statusFilter={statusFilter}
              studentOptions={studentOptions}
              bookOptions={bookOptions}
              onStudentFilterChange={setStudentFilter}
              onBookFilterChange={setBookFilter}
              onStatusFilterChange={(value) => setStatusFilter(value as StatusFilter)}
            />

            <TeacherKanjiBulkActionBar
              bulkOpenLimit={BULK_OPEN_LIMIT}
              bulkOpenCount={bulkOpenItems.length}
              openEditorCount={openEditorItems.length}
              bulkOpening={bulkOpening}
              bulkSaving={bulkSaving}
              onOpenBatch={() => void openFirstVisibleBatch()}
              onSaveAll={() => void saveAllOpenEditors()}
            />
          </section>

          {openEditorItems.length > 0 ? (
            <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-emerald-900">
                    Open kanji editors
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    All opened words stay together here so the kanji rows do not get scattered through the queue.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditorOpenByWordId((prev) => {
                      const next = { ...prev };
                      for (const item of openEditorItems) {
                        next[item.userBookWordId] = false;
                      }
                      return next;
                    })
                  }
                  className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  Close all editors
                </button>
              </div>

              <div className="mt-4 grid gap-4">
                {openEditorItems.map((item) => (
                  <div
                    key={item.userBookWordId}
                    className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-3xl font-semibold leading-tight text-stone-900 md:text-4xl">
                          {item.surface}
                        </p>
                        {item.reading ? (
                          <div className="mt-2 flex flex-wrap gap-2 text-base font-semibold md:text-lg">
                            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-600">
                              {item.reading}
                            </span>
                            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-600">
                              {hiraToKata(item.reading)}
                            </span>
                          </div>
                        ) : null}
                        <p className="mt-1 text-xs leading-5 text-stone-500">
                          {item.studentName} · {item.bookTitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEditorOpenByWordId((prev) => ({
                            ...prev,
                            [item.userBookWordId]: false,
                          }))
                        }
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                      >
                        Close
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(editorRowsByWordId[item.userBookWordId] ?? []).map((row) => (
                        <div
                          key={row.id}
                          className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[80px_140px_1fr_1fr]"
                        >
                          <div>
                            <div className="text-xs font-semibold text-stone-500">
                              Kanji
                            </div>
                            <div className="mt-1 text-3xl font-semibold text-stone-900">
                              {row.kanji}
                            </div>
                          </div>

                          <label className="text-sm">
                            <span className="mb-1 block text-xs font-semibold text-stone-500">
                              Type
                            </span>
                            <select
                              value={row.reading_type ?? "on"}
                              onChange={(event) =>
                                updateEditorRow(
                                  item.userBookWordId,
                                  row.id,
                                  "reading_type",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value="on">On</option>
                              <option value="kun">Kun</option>
                              <option value="other">Other</option>
                            </select>
                          </label>

                          <label className="text-sm">
                            <span className="mb-1 block text-xs font-semibold text-stone-500">
                              Base reading
                            </span>
                            <input
                              value={row.base_reading ?? ""}
                              onChange={(event) =>
                                updateEditorRow(
                                  item.userBookWordId,
                                  row.id,
                                  "base_reading",
                                  event.target.value
                                )
                              }
                              placeholder="ところ"
                              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                            />
                            {row.base_reading ? (
                              <div className="mt-1 text-xs text-stone-500">
                                {hiraToKata(row.base_reading)}
                              </div>
                            ) : null}
                          </label>

                          <label className="text-sm">
                            <span className="mb-1 block text-xs font-semibold text-stone-500">
                              Realized reading
                            </span>
                            <input
                              value={row.realized_reading ?? ""}
                              onChange={(event) =>
                                updateEditorRow(
                                  item.userBookWordId,
                                  row.id,
                                  "realized_reading",
                                  event.target.value
                                )
                              }
                              placeholder="どころ"
                              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                            />
                            {row.realized_reading ? (
                              <div className="mt-1 text-xs text-stone-500">
                                {hiraToKata(row.realized_reading)}
                              </div>
                            ) : null}
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      {item.flaggedMapRowCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => void clearKanjiFlag(item)}
                          disabled={ignoringId === item.userBookWordId}
                          className="rounded-2xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {ignoringId === item.userBookWordId
                            ? "Clearing…"
                            : "Clear flag only"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void ignoreWord(item)}
                        disabled={ignoringId === item.userBookWordId}
                        className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                      >
                        {ignoringId === item.userBookWordId
                          ? "Removing…"
                          : "Exclude from kanji readings"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void saveEditorRows(item)}
                        disabled={bulkSaving || savingEditorId === item.userBookWordId}
                        className="rounded-2xl border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {savingEditorId === item.userBookWordId
                          ? "Saving…"
                          : "Save readings"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            {filteredItems.length === 0 ? (
              <TeacherKanjiEmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Book</th>
                      <th className="px-4 py-3">Word</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Rows</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {filteredItems.map((item) => (
                      <TeacherKanjiQueueItem
                        key={item.userBookWordId}
                        studentName={item.studentName}
                        username={item.username}
                        bookTitle={item.bookTitle}
                        surface={item.surface}
                        reading={item.reading}
                        katakanaReading={hiraToKata(item.reading)}
                        vocabularyCacheId={item.vocabularyCacheId}
                        statusLabel={statusLabel(item.status)}
                        statusDetail={statusDetailLabel(item.status)}
                        statusToneClassName={statusTone(item.status)}
                        kanjiCount={item.kanjiCount}
                        mapRowCount={item.mapRowCount}
                        completePositionCount={item.completePositionCount}
                        incompleteRowCount={item.incompleteRowCount}
                        flaggedMapRowCount={item.flaggedMapRowCount}
                        isPreparing={preparingId === item.userBookWordId}
                        isEditorOpen={!!editorOpenByWordId[item.userBookWordId]}
                        isIgnoring={ignoringId === item.userBookWordId}
                        onOpenEditor={() => void openKanjiEditor(item)}
                        onClearFlag={() => void clearKanjiFlag(item)}
                        onExclude={() => void ignoreWord(item)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
