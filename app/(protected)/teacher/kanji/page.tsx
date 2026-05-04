// Teacher Kanji Enrichment Queue
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const KANJI_ENRICHMENT_TEST_START = "2026-04-20T00:00:00";

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
};

type KanjiMapRow = {
  id: number;
  vocabulary_cache_id: number;
  kanji: string;
  kanji_position: number;
  reading_type: "on" | "kun" | "other" | null;
  base_reading: string | null;
  realized_reading: string | null;
};

type QueueStatus =
  | "missing_cache"
  | "missing_rows"
  | "missing_positions"
  | "incomplete_rows"
  | "cleanup"
  | "complete";

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
  status: QueueStatus;
};

function hasKanji(value: string) {
  return /[\p{Script=Han}]/u.test(value);
}

function kanjiChars(value: string) {
  return Array.from(value).filter((ch) => /\p{Script=Han}/u.test(ch));
}

function getBookTitle(book: UserBookRow["books"]) {
  if (Array.isArray(book)) return book[0]?.title ?? "Untitled";
  return book?.title ?? "Untitled";
}

function statusLabel(status: QueueStatus) {
  switch (status) {
    case "missing_cache":
      return "No cache row";
    case "missing_rows":
      return "No kanji rows";
    case "missing_positions":
      return "Missing kanji row";
    case "incomplete_rows":
      return "Needs readings";
    case "cleanup":
      return "Cleanup only";
    case "complete":
      return "Complete";
    default:
      return status;
  }
}

