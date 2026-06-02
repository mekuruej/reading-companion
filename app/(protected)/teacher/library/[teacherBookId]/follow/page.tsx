// Teacher Follow-Along Reading
//
// Fluid Reading-style lesson support backed by teacher_book_items only.
// This route must not write reading sessions, stats, user_book_words, or study progress.

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ReadAlongPageNavigator from "../../../../books/[userBookId]/readalong/components/ReadAlongPageNavigator";
import ReadAlongReaderShell from "../../../../books/[userBookId]/readalong/components/ReadAlongReaderShell";
import ReadAlongSupportModeTabs from "../../../../books/[userBookId]/readalong/components/ReadAlongSupportModeTabs";

type ItemType = "word" | "phrase" | "grammar" | "sentence" | "note";
type SupportMode = "full" | "reading" | "meaning";

type BookMeta = {
  title: string | null;
  author: string | null;
  cover_url: string | null;
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
  page_number: number | null;
  chapter_number?: number | null;
  chapter_name: string | null;
  teacher_note: string | null;
  explanation: string | null;
  translation: string | null;
};

type PageChunk = {
  label: string;
  items: TeacherBookItem[];
  pageNumber: number | null;
};

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

function itemTypeTone(value: ItemType) {
  switch (value) {
    case "word":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "phrase":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "grammar":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "sentence":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "note":
      return "border-stone-200 bg-stone-50 text-stone-700";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

function chunkArray<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export default function TeacherFollowAlongPage() {
  const params = useParams<{ teacherBookId: string }>();
  const teacherBookId = params.teacherBookId;

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [teacherBook, setTeacherBook] = useState<TeacherBookRow | null>(null);
  const [items, setItems] = useState<TeacherBookItem[]>([]);
  const [supportMode, setSupportMode] = useState<SupportMode>("full");
  const [pageIndex, setPageIndex] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState("");
  const [fadedThroughIndex, setFadedThroughIndex] = useState(-1);

  useEffect(() => {
    void loadFollowAlong();
  }, [teacherBookId]);

  async function loadFollowAlong() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        setCanAccess(false);
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
            title,
            author,
            cover_url
          )
        `
        )
        .eq("id", teacherBookId)
        .maybeSingle();

      if (teacherBookError) throw teacherBookError;

      if (!teacherBookRow) {
        setCanAccess(false);
        setMessage("This teacher book could not be found.");
        return;
      }

      const { data: itemRows, error: itemsError } = await supabase
        .from("teacher_book_items")
        .select(
          "id, item_type, surface_text, reading, meaning, page_number, chapter_number, chapter_name, teacher_note, explanation, translation"
        )
        .eq("teacher_book_id", teacherBookId)
        .order("page_number", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      setCanAccess(true);
      setTeacherBook(teacherBookRow as TeacherBookRow);
      setItems((itemRows ?? []) as TeacherBookItem[]);
    } catch (error: any) {
      console.error("Error loading teacher follow-along:", error);
      setCanAccess(false);
      setMessage(error?.message ?? "Could not load follow-along page.");
    } finally {
      setLoading(false);
    }
  }

  const pages = useMemo<PageChunk[]>(() => {
    const numberedItems = items.filter((item) => item.page_number != null);

    if (numberedItems.length > 0) {
      const grouped = new Map<number, TeacherBookItem[]>();

      for (const item of numberedItems) {
        const page = item.page_number as number;
        if (!grouped.has(page)) grouped.set(page, []);
        grouped.get(page)!.push(item);
      }

      return Array.from(grouped.keys())
        .sort((a, b) => a - b)
        .map((page) => ({
          label: `Page ${page}`,
          items: grouped.get(page) ?? [],
          pageNumber: page,
        }));
    }

    return chunkArray(items, 8).map((chunk, index) => ({
      label: `Section ${index + 1}`,
      items: chunk,
      pageNumber: null,
    }));
  }, [items]);

  const currentPage = pages[pageIndex] ?? null;

  useEffect(() => {
    setPageIndex(0);
    setJumpPageInput("");
    setFadedThroughIndex(-1);
  }, [items]);

  useEffect(() => {
    setFadedThroughIndex(-1);
    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
  }, [pageIndex]);

  function jumpToPage(pageNumber: number) {
    const matchIndex = pages.findIndex((page) => page.pageNumber === pageNumber);
    if (matchIndex >= 0) {
      setPageIndex(matchIndex);
      setJumpPageInput(String(pageNumber));
    }
  }

  function goPrev() {
    setPageIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
  }

  const book = firstBook(teacherBook?.books ?? null);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
          Loading follow-along support...
        </div>
      </main>
    );
  }

  if (!canAccess || !teacherBook) {
    return (
      <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {message || "Teacher access is required."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold text-stone-900">
            Teacher Follow-Along
          </h1>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-stone-600">
            Use your prepared words, phrases, grammar notes, sentence translations,
            and teaching notes as light support during a lesson.
          </p>
        </header>

        <div className="mb-4 mt-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mb-8 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <Link
            href={`/teacher/library/${teacherBookId}`}
            className="flex min-w-0 items-center gap-4 rounded-xl text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            {book?.cover_url ? (
              <img
                src={book.cover_url}
                alt=""
                className="h-20 w-14 shrink-0 rounded-md object-cover shadow-sm"
              />
            ) : null}

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-stone-500">
                For teaching book
              </p>
              <div className="truncate text-base font-semibold text-stone-900 hover:text-stone-700">
                {book?.title ?? "Untitled book"}
              </div>
              {book?.author ? (
                <p className="truncate text-sm text-stone-500">{book.author}</p>
              ) : null}
            </div>
          </Link>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              href={`/teacher/library/${teacherBookId}`}
              className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              Prep Add
            </Link>
            <Link
              href="/teacher/library"
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Teacher Library
            </Link>
          </div>
        </div>

        <ReadAlongSupportModeTabs
          supportMode={supportMode}
          onSupportModeChange={setSupportMode}
        />

        <ReadAlongReaderShell
          scrollAreaRef={scrollAreaRef}
          header={
            <>
              <ReadAlongPageNavigator
                pageIndex={pageIndex}
                pageCount={pages.length}
                jumpPageInput={jumpPageInput}
                onJumpPageInputChange={setJumpPageInput}
                onJumpToPage={jumpToPage}
                onPrevious={goPrev}
                onNext={goNext}
              />

              <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3 sm:items-center sm:text-left">
                <div className="order-2 text-sm text-stone-500 sm:order-1">
                  {currentPage
                    ? `${currentPage.items.length} prep item${currentPage.items.length === 1 ? "" : "s"}`
                    : "No prep items yet"}
                </div>
                <div className="order-1 text-xl font-bold text-stone-900 sm:order-2 sm:text-center">
                  {currentPage?.label ?? "Teacher Follow-Along"}
                </div>
                <div className="order-3 text-sm text-stone-500 sm:text-right">
                  Tap items to follow along.
                </div>
              </div>
            </>
          }
        >
          {!currentPage || currentPage.items.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
              No teacher prep items for this page yet.
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-3 pb-[60vh]">
              {currentPage.items.map((item, index) => {
                const isFaded = index <= fadedThroughIndex;
                const displaySurface = item.surface_text || itemTypeLabel(item.item_type);

                return (
                  <article
                    key={item.id}
                    onClick={() => setFadedThroughIndex(index)}
                    className={`relative cursor-pointer rounded-2xl border px-4 py-3 transition ${
                      isFaded
                        ? "border-stone-200 bg-stone-50 opacity-35"
                        : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${itemTypeTone(item.item_type)}`}>
                        {itemTypeLabel(item.item_type)}
                      </span>
                      {item.chapter_name ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                          {item.chapter_name}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="text-xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-2xl">
                          {displaySurface}
                        </div>

                        {(supportMode === "full" || supportMode === "reading") && item.reading ? (
                          <div className="text-sm text-stone-500 sm:text-base">
                            {item.reading}
                          </div>
                        ) : null}
                      </div>

                      {(supportMode === "full" || supportMode === "meaning") && item.meaning ? (
                        <div className="mt-2 text-sm leading-6 text-stone-700 sm:text-base">
                          {item.meaning}
                        </div>
                      ) : null}

                      {item.explanation ? (
                        <p className="mt-3 text-sm leading-6 text-stone-600">
                          {item.explanation}
                        </p>
                      ) : null}
                      {item.translation ? (
                        <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">
                          {item.translation}
                        </p>
                      ) : null}
                      {item.teacher_note ? (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                          {item.teacher_note}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </ReadAlongReaderShell>
      </div>
    </main>
  );
}
