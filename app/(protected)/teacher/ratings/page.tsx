// Teacher Ratings Index
//

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  TeacherRatingBookCard,
  type TeacherRatingBookCardItem,
} from "./components/TeacherRatingBookCard";
import { TeacherRatingsFilterPanel } from "./components/TeacherRatingsFilterPanel";
import { TeacherRatingsHeader } from "./components/TeacherRatingsHeader";
import { TeacherRatingsState } from "./components/TeacherRatingsState";
import { TeacherRatingsSummaryCards } from "./components/TeacherRatingsSummaryCards";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  role?: string | null;
  is_super_teacher?: boolean | null;
};

type BookRow = {
  title: string | null;
  author: string | null;
  cover_url: string | null;
  book_type: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  notes: string | null;
  recommended_level: string | null;
  teacher_student_use_rating: number | null;
  rating_recommend: number | null;
  finished_at: string | null;
  dnf_at: string | null;
  dnf_reason: string | null;
  dnf_note: string | null;
  would_retry: string | null;
  created_at: string | null;
  books: BookRow | BookRow[] | null;
};

type StatusFilter = "all" | "rated" | "needs-rating" | "strong-fit";
type SortMode = "student-use-desc" | "language-desc" | "recent" | "title";

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function getBook(bookRow: UserBookRow["books"]) {
  if (!bookRow) return null;
  return Array.isArray(bookRow) ? bookRow[0] ?? null : bookRow;
}

function displayName(profile: ProfileRow | null | undefined) {
  return profile?.display_name || profile?.username || "Unnamed learner";
}

function hasTeacherReview(row: UserBookRow) {
  return (
    !!String(row.recommended_level ?? "").trim() ||
    row.teacher_student_use_rating != null ||
    row.rating_recommend != null ||
    !!String(row.notes ?? "").trim()
  );
}

function toItem(row: UserBookRow, learnerById: Map<string, ProfileRow>): TeacherRatingBookCardItem {
  const book = getBook(row.books);

  return {
    id: row.id,
    title: book?.title?.trim() || "Untitled book",
    author: book?.author?.trim() || null,
    coverUrl: book?.cover_url ?? null,
    bookType: book?.book_type ?? null,
    learnerName: displayName(learnerById.get(row.user_id)),
    recommendedLevel: row.recommended_level,
    studentUseRating: row.teacher_student_use_rating,
    languageLearningRating: row.rating_recommend,
    notes: row.notes,
    finishedAt: row.finished_at,
    dnfAt: row.dnf_at,
    dnfReason: row.dnf_reason,
    dnfNote: row.dnf_note,
    wouldRetry: row.would_retry,
    hasTeacherReview: hasTeacherReview(row),
  };
}

function ratingValue(value: number | null) {
  return value == null ? -1 : value;
}

function compareItems(a: TeacherRatingBookCardItem, b: TeacherRatingBookCardItem, sortMode: SortMode) {
  if (sortMode === "title") {
    return a.title.localeCompare(b.title, "ja");
  }

  if (sortMode === "language-desc") {
    return ratingValue(b.languageLearningRating) - ratingValue(a.languageLearningRating);
  }

  if (sortMode === "recent") {
    const aDate = a.finishedAt || a.dnfAt || "";
    const bDate = b.finishedAt || b.dnfAt || "";
    return bDate.localeCompare(aDate);
  }

  return ratingValue(b.studentUseRating) - ratingValue(a.studentUseRating);
}

