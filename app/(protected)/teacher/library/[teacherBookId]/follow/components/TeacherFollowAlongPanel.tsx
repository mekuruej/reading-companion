// Teacher Follow-Along Reading
//
// Fluid Reading-style lesson support backed by the teacher's linked Reader Vocab
// plus teacher_book_items extras. This route must not write reading sessions,
// stats, user_book_words, or study progress.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReadAlongReaderShell from "../../../../../books/[userBookId]/_shared/readalong/ReadAlongReaderShell";
import ReadAlongSupportModeTabs from "../../../../../books/[userBookId]/_shared/readalong/ReadAlongSupportModeTabs";
import { TeacherFollowAlongHeader } from "./TeacherFollowAlongHeader";
import { TeacherFollowAlongBookBar } from "./TeacherFollowAlongBookBar";
import { TeacherFollowAlongEmptyPageState } from "./TeacherFollowAlongEmptyPageState";
import { TeacherFollowAlongReaderHeader } from "./TeacherFollowAlongReaderHeader";
import { TeacherFollowAlongPrepItemCard } from "./TeacherFollowAlongPrepItemCard";

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
  user_book_id: string | null;
  books: BookMeta | BookMeta[] | null;
};

type TeacherFollowAlongItem = {
  id: string;
  source: "reader_vocab" | "teacher_support";
  source_id: string;
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
  jlpt?: string | null;
  meaning_choice_index?: number | null;
  created_at?: string | null;
};

