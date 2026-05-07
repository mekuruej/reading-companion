// Book Stats Page
//

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Book = {
  id: string;
  title: string | null;
  title_reading: string | null;
  cover_url: string | null;
  book_type: string | null;
  page_count: number | null;
};

type UserBook = {
  id: string;
  user_id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  rating_difficulty: number | null;
  books: Book | null;
};

type ReadingSession = {
  id: string;
  user_book_id: string;
  read_on: string;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  is_filler: boolean | null;
  created_at: string;
  session_mode: string | null;
};

type ComparisonBook = {
  id: string;
  rating_difficulty: number | null;
  books: {
    book_type: string | null;
  } | null;
};

function formatMinutes(total: number | null) {
  if (!total || total <= 0) return "—";

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function bookTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "picture_book":
      return "picture books";
    case "early_reader":
      return "early readers";
    case "chapter_book":
      return "chapter books";
    case "middle_grade":
      return "middle grade books";
    case "ya":
      return "YA books";
    case "novel":
      return "novels";
    case "short_story":
      return "short stories";
    case "manga":
      return "manga";
    case "nonfiction":
      return "nonfiction books";
    case "essay":
      return "essays";
    case "memoir":
      return "memoirs";
    case "textbook":
      return "textbooks";
    case "other":
      return "books of this type";
    default:
      return "books of this type";
  }
}

function statusLabel(row: UserBook | null) {
  if (!row) return "—";
  if (row.dnf_at) return "DNF";
  if (row.finished_at) return "Finished";
  if (row.started_at) return "Reading";
  return "Not started";
}

function difficultyText(value: number | null) {
  switch (value) {
    case 1:
      return "Extremely difficult";
    case 2:
      return "Very difficult";
    case 3:
      return "Challenging but manageable";
    case 4:
      return "Pretty comfortable";
    case 5:
      return "Very easy";
    default:
      return "Not rated yet";
  }
}

function difficultyNeighborhood(percentHarderThan: number | null) {
  if (percentHarderThan == null) {
    return {
      label: "Not enough data yet",
      colorClass: "border-stone-200 bg-stone-50 text-stone-800",
      note: "Rate more books of this type to see where this one sits.",
    };
  }

  if (percentHarderThan >= 80) {
    return {
      label: "Mountain Book",
      colorClass: "border-rose-200 bg-rose-50 text-rose-900",
      note: "This one sits near the harder end of your shelf.",
    };
  }

  if (percentHarderThan >= 60) {
    return {
      label: "Tough Climb",
      colorClass: "border-orange-200 bg-orange-50 text-orange-900",
      note: "This book felt harder than most of your books of this type.",
    };
  }

  if (percentHarderThan >= 40) {
    return {
      label: "In the Neighborhood",
      colorClass: "border-yellow-200 bg-yellow-50 text-yellow-900",
      note: "This book sits around the middle of your books of this type.",
    };
  }

  if (percentHarderThan >= 20) {
    return {
      label: "Comfortable Read",
      colorClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
      note: "This book felt easier than many of your books of this type.",
    };
  }

  return {
    label: "Gentle Read",
    colorClass: "border-sky-200 bg-sky-50 text-sky-900",
    note: "This one sits near the gentler end of your shelf.",
  };
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-stone-900">{value}</div>
      {note ? <div className="mt-1 text-xs text-stone-500">{note}</div> : null}
    </div>
  );
}

