// Review & Notes Page
//
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { getBookIdentity } from "@/lib/books/bookIdentity";
import { isNativeLanguageBook } from "@/lib/books/englishNativeTracker";
import { supabase } from "@/lib/supabaseClient";

type ProfileRole = "teacher" | "member" | "student" | "super_teacher" | "admin";
const REVIEW_RATING_VALUES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function formatReviewRating(value: number | string | null | undefined) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return "";

  return Number(value)
    .toFixed(1)
    .replace(/\.0$/, "");
}

type BookRow = {
  title: string | null;
  title_reading: string | null;
  author: string | null;
  author_english_name: string | null;
  author_reading: string | null;
  cover_url: string | null;
  language_code: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  notes: string | null;
  my_review: string | null;
  my_review_en: string | null;
  my_review_ja: string | null;
  rating_overall: number | null;
  books: BookRow | null;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

export default function ReviewNotesPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params?.userBookId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [row, setRow] = useState<UserBookRow | null>(null);
  const [notes, setNotes] = useState("");
  const [myReview, setMyReview] = useState("");
  const [ratingOverall, setRatingOverall] = useState("");
  const [isEnglishNativeTrackerBook, setIsEnglishNativeTrackerBook] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAccessMessage("");
      setSaveMessage("");
      setIsEnglishNativeTrackerBook(false);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user || !userBookId) {
        setAccessMessage("Please sign in to use this review page.");
        setLoading(false);
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("role, is_super_teacher, app_access_type, app_access_expires_at")
        .eq("id", user.id)
        .maybeSingle();

      let profile: any = profileResult.data;
      let profileError = profileResult.error;

      if (isMissingAppAccessColumnError(profileError)) {
        const fallbackResult = await supabase
          .from("profiles")
          .select("role, is_super_teacher")
          .eq("id", user.id)
          .maybeSingle();

        profile = fallbackResult.data;
        profileError = fallbackResult.error;
      }

      if (profileError) {
        console.error("Error loading Review & Notes profile:", profileError);
      }

      const role = (profile?.role as ProfileRole | null) ?? "member";
      const isSuperTeacher =
        role === "super_teacher" ||
        role === "admin" ||
        isSuperTeacherFlag(profile?.is_super_teacher);

      const appAccessStatus = getAppAccessStatus({
        role: isSuperTeacher ? "super_teacher" : role,
        app_access_type: profile?.app_access_type ?? null,
        app_access_expires_at: profile?.app_access_expires_at ?? null,
      });

      const featureAccess = getFeatureAccess({
        role: isSuperTeacher ? "super_teacher" : role,
        isSuperTeacher: profile?.is_super_teacher,
        hasFullAccess: appAccessStatus.hasFullAccess,
        isTrialActive: appAccessStatus.reason === "trial",
      });

      const { data, error } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          notes,
          my_review,
          my_review_en,
          my_review_ja,
          rating_overall,
          books (
            title,
            title_reading,
            author,
            author_english_name,
            author_reading,
            cover_url,
            language_code
          )
        `
        )
        .eq("id", userBookId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error loading Review & Notes book:", error);
        setAccessMessage("This book could not be found.");
        setLoading(false);
        return;
      }

      if (!data) {
        setAccessMessage("You do not have access to this book.");
        setLoading(false);
        return;
      }

      const loadedRow = data as unknown as UserBookRow;
      const canAccessBook = loadedRow.user_id === user.id || isSuperTeacher;

      if (!canAccessBook) {
        setAccessMessage("You do not have access to this private review.");
        setLoading(false);
        return;
      }

      const { data: ownerProfile, error: ownerProfileError } = await supabase
        .from("profiles")
        .select("native_language")
        .eq("id", loadedRow.user_id)
        .maybeSingle();

      if (ownerProfileError) {
        console.error("Error loading Review & Notes owner profile:", ownerProfileError);
      }

      const nativeLanguageBook = isNativeLanguageBook({
        bookLanguageCode: loadedRow.books?.language_code ?? null,
        ownerNativeLanguage: ownerProfile?.native_language ?? null,
      });

      if (!nativeLanguageBook && !featureAccess.hasFullAccess) {
        setAccessMessage(
          "My Review is included with Japanese Learning 🔒. Your Reading Reflection is still available after you finish a book."
        );
        setLoading(false);
        return;
      }

      setRow(loadedRow);
      setNotes(nativeLanguageBook ? loadedRow.notes ?? "" : loadedRow.my_review_ja ?? loadedRow.notes ?? "");
      setMyReview(nativeLanguageBook ? loadedRow.my_review ?? "" : loadedRow.my_review_en ?? loadedRow.my_review ?? "");
      setRatingOverall(loadedRow.rating_overall == null ? "" : String(loadedRow.rating_overall));
      setIsEnglishNativeTrackerBook(nativeLanguageBook);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  async function saveReviewNotes() {
    if (!row?.id) return;

    setSaving(true);
    setSaveMessage("");

    const reviewPatch = isEnglishNativeTrackerBook
      ? {
          notes: notes.trim() || null,
          my_review: myReview.trim() || null,
          rating_overall: ratingOverall ? Number(ratingOverall) : null,
        }
      : {
          my_review_en: myReview.trim() || null,
          my_review_ja: notes.trim() || null,
        };

    const { error } = await supabase
      .from("user_books")
      .update(reviewPatch)
      .eq("id", row.id);

    setSaving(false);

    if (error) {
      console.error("Error saving Review & Notes:", error);
      setSaveMessage("Could not save your review.");
      return;
    }

    setRow((prev) =>
      prev
        ? {
            ...prev,
            ...(isEnglishNativeTrackerBook
              ? {
                  notes: notes.trim() || null,
                  my_review: myReview.trim() || null,
                }
              : {
                  my_review_en: myReview.trim() || null,
                  my_review_ja: notes.trim() || null,
                }),
            rating_overall: isEnglishNativeTrackerBook
              ? ratingOverall
                ? Number(ratingOverall)
                : null
              : prev.rating_overall,
          }
        : prev
    );
    setSaveMessage("Saved.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-600">Loading review...</p>
        </div>
      </main>
    );
  }

  if (!row) {
    return (
      <AccessDeniedMessage
        message={accessMessage || "You do not have access to this review page."}
        backHref={userBookId ? `/books/${userBookId}` : "/books"}
        backLabel="Back to Book Hub"
      />
    );
  }

  const book = row.books;
  const bookIdentity = getBookIdentity(book);
  const reviewDestinationLabel = isEnglishNativeTrackerBook ? "Review & Ratings" : "My Review";
  const reviewDescription = isEnglishNativeTrackerBook
    ? "Keep your rating and private review."
    : "Keep your personal reviews in English and Japanese.";

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link
          href={`/books/${row.id}`}
          className="inline-flex text-sm font-semibold text-stone-500 hover:text-stone-900"
        >
          &larr; Back to Book Hub
        </Link>

        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="grid gap-5 p-5 sm:grid-cols-[96px_minmax(0,1fr)] sm:p-6">
            {book?.cover_url ? (
              <img
                src={book.cover_url}
                alt=""
                className="h-32 w-24 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-32 w-24 items-center justify-center rounded-2xl bg-stone-200 text-xs font-semibold text-stone-500">
                No cover
              </div>
            )}

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
                {reviewDestinationLabel}
              </p>
              <h1 className="mt-2 text-3xl font-black text-stone-950">
                {bookIdentity.title}
              </h1>
              {bookIdentity.author ? (
                <p className="mt-2 text-sm font-semibold text-stone-600">{bookIdentity.author}</p>
              ) : null}
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
                {reviewDescription}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
	          {isEnglishNativeTrackerBook ? (
	            <div>
	              <p className="text-sm font-semibold text-stone-900">Overall Enjoyment</p>
	              <p className="mt-1 text-xs text-stone-500">1 = hated it · 5 = loved it</p>
	              <div className="mt-2 flex flex-wrap gap-2">
                {REVIEW_RATING_VALUES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRatingOverall(String(value))}
                    className={[
                      "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black transition",
                      ratingOverall === String(value)
                        ? "border-amber-400 bg-amber-100 text-amber-950"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100",
                    ].join(" ")}
                  >
                    {formatReviewRating(value)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRatingOverall("")}
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-500 hover:bg-stone-50"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          {isEnglishNativeTrackerBook ? (
            <label className="block">
              <span className="text-sm font-semibold text-stone-900">My Review</span>
              <textarea
                value={myReview}
                onChange={(event) => setMyReview(event.target.value)}
                className="mt-2 min-h-[180px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-stone-300"
                placeholder="Write your private review here..."
              />
            </label>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-stone-900">English Review</span>
                <textarea
                  value={myReview}
                  onChange={(event) => setMyReview(event.target.value)}
                  className="mt-2 min-h-[220px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-stone-300"
                  placeholder="Write your personal review in English..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-stone-900">Japanese Review</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-2 min-h-[220px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-stone-300"
                  placeholder="日本語で感想を書いてください..."
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saveReviewNotes()}
              disabled={saving}
              className="rounded-2xl bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
            >
              {saving ? "Saving..." : `Save ${reviewDestinationLabel}`}
            </button>
            {saveMessage ? (
              <span className="text-sm font-semibold text-stone-600">{saveMessage}</span>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