function statusTone(status: QueueStatus) {
  switch (status) {
    case "missing_cache":
      return "border-red-200 bg-red-50 text-red-700";
    case "missing_rows":
    case "missing_positions":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "incomplete_rows":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "cleanup":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "complete":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

function getQueueStatus(params: {
  vocabularyCacheId: number | null;
  surface: string;
  mapRows: KanjiMapRow[];
}): {
  status: QueueStatus;
  kanjiCount: number;
  mapRowCount: number;
  completePositionCount: number;
  incompleteRowCount: number;
} {
  const kanjiCount = kanjiChars(params.surface).length;
  const mapRows = params.mapRows;

  if (!params.vocabularyCacheId) {
    return {
      status: "missing_cache",
      kanjiCount,
      mapRowCount: 0,
      completePositionCount: 0,
      incompleteRowCount: 0,
    };
  }

  const completePositions = new Set(
    mapRows
      .filter(
        (row) =>
          typeof row.kanji_position === "number" &&
          !!row.reading_type &&
          !!row.base_reading &&
          !!row.realized_reading
      )
      .map((row) => row.kanji_position)
  );

  const incompleteRowCount = mapRows.filter(
    (row) => !row.reading_type || !row.base_reading || !row.realized_reading
  ).length;

  if (mapRows.length === 0) {
    return {
      status: "missing_rows",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: completePositions.size,
      incompleteRowCount,
    };
  }

  if (completePositions.size < kanjiCount && incompleteRowCount > 0) {
    return {
      status: "incomplete_rows",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: completePositions.size,
      incompleteRowCount,
    };
  }

  if (completePositions.size < kanjiCount) {
    return {
      status: "missing_positions",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: completePositions.size,
      incompleteRowCount,
    };
  }

  if (incompleteRowCount > 0) {
    return {
      status: "cleanup",
      kanjiCount,
      mapRowCount: mapRows.length,
      completePositionCount: completePositions.size,
      incompleteRowCount,
    };
  }

  return {
    status: "complete",
    kanjiCount,
    mapRowCount: mapRows.length,
    completePositionCount: completePositions.size,
    incompleteRowCount,
  };
}

export default function TeacherKanjiPage() {
  const [loading, setLoading] = useState(true);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [ignoringId, setIgnoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [studentFilter, setStudentFilter] = useState("all");
  const [bookFilter, setBookFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"unresolved" | QueueStatus | "all">(
    "unresolved"
  );

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
        .eq("teacher_id", user.id);

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
        .select("id, user_book_id, surface, reading, vocabulary_cache_id, created_at")
        .in("user_book_id", userBookIds)
        .eq("is_manual_override", false)
        .eq("ignore_kanji_enrichment", false)
        .gte("created_at", KANJI_ENRICHMENT_TEST_START);

      if (wordsError) throw wordsError;

      const kanjiWords = ((words ?? []) as WordRow[]).filter((word) =>
        hasKanji(word.surface ?? "")
      );

      const cacheIds = Array.from(
        new Set(
          kanjiWords
            .map((word) => word.vocabulary_cache_id)
            .filter((id): id is number => id != null)
        )
      );

      const mapRowsByCacheId = new Map<number, KanjiMapRow[]>();

      if (cacheIds.length > 0) {
        const { data: mapRows, error: mapError } = await supabase
          .from("vocabulary_kanji_map")
          .select(
            "id, vocabulary_cache_id, kanji, kanji_position, reading_type, base_reading, realized_reading"
          )
          .in("vocabulary_cache_id", cacheIds);

        if (mapError) throw mapError;

        for (const row of (mapRows ?? []) as KanjiMapRow[]) {
          const existing = mapRowsByCacheId.get(row.vocabulary_cache_id) ?? [];
          existing.push(row);
          mapRowsByCacheId.set(row.vocabulary_cache_id, existing);
        }
      }

      const nextItems: QueueItem[] = kanjiWords.map((word) => {
        const userBook = userBookById.get(word.user_book_id);
        const profile = userBook ? profileById.get(userBook.user_id) : null;
        const surface = String(word.surface ?? "");
        const reading = String(word.reading ?? "");
        const mapRows =
          word.vocabulary_cache_id != null
            ? mapRowsByCacheId.get(word.vocabulary_cache_id) ?? []
            : [];

        const statusInfo = getQueueStatus({
          vocabularyCacheId: word.vocabulary_cache_id,
          surface,
          mapRows,
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

      nextItems.sort((a, b) => {
        const aDone = a.status === "complete" || a.status === "cleanup";
        const bDone = b.status === "complete" || b.status === "cleanup";

        if (aDone !== bDone) return aDone ? 1 : -1;
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
      map.set(item.userBookId, item.bookTitle);
    }

    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [queueItems]);

  const filteredItems = useMemo(() => {
    return queueItems.filter((item) => {
      if (studentFilter !== "all" && item.userId !== studentFilter) return false;
      if (bookFilter !== "all" && item.userBookId !== bookFilter) return false;

      if (statusFilter === "unresolved") {
        return item.status !== "complete" && item.status !== "cleanup";
      }

      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      return true;
    });
  }, [queueItems, studentFilter, bookFilter, statusFilter]);

  const summary = useMemo(() => {
    const unresolved = queueItems.filter(
      (item) => item.status !== "complete" && item.status !== "cleanup"
    );

    return {
      total: queueItems.length,
      unresolved: unresolved.length,
      missingCache: queueItems.filter((item) => item.status === "missing_cache").length,
      needsReadings: queueItems.filter((item) => item.status === "incomplete_rows").length,
      missingRows: queueItems.filter(
        (item) => item.status === "missing_rows" || item.status === "missing_positions"
      ).length,
    };
  }, [queueItems]);

  async function prepareRows(item: QueueItem) {
    setPreparingId(item.userBookWordId);
    setError(null);

    try {
      const surface = item.surface.trim();
      const reading = item.reading.trim();

      if (!surface) {
        throw new Error("This word has no surface text.");
      }

      const { data: existingCache, error: cacheLookupError } = await supabase
        .from("vocabulary_cache")
        .select("id")
        .eq("surface", surface)
        .eq("reading", reading)
        .maybeSingle();

      if (cacheLookupError) throw cacheLookupError;

      let cacheId = existingCache?.id ?? null;

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

      const { error: updateWordError } = await supabase
        .from("user_book_words")
        .update({
          vocabulary_cache_id: cacheId,
          is_manual_override: false,
          ignore_kanji_enrichment: false,
        })
        .eq("id", item.userBookWordId);

      if (updateWordError) throw updateWordError;

      const chars = kanjiChars(surface);

      const { data: existingRows, error: existingRowsError } = await supabase
        .from("vocabulary_kanji_map")
        .select("kanji_position")
        .eq("vocabulary_cache_id", cacheId);

      if (existingRowsError) throw existingRowsError;

      const existingPositions = new Set(
        (existingRows ?? []).map((row: any) => Number(row.kanji_position))
      );

      const missingRows = chars
        .map((kanji, index) => ({
          vocabulary_cache_id: cacheId,
          kanji,
          kanji_position: index,
        }))
        .filter((row) => !existingPositions.has(row.kanji_position));

      if (missingRows.length > 0) {
        const { error: insertError } = await supabase
          .from("vocabulary_kanji_map")
          .insert(missingRows);

        if (insertError) throw insertError;
      }

      await loadQueue();
    } catch (err: any) {
      console.error("Error preparing kanji rows:", err);
      setError(err?.message ?? "Could not prepare kanji rows.");
    } finally {
      setPreparingId(null);
    }
  }

  async function ignoreWord(item: QueueItem) {
    const ok = window.confirm(`Remove ${item.surface} from the kanji enrichment queue?`);
    if (!ok) return;

    setIgnoringId(item.userBookWordId);
    setError(null);

    try {
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

      await loadQueue();
    } catch (err: any) {
      console.error("Error ignoring kanji queue item:", err);
      setError(err?.message ?? "Could not ignore this word.");
    } finally {
      setIgnoringId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Teacher Workbench
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
              Kanji Enrichment Queue
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Review saved vocabulary that needs kanji-reading enrichment. This page is now
              the main workspace for kanji enrichment, separate from the Library page.
            </p>
          </div>

          <Link
            href="/teacher"
            className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            ← Teacher Home
          </Link>
        </div>
      </section>

      {loading ? (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          Loading kanji queue…
        </section>
      ) : !canAccess ? (
        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          This page is only available to teachers.
        </section>
      ) : (
        <>
          {error ? (
            <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </section>
          ) : null}

          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-stone-500">Total tracked</p>
              <p className="mt-1 text-2xl font-black text-stone-900">{summary.total}</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs text-amber-700">Unresolved</p>
              <p className="mt-1 text-2xl font-black text-amber-900">{summary.unresolved}</p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <p className="text-xs text-red-700">No cache</p>
              <p className="mt-1 text-2xl font-black text-red-900">{summary.missingCache}</p>
            </div>

            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
              <p className="text-xs text-yellow-700">Needs readings</p>
              <p className="mt-1 text-2xl font-black text-yellow-900">{summary.needsReadings}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-stone-500">Missing rows</p>
              <p className="mt-1 text-2xl font-black text-stone-900">{summary.missingRows}</p>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold text-stone-500">
                  Student
                </span>
                <select
                  value={studentFilter}
                  onChange={(event) => setStudentFilter(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All students</option>
                  {studentOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold text-stone-500">
                  Book
                </span>
                <select
                  value={bookFilter}
                  onChange={(event) => setBookFilter(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All books</option>
                  {bookOptions.map(([id, title]) => (
                    <option key={id} value={id}>
                      {title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold text-stone-500">
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as typeof statusFilter)
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="unresolved">Unresolved only</option>
                  <option value="all">All</option>
                  <option value="missing_cache">No cache row</option>
                  <option value="missing_rows">No kanji rows</option>
                  <option value="missing_positions">Missing kanji row</option>
                  <option value="incomplete_rows">Needs readings</option>
                  <option value="cleanup">Cleanup only</option>
                  <option value="complete">Complete</option>
                </select>
              </label>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-lg font-black text-stone-900">Queue is clear.</p>
                <p className="mt-2 text-sm text-stone-500">
                  New kanji enrichment items will appear here when saved words need cache
                  rows, kanji rows, or reading details.
                </p>
              </div>
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
                      <tr key={item.userBookWordId} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-stone-900">
                            {item.studentName}
                          </div>
                          {item.username ? (
                            <div className="text-xs text-stone-500">@{item.username}</div>
                          ) : null}
                        </td>

                        <td className="px-4 py-4">
                          <div className="max-w-[240px] font-medium text-stone-800">
                            {item.bookTitle}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-2xl font-semibold leading-tight text-stone-900 md:text-3xl">
                            {item.surface}
                          </div>
                          <div className="mt-1 text-base text-stone-500 md:text-lg">
                            {item.reading || "—"}
                          </div>
                          <div className="mt-1 text-xs text-stone-400">
                            cache: {item.vocabularyCacheId ?? "none"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(
                              item.status
                            )}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-xs text-stone-600">
                          <div>Kanji: {item.kanjiCount}</div>
                          <div>Rows: {item.mapRowCount}</div>
                          <div>Complete: {item.completePositionCount}</div>
                          <div>Incomplete: {item.incompleteRowCount}</div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => void prepareRows(item)}
                              disabled={preparingId === item.userBookWordId}
                              className="rounded-xl border border-stone-900 bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
                            >
                              {preparingId === item.userBookWordId
                                ? "Preparing…"
                                : "Prepare rows"}
                            </button>

                            <Link
                              href={`/books/${item.userBookId}?tab=teacher`}
                              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                            >
                              Open Book Hub
                            </Link>

                            <button
                              type="button"
                              onClick={() => void ignoreWord(item)}
                              disabled={ignoringId === item.userBookWordId}
                              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50 disabled:opacity-50"
                            >
                              {ignoringId === item.userBookWordId ? "Ignoring…" : "Ignore"}
                            </button>
                          </div>
                        </td>
                      </tr>
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