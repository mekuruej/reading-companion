// Book Hub
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Book = {
  id: string;
  title: string;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  cover_url: string | null;

  genre: string | null;
  trigger_warnings: string | null;
  page_count: number | null;
  isbn: string | null;
  isbn13: string | null;
  publisher: string | null;

  author_image_url: string | null;
  translator_image_url: string | null;
  illustrator_image_url: string | null;
  publisher_image_url: string | null;

  author_reading: string | null;
  translator_reading: string | null;
  illustrator_reading: string | null;
  publisher_reading: string | null;

  related_links: any | null;
};

type UserBook = {
  id: string;
  book_id: string;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  my_review: string | null;

  rating_overall: number | null;
  rating_recommend: number | null;
  rating_difficulty: number | null;
  reader_level: string | null;
  recommended_level: string | null;

  books: Book | null;
};

type LookupRow = {
  surface?: string | null;
  meaning?: string | null;
};

type HubTab = "book" | "readers" | "learners";
type ProfileRole = "teacher" | "student";

type Character = {
  id: string;
  name: string;
  reading: string;
  role: string;
  notes: string;
};

type ReadingSession = {
  id: string;
  user_book_id: string;
  read_on: string;
  start_page: number;
  end_page: number;
  minutes_read: number;
  created_at: string;
};

const LEVEL_OPTIONS = ["N5", "N4", "N3", "N2", "N1"] as const;

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Extremely difficult" },
  { value: 2, label: "Very hard" },
  { value: 3, label: "Challenging but manageable" },
  { value: 4, label: "Comfortable" },
  { value: 5, label: "Easy" },
] as const;

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function safeDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function linksToText(links: any): string {
  if (!links) return "";
  if (!Array.isArray(links)) return "";

  return links
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const label = (x.label ?? x.url ?? "").toString();
        const url = (x.url ?? "").toString();
        return url ? `${label} | ${url}` : label;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function parseLinks(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length === 1) return { label: parts[0], url: parts[0] };
    return { label: parts[0], url: parts.slice(1).join("|") };
  });
}

function displayLinkLabel(l: any) {
  if (!l) return "Link";
  if (typeof l === "string") return l;
  if (typeof l === "object") return l.label ?? l.url ?? "Link";
  return "Link";
}

function displayLinkUrl(l: any) {
  if (!l) return "";
  if (typeof l === "string") return l;
  if (typeof l === "object") return l.url ?? "";
  return "";
}

function clampRating5(n: number | null) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.max(1, Math.min(5, n));
}

