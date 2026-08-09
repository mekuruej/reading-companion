// Review & Notes Page
//
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { isEnglishNativeTrackerBook as getIsEnglishNativeTrackerBook } from "@/lib/books/englishNativeTracker";
import { supabase } from "@/lib/supabaseClient";
import {
  emptyFavoriteQuoteInput,
  favoriteQuoteInputsToText,
  favoriteQuoteTextToInputs,
  normalizeSavedQuote,
  type FavoriteQuoteInput,
} from "../components/tabs/quoteLocationHelpers";

type ProfileRole = "teacher" | "member" | "student" | "super_teacher" | "admin";

type BookRow = {
  title: string | null;
  title_reading: string | null;
  author: string | null;
  cover_url: string | null;
  language_code: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  notes: string | null;
  my_review: string | null;
  favorite_quotes: string | null;
  memorable_words: string | null;
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
  const [favoriteQuoteInputs, setFavoriteQuoteInputs] = useState<FavoriteQuoteInput[]>([
    emptyFavoriteQuoteInput(),
  ]);
  const [memorableWords, setMemorableWords] = useState("");
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
        setAccessMessage("Please sign in to use Review & Notes.");
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

      if (!featureAccess.hasFullAccess) {
        setAccessMessage(
          "Review & Notes is part of Reading Access. Your Reading Reflection is still available after you finish a book."
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          notes,
          my_review,
          favorite_quotes,
          memorable_words,
          rating_overall,
          books (
            title,
            title_reading,
            author,
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

      setRow(loadedRow);
      setNotes(loadedRow.notes ?? "");
      setMyReview(loadedRow.my_review ?? "");
      setFavoriteQuoteInputs(favoriteQuoteTextToInputs(loadedRow.favorite_quotes));
      setMemorableWords(loadedRow.memorable_words ?? "");
      setRatingOverall(loadedRow.rating_overall == null ? "" : String(loadedRow.rating_overall));
      setIsEnglishNativeTrackerBook(
        getIsEnglishNativeTrackerBook({
          bookLanguageCode: loadedRow.books?.language_code ?? null,
          ownerNativeLanguage: ownerProfile?.native_language ?? null,
        })
      );
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

    const nextFavoriteQuotes = favoriteQuoteInputsToText(favoriteQuoteInputs);

    const { error } = await supabase
      .from("user_books")
      .update({
        notes: notes.trim() || null,
        my_review: myReview.trim() || null,
        favorite_quotes: nextFavoriteQuotes || null,
        memorable_words: memorableWords.trim() || null,
        ...(isEnglishNativeTrackerBook ? { rating_overall: ratingOverall ? Number(ratingOverall) : null } : {}),
      })
      .eq("id", row.id);

    setSaving(false);

    if (error) {
      console.error("Error saving Review & Notes:", error);
      setSaveMessage("Could not save Review & Notes.");
      return;
    }

    setRow((prev) =>
      prev
        ? {
            ...prev,
            notes: notes.trim() || null,
            my_review: myReview.trim() || null,
            favorite_quotes: nextFavoriteQuotes || null,
            memorable_words: memorableWords.trim() || null,
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
          <p className="text-sm font-semibold text-stone-600">Loading Review & Notes...</p>
        </div>
      </main>
    );
  }

  if (!row) {
    return (
      <AccessDeniedMessage
        message={accessMessage || "You do not have access to Review & Notes."}
        backHref={userBookId ? `/books/${userBookId}` : "/books"}
        backLabel="Back to Book Hub"
      />
    );
  }

  const book = row.books;
  const updateFavoriteQuote = (
    index: number,
    field: keyof FavoriteQuoteInput,
    value: string
  ) => {
    setFavoriteQuoteInputs((prev) =>
      prev.map((quote, quoteIndex) =>
        quoteIndex === index ? { ...quote, [field]: value } : quote
      )
    );
  };
  const addFavoriteQuote = () => {
    setFavoriteQuoteInputs((prev) => [...prev, emptyFavoriteQuoteInput()]);
  };
  const removeFavoriteQuote = (index: number) => {
    setFavoriteQuoteInputs((prev) => {
      const next = prev.filter((_, quoteIndex) => quoteIndex !== index);
      return next.length > 0 ? next : [emptyFavoriteQuoteInput()];
    });
  };
  const savedFavoriteQuotes = favoriteQuoteTextToInputs(row.favorite_quotes)
    .map(normalizeSavedQuote)
    .filter(Boolean);

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
                Review & Notes
              </p>
              <h1 className="mt-2 text-3xl font-black text-stone-950">
                {book?.title ?? "Untitled book"}
              </h1>
              {book?.author ? (
                <p className="mt-2 text-sm font-semibold text-stone-600">{book.author}</p>
              ) : null}
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
                Keep a private review, memorable quotes, and the thoughts you want to remember.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          {isEnglishNativeTrackerBook ? (
            <div>
              <p className="text-sm font-semibold text-stone-900">Overall Enjoyment</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRatingOverall(String(value))}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-black transition",
                      ratingOverall === String(value)
                        ? "border-amber-400 bg-amber-100 text-amber-950"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100",
                    ].join(" ")}
                  >
                    {value}
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

          <label className="block">
            <span className="text-sm font-semibold text-stone-900">My Review</span>
            <textarea
              value={myReview}
              onChange={(event) => setMyReview(event.target.value)}
              className="mt-2 min-h-[150px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-stone-300"
              placeholder="Write your private review here..."
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Private Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-stone-300"
              placeholder="Add thoughts you want to remember..."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="block">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-stone-900">Memorable Quotes</span>
                <button
                  type="button"
                  onClick={addFavoriteQuote}
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-800 transition hover:bg-violet-100"
                >
                  Add quote
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {favoriteQuoteInputs.map((quote, index) => {
                  const normalizedQuote = normalizeSavedQuote(quote);
                  const quoteIsSaved =
                    normalizedQuote.length > 0 && savedFavoriteQuotes.includes(normalizedQuote);

                  return (
                  <div
                    key={index}
                    className={[
                      "rounded-2xl border p-3 transition",
                      quoteIsSaved
                        ? "border-emerald-200 bg-emerald-50 shadow-sm shadow-emerald-100"
                        : "border-stone-200 bg-stone-50",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                          Quote {index + 1}
                        </span>
                        {quoteIsSaved ? (
                          <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                            Saved
                          </span>
                        ) : null}
                      </div>
                      {favoriteQuoteInputs.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeFavoriteQuote(index)}
                          className="text-xs font-semibold text-stone-500 hover:text-rose-700"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <textarea
                      value={quote.text}
                      onChange={(event) => updateFavoriteQuote(index, "text", event.target.value)}
                      className={[
                        "min-h-[92px] w-full rounded-xl border bg-white p-3 text-sm leading-6 outline-none focus:ring-2",
                        quoteIsSaved
                          ? "border-emerald-200 focus:ring-emerald-200"
                          : "border-stone-200 focus:ring-stone-300",
                      ].join(" ")}
                      placeholder="Add one quote you want to remember."
                    />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
                          Page
                        </span>
                        <input
                          value={quote.page}
                          onChange={(event) =>
                            updateFavoriteQuote(index, "page", event.target.value)
                          }
                          inputMode="numeric"
                          className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                          placeholder="123"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-black uppercase tracking-[0.12em] text-stone-500">
                          Percent
                        </span>
                        <div className="mt-1 flex rounded-xl border border-stone-200 bg-white focus-within:ring-2 focus-within:ring-stone-300">
                          <input
                            value={quote.percent}
                            onChange={(event) =>
                              updateFavoriteQuote(index, "percent", event.target.value)
                            }
                            inputMode="decimal"
                            className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
                            placeholder="45"
                          />
                          <span className="flex items-center px-3 text-sm font-semibold text-stone-500">
                            %
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-stone-900">Memorable Words</span>
              <textarea
                value={memorableWords}
                onChange={(event) => setMemorableWords(event.target.value)}
                className="mt-2 min-h-[140px] w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-stone-300"
                placeholder="List words or phrases you want to remember."
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saveReviewNotes()}
              disabled={saving}
              className="rounded-2xl bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Review & Notes"}
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
