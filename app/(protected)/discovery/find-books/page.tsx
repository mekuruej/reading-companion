// Find Your Next Book
//
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { BOOK_TYPE_OPTIONS, bookTypeTitleLabel } from "@/lib/books/bookTypes";
import FindBooksPageHeader from "./components/FindBooksPageHeader";
import FindBooksErrorBanner from "./components/FindBooksErrorBanner";
import FindBooksResultsState from "./components/FindBooksResultsState";
import RatingStars from "./components/RatingStars";
import CompactRatingPill from "./components/CompactRatingPill";
import FindBooksFilterPanel from "./components/FindBooksFilterPanel";
import ReaderSignalCard from "./components/ReaderSignalCard";
import BookRecommendationCard from "./components/BookRecommendationCard";

type BookMeta = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
};

type RecommendationSignalRow = {
  id: string;
  book_id: string;
  reader_level: string | null;
  book_type: string | null;
  difficulty_rating: number | null;
  entertainment_rating: number | null;
  reader_advice: string | null;
  updated_at: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_url: string | null;
  book_metadata_type: string | null;
};

type UserBookMatchRow = {
  id: string;
  book_id: string | null;
};

type BookRatingSignal = {
  id: string;
  readerLevel: string | null;
  entertainmentRating: number | null;
  difficultyRating: number | null;
  readerAdvice: string | null;
  updatedAt: string | null;
};

type RatedBookGroup = {
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  bookType: string | null;
  signals: BookRatingSignal[];
  latestSignalAt: string | null;
  averageEntertainmentRating: number | null;
  averageDifficultyRating: number | null;
};

type SortMode = "recent" | "rating" | "rating_low" | "ease" | "difficulty";

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverage(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(1);
}

function firstBook(row: RecommendationSignalRow): BookMeta | null {
  if (!row.book_id) return null;

  return {
    id: row.book_id,
    title: row.book_title,
    author: row.book_author,
    cover_url: row.book_cover_url,
    book_type: row.book_metadata_type ?? row.book_type,
  };
}

function cleanReaderAdvice(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  return cleaned ? cleaned.slice(0, 120) : null;
}

function bookTypeLabel(value: string | null | undefined) {
  return bookTypeTitleLabel(value);
}

function formatReaderLevel(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "Reader level not shared";
  const levelMatch = cleaned.match(/^Level\s+(\d+)$/i) ?? cleaned.match(/^(\d+)$/);
  const levelNumber = levelMatch?.[1];

  if (levelNumber) {
    const levelDescriptions: Record<string, string> = {
      "1": "pre-N5",
      "2": "early N5",
      "3": "solid N5",
      "4": "lower N4",
      "5": "upper N4",
      "6": "lower N3",
      "7": "upper N3",
      "8": "lower N2",
      "9": "lower N1",
      "10": "upper N1",
    };

    const description = levelDescriptions[levelNumber];
    return description ? `Level ${levelNumber} (${description})` : `Level ${levelNumber}`;
  }

  return cleaned;
}