export default function BookStatsPage() {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [row, setRow] = useState<UserBook | null>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [comparisonBooks, setComparisonBooks] = useState<ComparisonBook[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (!userBookId) return;

      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setErrorMessage("Please sign in.");
        setLoading(false);
        return;
      }

      const { data: userBookData, error: userBookError } = await supabase
        .from("user_books")
        .select(`
          id,
          user_id,
          started_at,
          finished_at,
          dnf_at,
          rating_difficulty,
          books (
            id,
            title,
            title_reading,
            cover_url,
            book_type,
            page_count
          )
        `)
        .eq("id", userBookId)
        .single();

      if (cancelled) return;

      if (userBookError) {
        console.error("Error loading book stats:", userBookError);
        setErrorMessage("Could not load book stats.");
        setLoading(false);
        return;
      }

      const loadedRow = userBookData as unknown as UserBook;
      setRow(loadedRow);

      const [{ data: sessionData, error: sessionError }, wordCountResult] =
        await Promise.all([
          supabase
            .from("user_book_reading_sessions")
            .select(
              "id, user_book_id, read_on, start_page, end_page, minutes_read, is_filler, created_at, session_mode"
            )
            .eq("user_book_id", userBookId)
            .order("read_on", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("user_book_words")
            .select("id", { count: "exact", head: true })
            .eq("user_book_id", userBookId),
        ]);

      if (cancelled) return;

      if (sessionError) {
        console.error("Error loading book sessions:", sessionError);
        setSessions([]);
      } else {
        setSessions((sessionData as ReadingSession[]) ?? []);
      }

      if (wordCountResult.error) {
        console.error("Error loading word count:", wordCountResult.error);
        setWordCount(null);
      } else {
        setWordCount(wordCountResult.count ?? 0);
      }

      const { data: comparisonData, error: comparisonError } = await supabase
        .from("user_books")
        .select(`
          id,
          rating_difficulty,
          books (
            book_type
          )
        `)
        .eq("user_id", loadedRow.user_id)
        .not("rating_difficulty", "is", null);

      if (cancelled) return;

      if (comparisonError) {
        console.error("Error loading difficulty comparison:", comparisonError);
        setComparisonBooks([]);
      } else {
        setComparisonBooks((comparisonData as unknown as ComparisonBook[]) ?? []);
      }

      setLoading(false);
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  const book = row?.books ?? null;
  const realSessions = useMemo(() => sessions.filter((s) => !s.is_filler), [sessions]);

  const pageTrackedSessions = useMemo(() => {
    return realSessions.filter((s) => s.start_page != null && s.end_page != null);
  }, [realSessions]);

  const timedSessions = useMemo(() => {
    return realSessions.filter((s) => s.minutes_read != null && s.minutes_read > 0);
  }, [realSessions]);

  const timedPageTrackedSessions = useMemo(() => {
    return timedSessions.filter((s) => s.start_page != null && s.end_page != null);
  }, [timedSessions]);

  const curiositySessions = useMemo(() => {
    return realSessions.filter((s) => s.session_mode === "curiosity");
  }, [realSessions]);

  const fluidSessions = useMemo(() => {
    return realSessions.filter((s) => s.session_mode === "fluid");
  }, [realSessions]);

  const listeningSessions = useMemo(() => {
    return realSessions.filter((s) => s.session_mode === "listening");
  }, [realSessions]);

  const curiosityMinutes = useMemo(() => {
    return curiositySessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [curiositySessions]);

  const fluidMinutes = useMemo(() => {
    return fluidSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [fluidSessions]);

  const listeningMinutes = useMemo(() => {
    return listeningSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [listeningSessions]);

  const totalTrackedMinutes = useMemo(() => {
    return curiosityMinutes + fluidMinutes + listeningMinutes;
  }, [curiosityMinutes, fluidMinutes, listeningMinutes]);

  const pagesRead = useMemo(() => {
    return pageTrackedSessions.reduce((sum, s) => {
      if (s.start_page == null || s.end_page == null) return sum;
      return sum + (s.end_page - s.start_page + 1);
    }, 0);
  }, [pageTrackedSessions]);

  const timedPages = useMemo(() => {
    return timedPageTrackedSessions.reduce((sum, s) => {
      if (s.start_page == null || s.end_page == null) return sum;
      return sum + (s.end_page - s.start_page + 1);
    }, 0);
  }, [timedPageTrackedSessions]);

  const timedPageMinutes = useMemo(() => {
    return timedPageTrackedSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [timedPageTrackedSessions]);

  const daysEngaged = useMemo(() => {
    if (realSessions.length === 0) return null;
    return new Set(realSessions.map((s) => s.read_on)).size;
  }, [realSessions]);

  const lastEngaged = realSessions[0]?.read_on ?? null;

  const overallMinPerPage = timedPages > 0 ? timedPageMinutes / timedPages : null;
  const pagesPerHour = overallMinPerPage ? 60 / overallMinPerPage : null;

  const curiosityPageStats = useMemo(() => {
    const valid = curiositySessions.filter(
      (s) => s.minutes_read != null && s.minutes_read > 0 && s.start_page != null && s.end_page != null
    );

    const pages = valid.reduce((sum, s) => {
      if (s.start_page == null || s.end_page == null) return sum;
      return sum + (s.end_page - s.start_page + 1);
    }, 0);

    const minutes = valid.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);

    return pages > 0 ? minutes / pages : null;
  }, [curiositySessions]);

  const fluidPageStats = useMemo(() => {
    const valid = fluidSessions.filter(
      (s) => s.minutes_read != null && s.minutes_read > 0 && s.start_page != null && s.end_page != null
    );

    const pages = valid.reduce((sum, s) => {
      if (s.start_page == null || s.end_page == null) return sum;
      return sum + (s.end_page - s.start_page + 1);
    }, 0);

    const minutes = valid.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);

    return pages > 0 ? minutes / pages : null;
  }, [fluidSessions]);

  const difficultyComparison = useMemo(() => {
    if (!row || row.rating_difficulty == null || !book?.book_type) {
      return {
        sampleSize: 0,
        percentHarderThan: null as number | null,
      };
    }

    const sameTypeRatedBooks = comparisonBooks.filter((item) => {
      return (
        item.id !== row.id &&
        item.rating_difficulty != null &&
        item.books?.book_type === book.book_type
      );
    });

    if (sameTypeRatedBooks.length < 3) {
      return {
        sampleSize: sameTypeRatedBooks.length,
        percentHarderThan: null as number | null,
      };
    }

    // Difficulty scale: 1 = hardest, 5 = easiest.
    // This book is "harder than" books with a higher/easier rating.
    const easierBooks = sameTypeRatedBooks.filter(
      (item) =>
        item.rating_difficulty != null &&
        item.rating_difficulty > (row.rating_difficulty as number)
    );

    const percentHarderThan = Math.round(
      (easierBooks.length / sameTypeRatedBooks.length) * 100
    );

    return {
      sampleSize: sameTypeRatedBooks.length,
      percentHarderThan,
    };
  }, [row, book?.book_type, comparisonBooks]);

  const neighborhood = difficultyNeighborhood(difficultyComparison.percentHarderThan);
  const typeLabel = bookTypeLabel(book?.book_type);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
          Loading book stats...
        </div>
      </main>
    );
  }

  if (errorMessage || !row || !book) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {errorMessage || "Book stats not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <button
          type="button"
          onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
          className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-stone-800"
        >
          ← Back to Book Hub
        </button>

        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="grid gap-6 p-6 md:grid-cols-[140px_minmax(0,1fr)] md:p-8">
            <div>
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={`${book.title ?? "Book"} cover`}
                  className="w-32 rounded-2xl border border-stone-200 object-cover shadow-sm md:w-36"
                />
              ) : (
                <div className="flex aspect-[2/3] w-32 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-sm text-stone-400 md:w-36">
                  No cover
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Book Stats
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900 md:text-4xl">
                {book.title ?? "Untitled book"}
              </h1>
              {book.title_reading ? (
                <p className="mt-1 text-lg text-stone-500">{book.title_reading}</p>
              ) : null}

              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
                A light snapshot of this book’s reading history, time, pace, vocabulary,
                and where its difficulty sits in your own library.
              </p>
            </div>
          </div>
        </section>

        <section className={`rounded-3xl border p-5 shadow-sm ${neighborhood.colorClass}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                Difficulty Neighborhood
              </div>
              <div className="mt-2 text-3xl font-black">{neighborhood.label}</div>

              {difficultyComparison.percentHarderThan != null ? (
                <p className="mt-2 text-sm leading-6">
                  Harder than{" "}
                  <span className="font-black">
                    {difficultyComparison.percentHarderThan}%
                  </span>{" "}
                  of your other {typeLabel}.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6">{neighborhood.note}</p>
              )}
            </div>

            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm shadow-sm">
              <div className="font-semibold">Your rating</div>
              <div className="mt-1">
                {row.rating_difficulty ? `${row.rating_difficulty}/5` : "Not rated"}
              </div>
              <div className="mt-1 text-xs opacity-70">
                {difficultyText(row.rating_difficulty)}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs opacity-70">
            Compared only with your rated {typeLabel}.{" "}
            {difficultyComparison.sampleSize > 0
              ? `Based on ${difficultyComparison.sampleSize} other rated ${typeLabel}.`
              : "Rate more books of this type to compare fairly."}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-stone-900">Progress Snapshot</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Status" value={statusLabel(row)} />
            <StatCard
              label="Pages Read"
              value={pagesRead || "—"}
              note="Page-tracked sessions only"
            />
            <StatCard
              label="Days Engaged"
              value={daysEngaged ?? "—"}
              note="Reading or listening dates"
            />
            <StatCard label="Last Engaged" value={lastEngaged ?? "—"} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-stone-900">Time by Mode</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Curiosity Reading"
              value={formatMinutes(curiosityMinutes)}
              note="Intensive reading"
            />
            <StatCard
              label="Fluid Reading"
              value={formatMinutes(fluidMinutes)}
              note="Saved support + just reading"
            />
            <StatCard
              label="Listening"
              value={formatMinutes(listeningMinutes)}
              note="Ear training"
            />
            <StatCard
              label="Total Logged Time"
              value={formatMinutes(totalTrackedMinutes)}
              note="Reading and listening only"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-stone-900">Pace</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Overall Min/Page"
              value={overallMinPerPage != null ? overallMinPerPage.toFixed(2) : "—"}
              note="Page-tracked timed sessions"
            />
            <StatCard
              label="Pages/Hour"
              value={pagesPerHour != null ? pagesPerHour.toFixed(1) : "—"}
              note="Based on page-tracked time"
            />
            <StatCard
              label="Curiosity Min/Page"
              value={curiosityPageStats != null ? curiosityPageStats.toFixed(2) : "—"}
              note="Intensive pace"
            />
            <StatCard
              label="Fluid Min/Page"
              value={fluidPageStats != null ? fluidPageStats.toFixed(2) : "—"}
              note="Extensive pace"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-stone-900">Vocabulary</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Words Saved"
              value={wordCount ?? "—"}
              note="Saved words from this book"
            />
            <StatCard
              label="Words/Page"
              value={pagesRead > 0 && wordCount != null ? (wordCount / pagesRead).toFixed(2) : "—"}
              note="Based on page-tracked progress"
            />
          </div>
        </section>
      </div>
    </main>
  );
}