type ReaderVocabWord = {
  id: string;
  surface: string | null;
  reading: string | null;
  meaning: string | null;
  page_number: number | null;
  page_order?: number | null;
  chapter_number?: number | null;
  chapter_name: string | null;
  jlpt?: string | null;
  meaning_choice_index?: number | null;
  created_at?: string | null;
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
  items: TeacherFollowAlongItem[];
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

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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

function sortTeacherFollowAlongItems(items: TeacherFollowAlongItem[]) {
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

function readerWordToFollowAlongItem(word: ReaderVocabWord): TeacherFollowAlongItem {
  return {
    id: `reader-word-${word.id}`,
    source: "reader_vocab",
    source_id: word.id,
    item_type: "word",
    surface_text: word.surface,
    reading: word.reading,
    meaning: word.meaning,
    page_number: word.page_number,
    page_order: word.page_order,
    chapter_number: word.chapter_number,
    chapter_name: word.chapter_name,
    teacher_note: null,
    explanation: null,
    translation: null,
    support_url: null,
    jlpt: word.jlpt,
    meaning_choice_index: word.meaning_choice_index,
    created_at: word.created_at,
  };
}

function hasUsefulReaderVocabSupport(word: ReaderVocabWord) {
  return Boolean(word.meaning?.trim());
}

function teacherSupportToFollowAlongItem(item: TeacherBookItem): TeacherFollowAlongItem {
  return {
    id: `teacher-support-${item.id}`,
    source: "teacher_support",
    source_id: item.id,
    item_type: item.item_type,
    surface_text: item.surface_text,
    reading: item.reading,
    meaning: item.meaning,
    page_number: item.page_number,
    page_order: item.page_order,
    chapter_number: item.chapter_number,
    chapter_name: item.chapter_name,
    teacher_note: item.teacher_note,
    explanation: item.explanation,
    translation: item.translation,
    support_url: item.support_url,
    jlpt: null,
    meaning_choice_index: null,
    created_at: item.created_at,
  };
}

type TeacherFollowAlongPanelProps = {
  teacherBookId: string;
  presentation?: "standalone" | "embedded";
  ownerTeacherId?: string;
};

export function TeacherFollowAlongPanel({
  teacherBookId,
  presentation = "standalone",
  ownerTeacherId,
}: TeacherFollowAlongPanelProps) {

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollAnimationFrame = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [teacherBook, setTeacherBook] = useState<TeacherBookRow | null>(null);
  const [items, setItems] = useState<TeacherFollowAlongItem[]>([]);
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
          user_book_id,
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

      const loadedTeacherBook = teacherBookRow as TeacherBookRow;
      if (ownerTeacherId && loadedTeacherBook.teacher_id !== ownerTeacherId) {
        setCanAccess(false);
        setMessage("This Follow-Along does not belong to the signed-in teacher.");
        return;
      }

      let readerVocabItems: TeacherFollowAlongItem[] = [];
      if (loadedTeacherBook.user_book_id) {
        const { data: wordRows, error: wordError } = await supabase
          .from("user_book_words")
          .select(
            "id, surface, reading, meaning, jlpt, meaning_choice_index, page_number, page_order, chapter_number, chapter_name, created_at"
          )
          .eq("user_book_id", loadedTeacherBook.user_book_id)
          .eq("hidden", false)
          .order("page_number", { ascending: true, nullsFirst: false })
          .order("page_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });

        if (wordError) throw wordError;
        readerVocabItems = ((wordRows ?? []) as ReaderVocabWord[])
          .filter(hasUsefulReaderVocabSupport)
          .map(readerWordToFollowAlongItem);
      }

      const { data: itemRows, error: itemsError } = await supabase
        .from("teacher_book_items")
        .select(
          "id, item_type, surface_text, reading, meaning, page_number, page_order, chapter_number, chapter_name, teacher_note, explanation, translation, support_url, created_at"
        )
        .eq("teacher_book_id", teacherBookId)
        .neq("item_type", "word")
        .order("page_number", { ascending: true, nullsFirst: false })
        .order("page_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      let teacherSupportRows: Partial<TeacherBookItem>[] = itemRows ?? [];

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
          .neq("item_type", "word")
          .order("page_number", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });

        if (fallbackError) throw fallbackError;
        teacherSupportRows = fallbackRows ?? [];
      }

      const teacherSupportItems = (teacherSupportRows as TeacherBookItem[]).map(
        teacherSupportToFollowAlongItem
      );

      setCanAccess(true);
      setTeacherBook(loadedTeacherBook);
      setItems(sortTeacherFollowAlongItems([...readerVocabItems, ...teacherSupportItems]));
    } catch (error: any) {
      console.error("Error loading teacher follow-along:", readableSupabaseError(error), error);
      setCanAccess(false);
      setMessage(readableSupabaseError(error) || "Could not load follow-along page.");
    } finally {
      setLoading(false);
    }
  }

  const pages = useMemo<PageChunk[]>(() => {
    const orderedItems = sortTeacherFollowAlongItems(items);
    const numberedItems = orderedItems.filter((item) => item.page_number != null);
    const unplacedItems = orderedItems.filter((item) => item.page_number == null);
    const nextPages: PageChunk[] = [];

    if (numberedItems.length > 0) {
      const grouped = new Map<number, TeacherFollowAlongItem[]>();

      for (const item of numberedItems) {
        const page = item.page_number as number;
        if (!grouped.has(page)) grouped.set(page, []);
        grouped.get(page)!.push(item);
      }

      nextPages.push(
        ...Array.from(grouped.keys())
          .sort((a, b) => a - b)
          .map((page) => ({
            label: `Page ${page}`,
            items: grouped.get(page) ?? [],
            pageNumber: page,
          }))
      );
    }

    if (unplacedItems.length > 0) {
      nextPages.push(
        ...chunkArray(unplacedItems, 8).map((chunk, index) => ({
          label: numberedItems.length > 0 ? `Unplaced ${index + 1}` : `Section ${index + 1}`,
          items: chunk,
          pageNumber: null,
        }))
      );
    }

    return nextPages;
  }, [items]);

  const currentPage = pages[pageIndex] ?? null;

  useEffect(() => {
    setPageIndex(0);
    setJumpPageInput("");
    setFadedThroughIndex(-1);
  }, [items]);

  useEffect(() => {
    setFadedThroughIndex(-1);
    if (scrollAnimationFrame.current) {
      cancelAnimationFrame(scrollAnimationFrame.current);
      scrollAnimationFrame.current = null;
    }

    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
  }, [pageIndex]);

  useEffect(() => {
    return () => {
      if (scrollAnimationFrame.current) {
        cancelAnimationFrame(scrollAnimationFrame.current);
      }
    };
  }, []);

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

  function animateScrollTo(container: HTMLDivElement, top: number, duration = 420) {
    if (scrollAnimationFrame.current) {
      cancelAnimationFrame(scrollAnimationFrame.current);
    }

    const startTop = container.scrollTop;
    const distance = top - startTop;
    const startTimeForAnimation = performance.now();

    const step = (now: number) => {
      const elapsedTime = now - startTimeForAnimation;
      const progress = Math.min(elapsedTime / duration, 1);
      const eased = easeInOutQuad(progress);

      container.scrollTop = startTop + distance * eased;

      if (progress < 1) {
        scrollAnimationFrame.current = requestAnimationFrame(step);
      } else {
        scrollAnimationFrame.current = null;
      }
    };

    scrollAnimationFrame.current = requestAnimationFrame(step);
  }

  function handleProgressTap(index: number, itemId: string) {
    setFadedThroughIndex(index);

    const container = scrollAreaRef.current;
    const nextItem = currentPage?.items[index + 1];
    const target =
      (nextItem ? itemRefs.current[nextItem.id] : null) ?? itemRefs.current[itemId];

    if (!container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetTopWithinScroll =
      targetRect.top - containerRect.top + container.scrollTop;
    const desiredTop = Math.max(0, targetTopWithinScroll - 104);

    animateScrollTo(container, desiredTop, 800);
  }

  const book = firstBook(teacherBook?.books ?? null);
  const isEmbedded = presentation === "embedded";

  if (loading) {
    return (
      <div
        className={
          isEmbedded
            ? "rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 shadow-sm"
            : "rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm"
        }
      >
        Loading follow-along support...
      </div>
    );
  }

  if (!canAccess || !teacherBook) {
    return (
      <div
        className={
          isEmbedded
            ? "rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm"
            : "rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm"
        }
      >
        {message || "Teacher access is required."}
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "space-y-3" : "space-y-4"}>
      {isEmbedded ? (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
            My Follow-Along
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            {book?.title ?? "Teacher Follow-Along"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Your prepared support for this book. Page navigation here stays separate from Live Lesson capture.
          </p>
        </div>
      ) : (
        <TeacherFollowAlongHeader />
      )}

      {isEmbedded ? null : (
        <TeacherFollowAlongBookBar teacherBookId={teacherBookId} book={book} />
      )}

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
              <div
                key={item.id}
                ref={(element) => {
                  itemRefs.current[item.id] = element;
                }}
              >
                <TeacherFollowAlongPrepItemCard
                  item={item}
                  supportMode={supportMode}
                  isFaded={index <= fadedThroughIndex}
                  onSelect={() => handleProgressTap(index, item.id)}
                />
              </div>
            ))}
          </div>
        )}
      </ReadAlongReaderShell>
    </div>
  );
}
