"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isValidAsin, normalizeAsin } from "@/lib/books/asin";
import EnglishReaderAddBookForm from "./components/EnglishReaderAddBookForm";
import EnglishReaderAddBookHeader from "./components/EnglishReaderAddBookHeader";
import EnglishReaderAddBookStatus from "./components/EnglishReaderAddBookStatus";

type SaveResult = {
  bookId: string;
  userBookId: string;
  teacherBookId: string | null;
};

function isTeacherRole(profile: any) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "super_teacher" ||
    profile?.is_super_teacher === true ||
    profile?.is_super_teacher === "true"
  );
}

function cleanText(value: string) {
  return value.trim() || null;
}

function cleanIsbn13(value: string) {
  return value.replace(/[^0-9Xx]/g, "").trim();
}

function relatedLinksForUrl(value: string) {
  const url = value.trim();
  if (!url) return null;
  return [{ label: "External source", url }];
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export default function EnglishReaderAddBookPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [asinLookupLoading, setAsinLookupLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn13, setIsbn13] = useState("");
  const [asin, setAsin] = useState("");
  const [editionFormat, setEditionFormat] = useState("");
  const [editionNote, setEditionNote] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [recommendedLevel, setRecommendedLevel] = useState("");

  useEffect(() => {
    void loadAccess();
  }, []);

  async function loadAccess() {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (authError || !user) {
        router.replace("/login");
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
        setTeacherId(user.id);
        setMessageTone("error");
        setMessage("Teacher access is required.");
        return;
      }

      setCanAccess(true);
      setTeacherId(user.id);
    } catch (error: any) {
      console.error("Error loading English Readers add-book access:", error);
      setMessageTone("error");
      setMessage(error?.message ?? "Could not load this page.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAsinLookup() {
    const normalizedAsin = normalizeAsin(asin);
    setMessage("");
    setSaveResult(null);

    if (!normalizedAsin || !isValidAsin(normalizedAsin)) {
      setMessageTone("error");
      setMessage("Amazon ASIN must be exactly 10 letters or numbers.");
      return;
    }

    setAsin(normalizedAsin);
    setAsinLookupLoading(true);

    try {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, isbn13, asin, edition_format, edition_note, language_code")
        .ilike("asin", normalizedAsin)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setMessageTone("info");
        setMessage("No existing English book uses that ASIN yet. You can enter the title and create it.");
        return;
      }

      if (data.language_code && data.language_code !== "en") {
        setMessageTone("error");
        setMessage("That ASIN belongs to a non-English book record. Please review it in the main teacher book tools.");
        return;
      }

      setTitle(data.title ?? "");
      setAuthor(data.author ?? "");
      setIsbn13(data.isbn13 ?? "");
      setAsin(data.asin ?? normalizedAsin);
      setEditionFormat(data.edition_format ?? "");
      setEditionNote(data.edition_note ?? "");
      setMessageTone("success");
      setMessage("Found an existing English book for that ASIN. Review the fields, then add it to your Teacher Library.");
    } catch (error: any) {
      console.error("Error checking English Reader ASIN:", error);
      setMessageTone("error");
      setMessage(error?.message ?? "Could not check that ASIN.");
    } finally {
      setAsinLookupLoading(false);
    }
  }

  async function handleSave() {
    if (!teacherId) return;

    const cleanTitle = title.trim();
    const normalizedIsbn13 = cleanIsbn13(isbn13);
    const normalizedAsin = normalizeAsin(asin);
    const trimmedEditionNote = editionNote.trim();
    const trimmedExternalUrl = externalUrl.trim();
    const trimmedRecommendedLevel = recommendedLevel.trim();

    setMessage("");
    setSaveResult(null);

    if (!cleanTitle) {
      setMessageTone("error");
      setMessage("Please enter a title.");
      return;
    }

    if (normalizedIsbn13 && !/^\d{13}$/.test(normalizedIsbn13)) {
      setMessageTone("error");
      setMessage("Please enter a valid ISBN-13, or leave ISBN blank.");
      return;
    }

    if (normalizedAsin && !isValidAsin(normalizedAsin)) {
      setMessageTone("error");
      setMessage("Amazon ASIN must be exactly 10 letters or numbers.");
      return;
    }

    if (
      trimmedExternalUrl &&
      !/^https?:\/\/\S+\.\S+/i.test(trimmedExternalUrl)
    ) {
      setMessageTone("error");
      setMessage("Please enter a full external URL starting with http:// or https://.");
      return;
    }

    setSaving(true);

    try {
      const existingIsbnLookup = normalizedIsbn13
        ? await supabase
            .from("books")
            .select("id, title")
            .eq("isbn13", normalizedIsbn13)
            .maybeSingle()
        : { data: null, error: null };
      const existingAsinLookup = normalizedAsin
        ? await supabase
            .from("books")
            .select("id, title")
            .ilike("asin", normalizedAsin)
            .maybeSingle()
        : { data: null, error: null };

      if (existingIsbnLookup.error) throw existingIsbnLookup.error;
      if (existingAsinLookup.error) throw existingAsinLookup.error;

      if (
        existingIsbnLookup.data &&
        existingAsinLookup.data &&
        existingIsbnLookup.data.id !== existingAsinLookup.data.id
      ) {
        setMessageTone("error");
        setMessage("ISBN-13 and ASIN match different existing book records. Please review this in the main teacher book tools.");
        return;
      }

      const existingBook = existingIsbnLookup.data ?? existingAsinLookup.data;
      let bookId = existingBook?.id as string | undefined;

      if (!bookId) {
        const { data: insertedBook, error: bookError } = await supabase
          .from("books")
          .insert({
            title: cleanTitle,
            author: cleanText(author),
            isbn13: normalizedIsbn13 || null,
            asin: normalizedAsin,
            language_code: "en",
            edition_format: editionFormat || null,
            edition_note: trimmedEditionNote || null,
            allow_missing_isbn: !normalizedIsbn13 && !normalizedAsin,
            related_links: relatedLinksForUrl(trimmedExternalUrl),
          })
          .select("id")
          .single();

        if (bookError) throw bookError;
        bookId = insertedBook.id as string;
      }

      const { data: existingUserBook, error: existingUserBookError } = await supabase
        .from("user_books")
        .select("id")
        .eq("user_id", teacherId)
        .eq("book_id", bookId)
        .limit(1)
        .maybeSingle();

      if (existingUserBookError) throw existingUserBookError;

      let userBookId = existingUserBook?.id as string | undefined;

      if (!userBookId) {
        const { data: insertedUserBook, error: userBookError } = await supabase
          .from("user_books")
          .insert({
            user_id: teacherId,
            book_id: bookId,
            started_at: todayYmd(),
            recommended_level: trimmedRecommendedLevel || null,
          })
          .select("id")
          .single();

        if (userBookError) throw userBookError;
        userBookId = insertedUserBook.id as string;
      } else if (trimmedRecommendedLevel) {
        const { error: levelError } = await supabase
          .from("user_books")
          .update({ recommended_level: trimmedRecommendedLevel })
          .eq("id", userBookId);

        if (levelError) throw levelError;
      }

      const { data: teacherBook, error: teacherBookError } = await supabase
        .from("teacher_books")
        .upsert(
          {
            teacher_id: teacherId,
            book_id: bookId,
            user_book_id: userBookId,
          },
          { onConflict: "teacher_id,book_id" }
        )
        .select("id")
        .maybeSingle();

      if (teacherBookError) throw teacherBookError;

      setSaveResult({
        bookId,
        userBookId,
        teacherBookId: teacherBook?.id ?? null,
      });
      setMessageTone("success");
      setMessage(existingBook ? "Existing English book added to your Teacher Library." : "English book created and added to your Teacher Library.");
      setTitle("");
      setAuthor("");
      setIsbn13("");
      setAsin("");
      setEditionFormat("");
      setEditionNote("");
      setExternalUrl("");
      setRecommendedLevel("");
    } catch (error: any) {
      console.error("Error creating English Reader book:", error);
      setMessageTone("error");
      setMessage(error?.message ?? "Could not create this English book.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <EnglishReaderAddBookHeader />

      <div className="mt-6 space-y-5">
        {loading ? (
          <EnglishReaderAddBookStatus message="Loading..." />
        ) : (
          <EnglishReaderAddBookStatus message={message} tone={messageTone} />
        )}

        {!loading && canAccess ? (
          <>
            <EnglishReaderAddBookForm
              title={title}
              author={author}
              isbn13={isbn13}
              asin={asin}
              editionFormat={editionFormat}
              editionNote={editionNote}
              externalUrl={externalUrl}
              recommendedLevel={recommendedLevel}
              saving={saving}
              asinLookupLoading={asinLookupLoading}
              onTitleChange={setTitle}
              onAuthorChange={setAuthor}
              onIsbn13Change={setIsbn13}
              onAsinChange={setAsin}
              onEditionFormatChange={setEditionFormat}
              onEditionNoteChange={setEditionNote}
              onExternalUrlChange={setExternalUrl}
              onRecommendedLevelChange={setRecommendedLevel}
              onAsinLookup={handleAsinLookup}
              onSubmit={handleSave}
            />

            {saveResult ? (
              <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <h2 className="text-lg font-black text-emerald-950">
                  Ready for teacher prep
                </h2>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  The book is linked to your Teacher Library and your Mekuru library row.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/teacher/english-readers"
                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-center text-sm font-black text-emerald-900 transition hover:bg-emerald-100"
                  >
                    Back to English Readers
                  </Link>

                  {saveResult.teacherBookId ? (
                    <Link
                      href={`/teacher/library/${saveResult.teacherBookId}/book-workspace`}
                      className="rounded-2xl bg-emerald-700 px-4 py-2 text-center text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
                    >
                      Open Teacher Workspace
                    </Link>
                  ) : null}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