export default function TeacherRatingsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<TeacherRatingBookCardItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("student-use-desc");

  useEffect(() => {
    let cancelled = false;

    async function loadTeacherRatings() {
      setLoading(true);
      setMessage("");

      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        const user = auth?.user;

        if (cancelled) return;

        if (authError || !user) {
          setMessage("Please sign in to use Teacher Ratings.");
          setItems([]);
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, username, role, is_super_teacher")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        if (profileError) throw profileError;

        const isTeacher =
          profile?.role === "teacher" ||
          profile?.role === "super_teacher" ||
          isSuperTeacherFlag(profile?.is_super_teacher);

        if (!isTeacher) {
          setMessage("Teacher access is required.");
          setItems([]);
          setLoading(false);
          return;
        }

        const { data: teacherLinks, error: teacherLinksError } = await supabase
          .from("teacher_students")
          .select("student_id")
          .eq("teacher_id", user.id)
          .is("archived_at", null);

        if (teacherLinksError) throw teacherLinksError;

        const learnerIds = Array.from(
          new Set([
            user.id,
            ...((teacherLinks ?? [])
              .map((row: any) => row.student_id)
              .filter(Boolean) as string[]),
          ])
        );

        const [{ data: learnerRows, error: learnerError }, { data: bookRows, error: bookError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("id, display_name, username")
              .in("id", learnerIds)
              .returns<ProfileRow[]>(),
            supabase
              .from("user_books")
              .select(
                `
                  id,
                  user_id,
                  notes,
                  recommended_level,
                  teacher_student_use_rating,
                  rating_recommend,
                  finished_at,
                  dnf_at,
                  dnf_reason,
                  dnf_note,
                  would_retry,
                  created_at,
                  books (
                    title,
                    author,
                    cover_url,
                    book_type
                  )
                `
              )
              .in("user_id", learnerIds)
              .order("created_at", { ascending: false })
              .limit(500)
              .returns<UserBookRow[]>(),
          ]);

        if (learnerError) throw learnerError;
        if (bookError) throw bookError;
        if (cancelled) return;

        const learnerById = new Map(
          ((learnerRows ?? []) as ProfileRow[]).map((learner) => [learner.id, learner])
        );
        if (profile) learnerById.set(user.id, profile);

        const nextItems = ((bookRows ?? []) as UserBookRow[]).map((row) =>
          toItem(row, learnerById)
        );

        setItems(nextItems);
      } catch (error: any) {
        console.error("Error loading Teacher Ratings:", error);
        setMessage(error?.message ?? "Could not load Teacher Ratings.");
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTeacherRatings();

    return () => {
      cancelled = true;
    };
  }, []);

  const levelOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.recommendedLevel).filter(Boolean) as string[])
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items
      .filter((item) => {
        if (statusFilter === "rated" && !item.hasTeacherReview) return false;
        if (
          statusFilter === "needs-rating" &&
          (item.hasTeacherReview || (!item.finishedAt && !item.dnfAt))
        ) {
          return false;
        }
        if (statusFilter === "strong-fit" && ratingValue(item.studentUseRating) < 4) {
          return false;
        }
        if (levelFilter !== "all" && item.recommendedLevel !== levelFilter) return false;

        if (!query) return true;

        return [
          item.title,
          item.author ?? "",
          item.learnerName,
          item.notes ?? "",
          item.recommendedLevel ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => compareItems(a, b, sortMode));
  }, [items, levelFilter, search, sortMode, statusFilter]);

  const ratedCount = items.filter((item) => item.hasTeacherReview).length;
  const needsRatingCount = items.filter(
    (item) => !item.hasTeacherReview && (item.finishedAt || item.dnfAt)
  ).length;
  const wouldTeachAgainCount = items.filter(
    (item) => ratingValue(item.studentUseRating) >= 4
  ).length;

  if (loading) {
    return (
      <TeacherRatingsState
        eyebrow="Teacher Ratings"
        title="Loading ratings"
        message="Finding teacher-facing book ratings and notes..."
      />
    );
  }

  if (message) {
    return (
      <TeacherRatingsState
        eyebrow="Teacher Ratings"
        title="Teacher Ratings"
        message={message}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <TeacherRatingsHeader />

        <TeacherRatingsSummaryCards
          totalCount={items.length}
          ratedCount={ratedCount}
          needsRatingCount={needsRatingCount}
          wouldTeachAgainCount={wouldTeachAgainCount}
        />

        <TeacherRatingsFilterPanel
          search={search}
          statusFilter={statusFilter}
          levelFilter={levelFilter}
          sortMode={sortMode}
          levelOptions={levelOptions}
          onSearchChange={setSearch}
          onStatusFilterChange={(value) => setStatusFilter(value as StatusFilter)}
          onLevelFilterChange={setLevelFilter}
          onSortModeChange={(value) => setSortMode(value as SortMode)}
        />

        {filteredItems.length === 0 ? (
          <section className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black text-stone-900">No matching books</h2>
            <p className="mt-2 text-sm text-stone-500">
              Try changing the filters, or open an individual Teacher Review from a Book Hub.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            {filteredItems.map((item) => (
              <TeacherRatingBookCard key={item.id} item={item} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