function stars5(value: number | null) {
  if (!value) return "☆☆☆☆☆";
  const v = Math.max(1, Math.min(5, value));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

export default function BookHubPage() {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const userBookId = params?.userBookId;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<UserBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<ProfileRole>("student");
  const isTeacher = myRole === "teacher";

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<HubTab>("book");
  const [uniqueLookupCount, setUniqueLookupCount] = useState<number | null>(null);

  const [startedAt, setStartedAt] = useState<string>("");
  const [finishedAt, setFinishedAt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [myReview, setMyReview] = useState<string>("");

  const [ratingOverall, setRatingOverall] = useState<string>("");
  const [ratingRecommend, setRatingRecommend] = useState<string>("");
  const [ratingDifficulty, setRatingDifficulty] = useState<string>("");

  const [readerLevel, setReaderLevel] = useState<string>("");
  const [recommendedLevel, setRecommendedLevel] = useState<string>("");

  const [genre, setGenre] = useState<string>("");
  const [triggerWarnings, setTriggerWarnings] = useState<string>("");
  const [pageCount, setPageCount] = useState<string>("");
  const [isbn, setIsbn] = useState<string>("");
  const [isbn13, setIsbn13] = useState<string>("");

  const [authorName, setAuthorName] = useState<string>("");
  const [translatorName, setTranslatorName] = useState<string>("");
  const [illustratorName, setIllustratorName] = useState<string>("");
  const [publisherName, setPublisherName] = useState<string>("");

  const [publisherReading, setPublisherReading] = useState<string>("");

  const [coverUrl, setCoverUrl] = useState<string>("");
  const [authorImg, setAuthorImg] = useState<string>("");
  const [translatorImg, setTranslatorImg] = useState<string>("");
  const [illustratorImg, setIllustratorImg] = useState<string>("");
  const [publisherImg, setPublisherImg] = useState<string>("");

  const [authorReading, setAuthorReading] = useState<string>("");
  const [translatorReading, setTranslatorReading] = useState<string>("");
  const [illustratorReading, setIllustratorReading] = useState<string>("");

  const [linksText, setLinksText] = useState<string>("");

  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [sessionStartPage, setSessionStartPage] = useState<string>("");
  const [sessionEndPage, setSessionEndPage] = useState<string>("");
  const [sessionMinutesRead, setSessionMinutesRead] = useState<string>("");

  // Local only for now
  const [characters, setCharacters] = useState<Character[]>([]);

  const started = useMemo(() => safeDate(row?.started_at ?? null), [row?.started_at]);
  const finished = useMemo(() => safeDate(row?.finished_at ?? null), [row?.finished_at]);

  const timeToRead = useMemo(() => {
    if (!started || !finished) return null;
    const days = diffDays(started, finished);
    if (days == null) return null;
    return days === 1 ? "1 day" : `${days} days`;
  }, [started, finished]);
  
  const book = row?.books ?? null;

  const totalMinutesRead = useMemo(
  () => readingSessions.reduce((sum, s) => sum + s.minutes_read, 0),
  [readingSessions]
);

const totalPagesRead = useMemo(
  () =>
    readingSessions.reduce(
      (sum, s) => sum + (s.end_page - s.start_page + 1),
      0
    ),
  [readingSessions]
);

const averageMinutesPerPage = useMemo(() => {
  if (!totalPagesRead) return null;
  return totalMinutesRead / totalPagesRead;
}, [totalMinutesRead, totalPagesRead]);

const furthestPage = useMemo(() => {
  if (readingSessions.length === 0) return null;
  return Math.max(...readingSessions.map((s) => s.end_page));
}, [readingSessions]);

const progressPercent = useMemo(() => {
  if (!book?.page_count || !furthestPage) return null;
  return Math.min(100, Math.round((furthestPage / book.page_count) * 100));
}, [book?.page_count, furthestPage]);

const lastReadDate = useMemo(() => {
  if (readingSessions.length === 0) return null;
  return readingSessions[0]?.read_on ?? null;
}, [readingSessions]);

  function addCharacter() {
    setCharacters((prev) => [
      ...prev,
      { id: makeId(), name: "", reading: "", role: "", notes: "" },
    ]);
  }

  function removeCharacter(id: string) {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCharacter(id: string, field: keyof Character, value: string) {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }
  async function loadReadingSessions(userBookId: string) {
    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("id, user_book_id, read_on, start_page, end_page, minutes_read, created_at")
      .eq("user_book_id", userBookId)
      .order("read_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reading sessions:", error);
      setReadingSessions([]);
      return;
    }

    setReadingSessions((data as ReadingSession[]) ?? []);
  }

  async function deleteReadingSession(sessionId: string) {
  const ok = window.confirm("Delete this reading session?");
  if (!ok) return;

  const { error } = await supabase
    .from("user_book_reading_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("Error deleting reading session:", {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
      raw: error,
    });
    alert(`Could not delete reading session.\n${(error as any)?.message || "Unknown error"}`);
    return;
  }

  if (row?.id) {
    await loadReadingSessions(row.id);
  }
}

async function saveReadingSession() {
  if (!row?.id) return;

  const start = Number(sessionStartPage);
  const end = Number(sessionEndPage);
  const minutes = Number(sessionMinutesRead);

  if (
    !sessionDate ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isFinite(minutes)
  ) {
    alert("Please fill in date, start page, end page, and minutes.");
    return;
  }

  if (start <= 0 || end <= 0 || minutes <= 0) {
    alert("Pages and minutes must be greater than 0.");
    return;
  }

  if (end < start) {
    alert("End page must be greater than or equal to start page.");
    return;
  }

  const { error } = await supabase.from("user_book_reading_sessions").insert({
    user_book_id: row.id,
    read_on: sessionDate,
    start_page: start,
    end_page: end,
    minutes_read: minutes,
  });

  if (error) {
    console.error("Error saving reading session:", {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
      raw: error,
    });
    alert(`Could not save reading session.\n${(error as any)?.message || "Unknown error"}`);
    return;
  }

  setSessionStartPage("");
  setSessionEndPage("");
  setSessionMinutesRead("");

  await loadReadingSessions(row.id);
}
  const loadUniqueLookupCount = async (id: string) => {
    const { data, error } = await supabase
      .from("user_book_words")
      .select("surface, meaning")
      .eq("user_book_id", id);

    if (error) {
      console.error("Error loading lookup count:", error);
      setUniqueLookupCount(null);
      return;
    }

    const rows = (data ?? []) as LookupRow[];

    const set = new Set<string>();
    for (const r of rows) {
      const surface = (r.surface ?? "").trim();
      const meaning = (r.meaning ?? "").trim();
      if (!surface && !meaning) continue;
      set.add(`${surface}|||${meaning}`);
    }

    setUniqueLookupCount(set.size);
  };

  const load = async () => {
    if (!userBookId) return;

    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      setError("Please sign in.");
      setLoading(false);
      return;
    }

    const { data: meProfile, error: meProfileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (meProfileErr) {
      console.error("Error loading profile role:", meProfileErr);
    }

    setMyRole((meProfile?.role as ProfileRole | null) ?? "student");

    const { data, error } = await supabase
      .from("user_books")
      .select(
        `
        id,
        book_id,
        started_at,
        finished_at,
        notes,
        my_review,
        rating_overall,
        rating_recommend,
        rating_difficulty,
        reader_level,
        recommended_level,
        books (
          id,
          title,
          author,
          translator,
          illustrator,
          cover_url,
          genre,
          trigger_warnings,
          page_count,
          isbn,
          isbn13,
          publisher,
          publisher_reading,
          publisher_image_url,
          related_links,
          author_image_url,
          translator_image_url,
          illustrator_image_url,
          author_reading,
          translator_reading,
          illustrator_reading
        )
      `
      )
      .eq("id", userBookId)
      .single();

    if (error) {
      setRow(null);
      setError(error.message);
      setLoading(false);
      return;
    }

    const r = data as unknown as UserBook;
    setRow(r);

    setStartedAt(r.started_at ? formatYmd(new Date(r.started_at)) : "");
    setFinishedAt(r.finished_at ? formatYmd(new Date(r.finished_at)) : "");
    setNotes(r.notes ?? "");
    setMyReview(r.my_review ?? "");

    setRatingOverall(r.rating_overall != null ? String(r.rating_overall) : "");
    setRatingRecommend(r.rating_recommend != null ? String(r.rating_recommend) : "");
    setRatingDifficulty(r.rating_difficulty != null ? String(r.rating_difficulty) : "");

    setReaderLevel(r.reader_level ?? "");
    setRecommendedLevel(r.recommended_level ?? "");

    const b = r.books as Book | null;
    setGenre(b?.genre ?? "");
    setTriggerWarnings(b?.trigger_warnings ?? "");
    setPageCount(b?.page_count != null ? String(b.page_count) : "");
    setIsbn(b?.isbn ?? "");
    setIsbn13(b?.isbn13 ?? "");

    setAuthorName(b?.author ?? "");
    setTranslatorName(b?.translator ?? "");
    setIllustratorName(b?.illustrator ?? "");
    setPublisherName(b?.publisher ?? "");
    setPublisherReading(b?.publisher_reading ?? "");

    setCoverUrl(b?.cover_url ?? "");
    setAuthorImg(b?.author_image_url ?? "");
    setTranslatorImg(b?.translator_image_url ?? "");
    setIllustratorImg(b?.illustrator_image_url ?? "");
    setPublisherImg(b?.publisher_image_url ?? "");

    setAuthorReading(b?.author_reading ?? "");
    setTranslatorReading(b?.translator_reading ?? "");
    setIllustratorReading(b?.illustrator_reading ?? "");

    setLinksText(linksToText(b?.related_links));

    await loadUniqueLookupCount(r.id);
    await loadReadingSessions(r.id);

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBookId]);

  const cancelEdits = () => {
    if (!row) return;

    setEditing(false);

    setStartedAt(row.started_at ? formatYmd(new Date(row.started_at)) : "");
    setFinishedAt(row.finished_at ? formatYmd(new Date(row.finished_at)) : "");
    setNotes(row.notes ?? "");
    setMyReview(row.my_review ?? "");

    setRatingOverall(row.rating_overall != null ? String(row.rating_overall) : "");
    setRatingRecommend(row.rating_recommend != null ? String(row.rating_recommend) : "");
    setRatingDifficulty(row.rating_difficulty != null ? String(row.rating_difficulty) : "");

    setReaderLevel(row.reader_level ?? "");
    setRecommendedLevel(row.recommended_level ?? "");

    const b = row.books;
    setGenre(b?.genre ?? "");
    setTriggerWarnings(b?.trigger_warnings ?? "");
    setPageCount(b?.page_count != null ? String(b.page_count) : "");
    setIsbn(b?.isbn ?? "");
    setIsbn13(b?.isbn13 ?? "");

    setAuthorName(b?.author ?? "");
    setTranslatorName(b?.translator ?? "");
    setIllustratorName(b?.illustrator ?? "");
    setPublisherName(b?.publisher ?? "");
    setPublisherReading(b?.publisher_reading ?? "");

    setCoverUrl(b?.cover_url ?? "");
    setAuthorImg(b?.author_image_url ?? "");
    setTranslatorImg(b?.translator_image_url ?? "");
    setIllustratorImg(b?.illustrator_image_url ?? "");
    setPublisherImg(b?.publisher_image_url ?? "");

    setAuthorReading(b?.author_reading ?? "");
    setTranslatorReading(b?.translator_reading ?? "");
    setIllustratorReading(b?.illustrator_reading ?? "");

    setLinksText(linksToText(b?.related_links));
  };

  const saveAll = async () => {
    if (!row?.id || !row.books?.id) return;

    setSaving(true);
    setError(null);

    const started_at = startedAt.trim() ? startedAt.trim() : null;
    const finished_at = finishedAt.trim() ? finishedAt.trim() : null;

    const pc = pageCount.trim() ? Number(pageCount.trim()) : null;
    const page_count = Number.isFinite(pc as any) ? (pc as number) : null;

    const ro = ratingOverall.trim() ? clampRating5(Number(ratingOverall.trim())) : null;
    const rr = ratingRecommend.trim() ? clampRating5(Number(ratingRecommend.trim())) : null;
    const rd = ratingDifficulty.trim() ? clampRating5(Number(ratingDifficulty.trim())) : null;

    const related_links = linksText.trim() ? parseLinks(linksText) : null;

    const userBooksUpdate = supabase
      .from("user_books")
      .update({
        started_at,
        finished_at,
        notes: notes || null,
        my_review: myReview || null,
        rating_overall: ro,
        rating_recommend: rr,
        rating_difficulty: rd,
        reader_level: readerLevel || null,
        recommended_level: recommendedLevel || null,
      })
      .eq("id", row.id);

    const booksUpdate = supabase
      .from("books")
      .update({
        author: authorName || null,
        translator: translatorName || null,
        illustrator: illustratorName || null,
        publisher: publisherName || null,
        genre: genre || null,
        trigger_warnings: triggerWarnings || null,
        page_count,
        isbn: isbn || null,
        isbn13: isbn13 || null,
        publisher_reading: publisherReading || null,
        publisher_image_url: publisherImg || null,
        related_links,
        cover_url: coverUrl || null,
        author_image_url: authorImg || null,
        translator_image_url: translatorImg || null,
        illustrator_image_url: illustratorImg || null,
        author_reading: authorReading || null,
        translator_reading: translatorReading || null,
        illustrator_reading: illustratorReading || null,
      })
      .eq("id", row.books.id);

    const [uRes, bRes] = await Promise.all([userBooksUpdate, booksUpdate]);

    if (uRes.error || bRes.error) {
      setError(
        `user_books: ${uRes.error?.message ?? "ok"} | books: ${bRes.error?.message ?? "ok"}`
      );
      setSaving(false);
      return;
    }

    setEditing(false);
    setSaving(false);
    await load();
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="text-sm text-gray-600">Loading book info…</div>
      </main>
    );
  }

  if (!row || !book) {
    return (
      <main className="p-6">
        <div className="text-2xl font-semibold">Book not found</div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        <button
          onClick={() => router.push("/books")}
          className="mt-4 rounded bg-gray-800 px-6 py-3 text-white transition hover:bg-gray-900"
        >
          Back to Library
        </button>
      </main>
    );
  }

  const relatedLinksArr = Array.isArray(book.related_links) ? book.related_links : [];

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-5 md:flex-row md:items-start md:gap-8 md:p-8">
            <div className="w-[140px] md:w-[150px] shrink-0">
              {(editing ? coverUrl : book.cover_url) ? (
                <img
                  src={editing ? coverUrl : (book.cover_url ?? "")}
                  alt={`${book.title} cover`}
                  className="w-full rounded-2xl border border-stone-200 object-cover shadow-sm"
                />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-sm text-stone-400">
                  No cover
                </div>
              )}

              {editing && (
                <input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="Cover URL"
                  className="mt-3 w-full rounded border px-3 py-2 text-sm"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
                  {book.title}
                </h1>

                {book.author && (
                  <p className="text-lg text-stone-800 md:text-xl">
                    {book.author}
                    {book.author_reading ? (
                      <span className="ml-2 text-stone-500">（{book.author_reading}）</span>
                    ) : null}
                  </p>
                )}

              </div>

              <div className="mt-6 space-y-4">
  <div>
    <div className="mb-2 text-sm text-stone-700">
      <div className="font-medium">Progress</div>
      <div className="mt-1 text-stone-500">
        {progressPercent != null
          ? `${progressPercent}%`
          : finished
          ? "100%"
          : started
          ? "In progress"
          : "Not started"}
      </div>
    </div>

    <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
      <div
        className="h-full rounded-full bg-stone-700 transition-all"
        style={{
          width:
            progressPercent != null
              ? `${progressPercent}%`
              : finished
              ? "100%"
              : started
              ? "45%"
              : "0%",
        }}
      />
    </div>
  </div>

  <p className="text-sm text-stone-500">
    Last read: {lastReadDate ?? "—"}
  </p>
</div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={() => router.push("/books")}
                  className="rounded-2xl !bg-stone-700 px-4 py-2 text-sm font-medium !text-white transition hover:!bg-stone-800"
                >
                  Back to Library
                </button>

                {isTeacher ? (
                  !editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="rounded-2xl !bg-stone-900 px-4 py-2 text-sm font-medium !text-white transition hover:!bg-black"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={cancelEdits}
                        className="rounded-2xl !bg-stone-200 px-4 py-2 text-sm font-medium !text-stone-900 transition hover:!bg-stone-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveAll}
                        disabled={saving}
                        className="rounded-2xl !bg-blue-600 px-4 py-2 text-sm font-medium !text-white transition hover:!bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </>
                  )
                ) : null}
              </div>

              <div className="mt-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Student
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <button
                  onClick={() => router.push(`/books/${row.id}/words`)}
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                >
                  📚 Vocab List
                </button>

                <button
                  onClick={() => router.push(`/books/${row.id}/weekly-readings`)}
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                >
                  🈶 Reading Flashcards
                </button>

                <button
                  onClick={() => router.push(`/books/${row.id}/study`)}
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                >
                  🔁 Vocab Flashcards
                </button>
              </div>
            </div>

              {isTeacher && (
                <div className="mt-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    Teacher
                  </div>

                </div>
              )}
              {isTeacher && (
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <button
                    onClick={() => router.push(`/vocab/bulk?userBookId=${row.id}`)}
                    className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                  >
                    ➕ Add Vocab
                  </button>

                  <button
                    onClick={() => router.push(`/books/${row.id}/weekly-readings/prepare`)}
                    className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                  >
                    📝 Prepare Readings
                  </button>

                  <button
                    type="button"
                    onClick={() => alert("Notify Student coming next")}
                    className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                  >
                    🔔 Notify Student
                  </button>
                </div>
              )}
            </div>
          </div>

          {error ? (
            <div className="border-t border-stone-200 px-5 py-3 text-sm text-red-600 md:px-8">
              {error}
            </div>
          ) : null}

          <div className="mt-2 px-4 md:px-8">
            <div className="flex gap-2 border-b border-stone-300 px-2">
              <FilingTab active={activeTab === "book"} onClick={() => setActiveTab("book")}>
                Book
              </FilingTab>

              <FilingTab active={activeTab === "readers"} onClick={() => setActiveTab("readers")}>
                Readers
              </FilingTab>

              <FilingTab active={activeTab === "learners"} onClick={() => setActiveTab("learners")}>
                Learners
              </FilingTab>
            </div>

            <div className="rounded-b-2xl rounded-tr-2xl border border-stone-300 bg-white p-5 shadow-sm">
              {activeTab === "book" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Book Info</div>

                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <Detail
                        label="Genre"
                        value={book.genre}
                        editing={editing}
                        inputValue={genre}
                        setInputValue={setGenre}
                        placeholder="e.g. novel, mystery, picture book..."
                      />
                      <Detail
                        label="Page Count"
                        value={book.page_count}
                        editing={editing}
                        inputValue={pageCount}
                        setInputValue={setPageCount}
                        placeholder="e.g. 352"
                      />
                      <Detail
                        label="ISBN"
                        value={book.isbn}
                        editing={editing}
                        inputValue={isbn}
                        setInputValue={setIsbn}
                        placeholder="ISBN"
                      />
                      <Detail
                        label="ISBN-13"
                        value={book.isbn13}
                        editing={editing}
                        inputValue={isbn13}
                        setInputValue={setIsbn13}
                        placeholder="ISBN-13"
                      />
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-medium">Trigger Warnings</div>
                      {!editing ? (
                        <div className="mt-1 min-h-[40px] whitespace-pre-wrap text-sm text-stone-700">
                          {book.trigger_warnings?.trim() ? book.trigger_warnings : "—"}
                        </div>
                      ) : (
                        <textarea
                          value={triggerWarnings}
                          onChange={(e) => setTriggerWarnings(e.target.value)}
                          placeholder="Anything you want to flag"
                          className="mt-2 min-h-[90px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                        />
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">People</div>

                    <div className="space-y-4">
                      <PersonRow
                        label="Author"
                        name={editing ? authorName : book.author}
                        reading={editing ? authorReading : book.author_reading}
                        img={editing ? authorImg : book.author_image_url}
                        editing={editing}
                        nameValue={authorName}
                        setNameValue={setAuthorName}
                        imgValue={authorImg}
                        setImgValue={setAuthorImg}
                        readingValue={authorReading}
                        setReadingValue={setAuthorReading}
                      />

                      {(book.translator || book.translator_image_url || editing) && (
                        <PersonRow
                          label="Translator"
                          name={editing ? translatorName : book.translator}
                          reading={editing ? translatorReading : book.translator_reading}
                          img={editing ? translatorImg : book.translator_image_url}
                          editing={editing}
                          nameValue={translatorName}
                          setNameValue={setTranslatorName}
                          imgValue={translatorImg}
                          setImgValue={setTranslatorImg}
                          readingValue={translatorReading}
                          setReadingValue={setTranslatorReading}
                        />
                      )}

                      {(book.illustrator || book.illustrator_image_url || editing) && (
                        <PersonRow
                          label="Illustrator"
                          name={editing ? illustratorName : book.illustrator}
                          reading={editing ? illustratorReading : book.illustrator_reading}
                          img={editing ? illustratorImg : book.illustrator_image_url}
                          editing={editing}
                          nameValue={illustratorName}
                          setNameValue={setIllustratorName}
                          imgValue={illustratorImg}
                          setImgValue={setIllustratorImg}
                          readingValue={illustratorReading}
                          setReadingValue={setIllustratorReading}
                        />
                      )}

                      {(book.publisher || book.publisher_image_url || editing) && (
                        <PersonRow
                          label="Publisher"
                          name={editing ? publisherName : book.publisher}
                          reading={editing ? publisherReading : book.publisher_reading}
                          img={editing ? publisherImg : book.publisher_image_url}
                          editing={editing}
                          nameValue={publisherName}
                          setNameValue={setPublisherName}
                          imgValue={publisherImg}
                          setImgValue={setPublisherImg}
                          readingValue={publisherReading}
                          setReadingValue={setPublisherReading}
                        />
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Related Links</div>

                    {!editing ? (
                      relatedLinksArr.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {relatedLinksArr.map((l: any, idx: number) => {
                            const label = displayLinkLabel(l);
                            const url = displayLinkUrl(l);
                            return (
                              <li key={idx} className="flex items-center justify-between gap-3">
                                <span className="truncate">{label}</span>
                                {url ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0 text-blue-600 hover:underline"
                                  >
                                    Open
                                  </a>
                                ) : (
                                  <span className="text-stone-500">—</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="text-sm text-stone-500">—</div>
                      )
                    ) : (
                      <div>
                        <div className="mb-2 text-xs text-stone-500">
                          One per line. Optional format: <span className="font-mono">Label | URL</span>
                        </div>
                        <textarea
                          value={linksText}
                          onChange={(e) => setLinksText(e.target.value)}
                          placeholder={`Amazon | https://...\nPublisher | https://...\nhttps://...`}
                          className="min-h-[120px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "readers" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    
                    <div className="mb-3 text-sm font-semibold text-stone-900">Reading Summary</div>

                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded border bg-white p-3">
                        <div className="text-stone-600">Progress</div>
                        <div className="mt-1 font-medium">
                          {progressPercent != null ? `${progressPercent}%` : "—"}
                        </div>
                      </div>

                      <div className="rounded border bg-white p-3">
                        <div className="text-stone-600">Last read</div>
                        <div className="mt-1 font-medium">{lastReadDate ?? "—"}</div>
                      </div>

                      <div className="rounded border bg-white p-3">
                        <div className="text-stone-600">Total pages read</div>
                        <div className="mt-1 font-medium">{totalPagesRead || "—"}</div>
                      </div>

                      <div className="rounded border bg-white p-3">
                        <div className="text-stone-600">Total minutes read</div>
                        <div className="mt-1 font-medium">{totalMinutesRead || "—"}</div>
                      </div>

                      <div className="rounded border bg-white p-3 sm:col-span-2">
                        <div className="text-stone-600">Average minutes per page</div>
                        <div className="mt-1 font-medium">
                          {averageMinutesPerPage != null ? averageMinutesPerPage.toFixed(2) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">My Review</div>

                    {!editing ? (
                      <div className="min-h-[140px] whitespace-pre-wrap text-sm text-stone-700">
                        {row.my_review?.trim() ? row.my_review : "—"}
                      </div>
                    ) : (
                      <textarea
                        value={myReview}
                        onChange={(e) => setMyReview(e.target.value)}
                        placeholder="Write your review here…"
                        className="min-h-[160px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                      />
                    )}
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Ratings</div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <StarRatingField
                        label="Overall Rating"
                        value={row.rating_overall}
                        editing={editing}
                        inputValue={ratingOverall}
                        setInputValue={setRatingOverall}
                      />

                      <StarRatingField
                        label="Would Recommend"
                        value={row.rating_recommend}
                        editing={editing}
                        inputValue={ratingRecommend}
                        setInputValue={setRatingRecommend}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Reading History</div>

                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <DateField
                        label="Started"
                        value={started}
                        editing={editing}
                        inputValue={startedAt}
                        setInputValue={setStartedAt}
                      />

                      <DateField
                        label="Finished"
                        value={finished}
                        editing={editing}
                        inputValue={finishedAt}
                        setInputValue={setFinishedAt}
                      />

                      <div className="rounded border bg-white p-3 text-sm sm:col-span-2">
                        <div className="text-stone-600">Time to read</div>
                        <div className="mt-1 font-medium">{timeToRead ?? "—"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Log Reading Session</div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded border bg-white p-3 text-sm">
                        <div className="text-stone-600">Date</div>
                        <input
                          type="date"
                          value={sessionDate}
                          onChange={(e) => setSessionDate(e.target.value)}
                          className="mt-1 w-full rounded border px-2 py-1"
                        />
                      </div>

                      <div className="rounded border bg-white p-3 text-sm">
                        <div className="text-stone-600">Minutes read</div>
                        <input
                          type="number"
                          min={1}
                          value={sessionMinutesRead}
                          onChange={(e) => setSessionMinutesRead(e.target.value)}
                          placeholder="e.g. 25"
                          className="mt-1 w-full rounded border px-2 py-1"
                        />
                      </div>

                      <div className="rounded border bg-white p-3 text-sm">
                        <div className="text-stone-600">Start page</div>
                        <input
                          type="number"
                          min={1}
                          value={sessionStartPage}
                          onChange={(e) => setSessionStartPage(e.target.value)}
                          placeholder="e.g. 4"
                          className="mt-1 w-full rounded border px-2 py-1"
                        />
                      </div>

                      <div className="rounded border bg-white p-3 text-sm">
                        <div className="text-stone-600">End page</div>
                        <input
                          type="number"
                          min={1}
                          value={sessionEndPage}
                          onChange={(e) => setSessionEndPage(e.target.value)}
                          placeholder="e.g. 10"
                          className="mt-1 w-full rounded border px-2 py-1"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={saveReadingSession}
                        className="rounded-2xl !bg-stone-900 px-4 py-2 text-sm font-medium !text-white transition hover:!bg-black"
                      >
                        Save Session
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Favorite Quotes</div>
                    <div className="text-sm text-stone-600">
                      Personal quotes can live here later. Public sharing can stay limited to 2.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
  <div className="mb-3 text-sm font-semibold text-stone-900">Reading Sessions</div>

  {readingSessions.length === 0 ? (
    <div className="text-sm text-stone-500">No sessions yet.</div>
  ) : (
    <div className="space-y-2">
      {readingSessions.map((session) => {
        const pagesRead = session.end_page - session.start_page + 1;

        return (
          <div
            key={session.id}
            className="rounded-xl border bg-white p-3 text-sm text-stone-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{session.read_on}</div>
                <div className="mt-1">
                  p. {session.start_page} → {session.end_page}
                </div>
                <div className="mt-1 text-stone-500">
                  {session.minutes_read} min · {pagesRead} pages
                </div>
              </div>

              <button
                type="button"
                onClick={() => deleteReadingSession(session.id)}
                className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
              >
                Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "learners" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Learning Snapshot</div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded border bg-white p-3 text-sm">
                        <div className="text-stone-600">My Level at Time of Reading</div>
                        {!editing ? (
                          <div className="mt-1 font-medium">{row.reader_level || "—"}</div>
                        ) : (
                          <select
                            value={readerLevel}
                            onChange={(e) => setReaderLevel(e.target.value)}
                            className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
                          >
                            <option value="">—</option>
                            {LEVEL_OPTIONS.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <DifficultyField
                        value={row.rating_difficulty}
                        editing={editing}
                        inputValue={ratingDifficulty}
                        setInputValue={setRatingDifficulty}
                      />

                      <div className="rounded border bg-white p-3 text-sm sm:col-span-2">
                        <div className="text-stone-600">Words looked up (unique)</div>
                        <div className="mt-1 font-medium">
                          {uniqueLookupCount == null ? "—" : uniqueLookupCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Main Words</div>
                    <div className="text-sm text-stone-600">
                      Personal main words can live here later. Personal limit: 10. Public share: 5.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Difficult Sentences</div>
                    <div className="text-sm text-stone-600">
                      Learner-marked difficult sentences can live here later. Public sharing can stay limited to 2.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-stone-900">Character List</div>

                      {editing && (
                        <button
                          type="button"
                          onClick={addCharacter}
                          className="rounded !bg-stone-900 px-3 py-1 text-xs font-medium !text-white transition hover:!bg-black"
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    {characters.length === 0 && !editing && (
                      <div className="text-sm text-stone-500">—</div>
                    )}

                    <div className="space-y-4">
                      {characters.map((c) => (
                        <div key={c.id} className="rounded-xl border bg-white p-3">
                          {!editing ? (
                            <>
                              <div className="text-sm font-medium text-stone-900">
                                {c.name || "—"}
                                {c.reading && (
                                  <span className="ml-2 text-stone-500">（{c.reading}）</span>
                                )}
                              </div>

                              {c.role && (
                                <div className="mt-1 text-xs text-stone-500">{c.role}</div>
                              )}

                              {c.notes && (
                                <div className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                                  {c.notes}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  value={c.name}
                                  onChange={(e) => updateCharacter(c.id, "name", e.target.value)}
                                  placeholder="Name"
                                  className="w-1/2 rounded border px-2 py-1 text-sm"
                                />
                                <input
                                  value={c.reading}
                                  onChange={(e) => updateCharacter(c.id, "reading", e.target.value)}
                                  placeholder="Reading"
                                  className="w-1/2 rounded border px-2 py-1 text-sm"
                                />
                              </div>

                              <input
                                value={c.role}
                                onChange={(e) => updateCharacter(c.id, "role", e.target.value)}
                                placeholder="Role (e.g. 主人公, 先輩, 母)"
                                className="w-full rounded border px-2 py-1 text-sm"
                              />

                              <textarea
                                value={c.notes}
                                onChange={(e) => updateCharacter(c.id, "notes", e.target.value)}
                                placeholder="Notes about this character"
                                className="w-full rounded border p-2 text-sm"
                              />

                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeCharacter(c.id)}
                                  className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Chapter Summaries</div>
                    <div className="text-sm text-stone-600">
                      Personal chapter summaries can live here later to help readers remember the story flow.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="text-sm font-medium">Learning Notes</div>

                    {!editing ? (
                      <div className="mt-3 min-h-[260px] whitespace-pre-wrap text-sm text-stone-700">
                        {row.notes?.trim() ? row.notes : "—"}
                      </div>
                    ) : (
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Japanese-learning notes, tricky patterns, reminders, reading support notes, etc."
                        className="mt-3 min-h-[260px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FilingTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative -mb-px rounded-t-2xl border px-6 py-3 text-base font-medium transition",
        active
          ? "z-10 border-stone-300 border-b-white bg-white text-stone-900 shadow-sm"
          : "border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Detail({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
  placeholder,
}: {
  label: string;
  value: any;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
  placeholder?: string;
}) {
  const display =
    value === null || value === undefined || value === "" ? "—" : String(value);

  return (
    <div className="rounded border bg-white p-3">
      <div className="text-stone-600">{label}</div>
      {!editing ? (
        <div className="font-medium">{display}</div>
      ) : (
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
}: {
  label: string;
  value: Date | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
}) {
  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">{label}</div>
      {!editing ? (
        <div className="mt-1 font-medium">{value ? formatYmd(value) : "—"}</div>
      ) : (
        <input
          type="date"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      )}
    </div>
  );
}

function StarRatingField({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
}: {
  label: string;
  value: number | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
}) {
  const selected = inputValue ? Number(inputValue) : null;

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">{label}</div>

      {!editing ? (
        <>
          <div className="mt-1 font-medium">{value ? `${value}/5` : "—"}</div>
          <div className="text-amber-600">{stars5(value)}</div>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const isSelected = selected === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setInputValue(String(n))}
                className={`rounded-lg border px-3 py-2 transition ${
                  isSelected
                    ? "border-amber-500 bg-amber-50 shadow-sm"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <span className="font-medium text-amber-600">{stars5(n)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DifficultyField({
  value,
  editing,
  inputValue,
  setInputValue,
}: {
  value: number | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
}) {
  const selected = inputValue ? Number(inputValue) : null;
  const label = DIFFICULTY_OPTIONS.find((o) => o.value === value)?.label ?? "";

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">Difficulty (for me)</div>

      {!editing ? (
        <>
          <div className="mt-1 font-medium">{value ? `${value}/5` : "—"}</div>
          <div className="text-amber-600">{stars5(value)}</div>
          <div className="mt-1 text-xs text-stone-500">{label}</div>
        </>
      ) : (
        <div className="mt-2 space-y-2">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInputValue(String(opt.value))}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  isSelected
                    ? "border-stone-900 bg-stone-100"
                    : "border-stone-200 hover:bg-stone-50"
                }`}
              >
                <div className="text-amber-600">{stars5(opt.value)}</div>
                <div className="text-xs text-stone-600">{opt.label}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonRow({
  label,
  name,
  reading,
  img,
  editing,
  nameValue,
  setNameValue,
  imgValue,
  setImgValue,
  readingValue,
  setReadingValue,
}: {
  label: string;
  name: string | null | undefined;
  reading: string | null | undefined;
  img: string | null | undefined;
  editing: boolean;
  nameValue: string;
  setNameValue: (v: string) => void;
  imgValue: string;
  setImgValue: (v: string) => void;
  readingValue: string;
  setReadingValue: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-stone-100">
        {img ? (
          <img src={img} alt={name || label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!editing ? (
          <>
            <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
            <div className="mt-1 text-sm font-medium text-stone-900">{name || "—"}</div>
            <div className="text-sm text-stone-500">{reading || "—"}</div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder={`${label} name`}
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <input
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              placeholder={`${label} reading`}
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <input
              value={imgValue}
              onChange={(e) => setImgValue(e.target.value)}
              placeholder={`${label} image URL`}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}