export default function FindBooksPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ratingRows, setRatingRows] = useState<RecommendationSignalRow[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [bookTypeFilter, setBookTypeFilter] = useState("all");
  const [readerLevelFilter, setReaderLevelFilter] = useState("all");
  const [userBookIdsByBookId, setUserBookIdsByBookId] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;

    async function loadRatedBooks() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data, error } = await supabase
          .from("public_book_recommendation_signals")
          .select(
            `
              id,
              book_id,
              reader_level,
              book_type,
              difficulty_rating,
              entertainment_rating,
              reader_advice,
              updated_at,
              book_title,
              book_author,
              book_cover_url,
              book_metadata_type
            `
          )
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(1000);

        if (error) throw error;
        if (!alive) return;

        const rows = (data ?? []) as RecommendationSignalRow[];
        setRatingRows(rows);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setUserBookIdsByBookId({});
          return;
        }

        const bookIds = Array.from(
          new Set(
            rows
              .map((row) => firstBook(row)?.id)
              .filter((bookId): bookId is string => !!bookId)
          )
        );

        if (bookIds.length === 0) {
          setUserBookIdsByBookId({});
          return;
        }

        const { data: userBooks, error: userBooksError } = await supabase
          .from("user_books")
          .select("id, book_id")
          .eq("user_id", user.id)
          .in("book_id", bookIds);

        if (userBooksError) {
          console.error("Error loading find-books library matches:", userBooksError);
          setUserBookIdsByBookId({});
          return;
        }

        if (!alive) return;

        setUserBookIdsByBookId(
          ((userBooks ?? []) as UserBookMatchRow[]).reduce<Record<string, string>>(
            (matches, row) => {
              if (row.book_id) matches[row.book_id] = row.id;
              return matches;
            },
            {}
          )
        );
      } catch (error: any) {
        console.error("Error loading find-books recommendation signals:", error);
        if (!alive) return;
        setErrorMsg(error?.message ?? "Could not load book recommendations yet.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadRatedBooks();

    return () => {
      alive = false;
    };
  }, []);

  const bookTypeOptions = useMemo(() => {
    const types = new Set<string>(BOOK_TYPE_OPTIONS.map((option) => option.value));
    for (const row of ratingRows) {
      const book = firstBook(row);
      const type = row.book_type ?? book?.book_type ?? null;
      if (type) types.add(type);
    }
    return Array.from(types).sort((a, b) =>
      bookTypeLabel(a).localeCompare(bookTypeLabel(b))
    );
  }, [ratingRows]);

  const readerLevelOptions = useMemo(() => {
    const levels = new Set<string>();
    for (const row of ratingRows) {
      const level = row.reader_level;
      if (level) levels.add(level);
    }
    return Array.from(levels).sort((a, b) =>
      formatReaderLevel(a).localeCompare(formatReaderLevel(b))
    );
  }, [ratingRows]);

  const ratedBookGroups = useMemo(() => {
    const map = new Map<string, RatedBookGroup>();

    for (const row of ratingRows) {
      const book = firstBook(row);
      if (!book?.id) continue;
      const bookType = row.book_type ?? book.book_type ?? null;
      if (bookTypeFilter !== "all" && bookType !== bookTypeFilter) continue;
      const readerLevel = row.reader_level;
      if (readerLevelFilter !== "all" && readerLevel !== readerLevelFilter) {
        continue;
      }

      const existing =
        map.get(book.id) ??
        {
          bookId: book.id,
          title: book.title ?? "Untitled book",
          author: book.author ?? null,
          coverUrl: book.cover_url ?? null,
          bookType,
          signals: [],
          latestSignalAt: null,
          averageEntertainmentRating: null,
          averageDifficultyRating: null,
        };

      existing.signals.push({
        id: row.id,
        readerLevel,
        entertainmentRating: row.entertainment_rating,
        difficultyRating: row.difficulty_rating,
        readerAdvice: cleanReaderAdvice(row.reader_advice),
        updatedAt: row.updated_at,
      });

      map.set(book.id, existing);
    }

    const groups = Array.from(map.values()).map((group) => {
      const sortedSignals = [...group.signals].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
      );

      return {
        ...group,
        signals: sortedSignals,
        latestSignalAt: sortedSignals[0]?.updatedAt ?? null,
        averageEntertainmentRating: average(
          sortedSignals
            .map((signal) => signal.entertainmentRating)
            .filter((value): value is number => value != null)
        ),
        averageDifficultyRating: average(
          sortedSignals
            .map((signal) => signal.difficultyRating)
            .filter((value): value is number => value != null)
        ),
      };
    });

    return groups.sort((a, b) => {
      if (sortMode === "ease") {
        return (a.averageDifficultyRating ?? 999) - (b.averageDifficultyRating ?? 999);
      }
      if (sortMode === "difficulty") {
        return (b.averageDifficultyRating ?? -1) - (a.averageDifficultyRating ?? -1);
      }
      if (sortMode === "rating") {
        return (b.averageEntertainmentRating ?? -1) - (a.averageEntertainmentRating ?? -1);
      }
      if (sortMode === "rating_low") {
        return (a.averageEntertainmentRating ?? 999) - (b.averageEntertainmentRating ?? 999);
      }
      return (b.latestSignalAt ?? "").localeCompare(a.latestSignalAt ?? "");
    });
  }, [ratingRows, sortMode, bookTypeFilter, readerLevelFilter]);

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <FindBooksPageHeader />

        <FindBooksErrorBanner message={errorMsg} />

        <FindBooksFilterPanel
          readerLevelFilter={readerLevelFilter}
          bookTypeFilter={bookTypeFilter}
          sortMode={sortMode}
          readerLevelOptions={readerLevelOptions}
          bookTypeOptions={bookTypeOptions}
          formatReaderLevel={formatReaderLevel}
          bookTypeLabel={bookTypeLabel}
          onReaderLevelChange={setReaderLevelFilter}
          onBookTypeChange={setBookTypeFilter}
          onSortModeChange={setSortMode}
        />

        <section className="mt-5 grid gap-4">
          {loading ? (
            <FindBooksResultsState type="loading" />
          ) : ratedBookGroups.length === 0 ? (
            <FindBooksResultsState type="empty" />
          ) : (
            ratedBookGroups.map((book) => {
              const shouldShowAverageRatings = book.signals.length >= 2;
              const readerCountLabel = `${book.signals.length} reader${book.signals.length === 1 ? "" : "s"}`;
              const userBookId = userBookIdsByBookId[book.bookId];

              return (
                <BookRecommendationCard
                  key={book.bookId}
                  book={book}
                  userBookId={userBookId}
                  showAverageRatings={shouldShowAverageRatings}
                  readerCountLabel={readerCountLabel}
                  bookTypeLabel={bookTypeLabel}
                  formatReaderLevel={formatReaderLevel}
                  formatValue={formatAverage}
                />
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
