// Teacher Follow-Along Reading
//
// Fluid Reading-style lesson support backed by teacher_book_items only.
// This route must not write reading sessions, stats, user_book_words, or study progress.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ReadAlongPageNavigator from "../../../../books/[userBookId]/readalong/components/ReadAlongPageNavigator";
import ReadAlongReaderShell from "../../../../books/[userBookId]/readalong/components/ReadAlongReaderShell";
import ReadAlongSupportModeTabs from "../../../../books/[userBookId]/readalong/components/ReadAlongSupportModeTabs";
import { TeacherFollowAlongLoadingState } from "./components/TeacherFollowAlongLoadingState";
import { TeacherFollowAlongAccessState } from "./components/TeacherFollowAlongAccessState";
import { TeacherFollowAlongHeader } from "./components/TeacherFollowAlongHeader";
import { TeacherFollowAlongBookBar } from "./components/TeacherFollowAlongBookBar";
import { TeacherFollowAlongEmptyPageState } from "./components/TeacherFollowAlongEmptyPageState";
import { TeacherFollowAlongReaderHeader } from "./components/TeacherFollowAlongReaderHeader";
import { TeacherFollowAlongPrepItemCard } from "./components/TeacherFollowAlongPrepItemCard";

type ItemType = "word" | "phrase" | "grammar" | "sentence" | "translation" | "note";
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
  page_order?: number | null;
  chapter_number?: number | null;
  chapter_name: string | null;
  teacher_note: string | null;
  explanation: string | null;
  translation: string | null;
  support_url?: string | null;
  created_at?: string | null;
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

function chunkArray<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
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

function sortTeacherBookItemsForFollowAlong(items: TeacherBookItem[]) {
  return [...items].sort((a, b) => {
    const aPage = a.page_number ?? Number.MAX_SAFE_INTEGER;
    const bPage = b.page_number ?? Number.MAX_SAFE_INTEGER;
    if (aPage !== bPage) return aPage - bPage;

    const aOrder = a.page_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.page_order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;

    const created = String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
    if (created !== 0) return created;

    return a.id.localeCompare(b.id);
  });
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
          "id, item_type, surface_text, reading, meaning, page_number, page_order, chapter_number, chapter_name, teacher_note, explanation, translation, support_url, created_at"
        )
        .eq("teacher_book_id", teacherBookId)
        .order("page_number", { ascending: true, nullsFirst: false })
        .order("page_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      let loadedItems: Partial<TeacherBookItem>[] = itemRows ?? [];

      if (itemsError) {
        if (!isMissingOptionalTeacherBookItemColumn(itemsError)) throw itemsError;

        console.warn(
          "Teacher follow-along optional column missing; retrying with base teacher_book_items columns:",
          readableSupabaseError(itemsError)
        );

        const { data: fallbackRows, error: fallbackError } = await supabase
          .from("teacher_book_items")
          .select(
            "id, item_type, surface_text, reading, meaning, page_number, chapter_number, chapter_name, teacher_note, explanation, translation, created_at"
          )
          .eq("teacher_book_id", teacherBookId)
          .order("page_number", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });

        if (fallbackError) throw fallbackError;
        loadedItems = fallbackRows ?? [];
      }

      setCanAccess(true);
      setTeacherBook(teacherBookRow as TeacherBookRow);
      setItems(sortTeacherBookItemsForFollowAlong(loadedItems as TeacherBookItem[]));
    } catch (error: any) {
      console.error("Error loading teacher follow-along:", readableSupabaseError(error), error);
      setCanAccess(false);
      setMessage(readableSupabaseError(error) || "Could not load follow-along page.");
    } finally {
      setLoading(false);
    }
  }

  const pages = useMemo<PageChunk[]>(() => {
    const orderedItems = sortTeacherBookItemsForFollowAlong(items);
    const numberedItems = orderedItems.filter((item) => item.page_number != null);

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

    return chunkArray(orderedItems, 8).map((chunk, index) => ({
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
    return <TeacherFollowAlongLoadingState />;
  }

  if (!canAccess || !teacherBook) {
    return <TeacherFollowAlongAccessState message={message} />;
  }

  return (
    <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <TeacherFollowAlongHeader />

        <TeacherFollowAlongBookBar teacherBookId={teacherBookId} book={book} />

        <ReadAlongSupportModeTabs
          supportMode={supportMode}
          onSupportModeChange={setSupportMode}
        />

        <ReadAlongReaderShell
          scrollAreaRef={scrollAreaRef}
          header={
            <TeacherFollowAlongReaderHeader
              pageIndex={pageIndex}
              pageCount={pages.length}
              jumpPageInput={jumpPageInput}
              currentPageLabel={currentPage?.label ?? "Teacher Follow-Along"}
              currentPageItemCount={currentPage?.items.length ?? null}
              onJumpPageInputChange={setJumpPageInput}
              onJumpToPage={jumpToPage}
              onPrevious={goPrev}
              onNext={goNext}
            />
          }
        >
          {!currentPage || currentPage.items.length === 0 ? (
            <TeacherFollowAlongEmptyPageState />
          ) : (
            <div className="mx-auto max-w-2xl space-y-3 pb-[60vh]">
              {currentPage.items.map((item, index) => (
                <TeacherFollowAlongPrepItemCard
                  key={item.id}
                  item={item}
                  supportMode={supportMode}
                  isFaded={index <= fadedThroughIndex}
                  onSelect={() => setFadedThroughIndex(index)}
                />
              ))}
            </div>
          )}
        </ReadAlongReaderShell>
      </div>
    </main>
  );
}
