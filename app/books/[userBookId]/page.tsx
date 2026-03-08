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

function clampRating(n: number | null) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.max(1, Math.min(10, n));
}

function stars10(value: number | null) {
  if (!value) return "☆☆☆☆☆☆☆☆☆☆";
  const v = Math.max(1, Math.min(10, value));
  return "★".repeat(v) + "☆".repeat(10 - v);
}

const LEVEL_OPTIONS = ["N5", "N4", "N3", "N2", "N1"] as const;
type ProfileRole = "teacher" | "student";

export default function BookInfoPage() {
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

  const started = useMemo(() => safeDate(row?.started_at ?? null), [row?.started_at]);
  const finished = useMemo(() => safeDate(row?.finished_at ?? null), [row?.finished_at]);

  const timeToRead = useMemo(() => {
    if (!started || !finished) return null;
    const days = diffDays(started, finished);
    if (days == null) return null;
    return days === 1 ? "1 day" : `${days} days`;
  }, [started, finished]);

  const book = row?.books ?? null;

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

    const ro = ratingOverall.trim() ? clampRating(Number(ratingOverall.trim())) : null;
    const rr = ratingRecommend.trim() ? clampRating(Number(ratingRecommend.trim())) : null;
    const rd = ratingDifficulty.trim() ? clampRating(Number(ratingDifficulty.trim())) : null;

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

    console.log("user_books save error:", uRes.error);
console.log("books save error:", bRes.error);

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
          className="mt-4 px-6 py-3 rounded bg-gray-800 text-white hover:bg-gray-900 transition"
        >
          Back to Books
        </button>
      </main>
    );
  }

  const relatedLinksArr = Array.isArray(book.related_links) ? book.related_links : [];

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{book.title}</h1>

          <div className="mt-2 text-sm text-gray-700 space-y-1">
            {book.author && (
              <div>
                <span className="font-medium">Author:</span> {book.author}
                {book.author_reading ? <span className="text-gray-500">（{book.author_reading}）</span> : null}
              </div>
            )}
            {book.translator && (
              <div>
                <span className="font-medium">Translator:</span> {book.translator}
                {book.translator_reading ? <span className="text-gray-500">（{book.translator_reading}）</span> : null}
              </div>
            )}
            {book.illustrator && (
              <div>
                <span className="font-medium">Illustrator:</span> {book.illustrator}
                {book.illustrator_reading ? <span className="text-gray-500">（{book.illustrator_reading}）</span> : null}
              </div>
            )}
            {book.publisher && (
              <div>
                <span className="font-medium">Publisher:</span> {book.publisher}
                {book.publisher_reading ? <span className="text-gray-500">（{book.publisher_reading}）</span> : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/books")}
              className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-800 transition"
            >
              Back
            </button>

            {isTeacher ? (
  !editing ? (
    <button
      onClick={() => setEditing(true)}
      className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-black transition"
    >
      Edit
    </button>
  ) : (
    <>
      <button
        onClick={cancelEdits}
        className="px-4 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300 transition"
      >
        Cancel
      </button>
      <button
        onClick={saveAll}
        disabled={saving}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </>
  )
) : null}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/books/${row.id}/words`)}
              className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-800 transition"
            >
              View Vocab List
            </button>
            <button
              onClick={() => router.push(`/books/${row.id}/study`)}
              className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-800 transition"
            >
              Study
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Cover</div>
              {editing && (
                <input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="Cover URL"
                  className="ml-2 w-[60%] text-xs rounded border px-2 py-1"
                />
              )}
            </div>

            {(editing ? coverUrl : book.cover_url) ? (
              <img
                src={editing ? coverUrl : (book.cover_url ?? "")}
                alt={`${book.title} cover`}
                className="mt-3 w-full rounded-md border object-cover"
              />
            ) : (
              <div className="mt-3 text-sm text-gray-500">No cover image yet.</div>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium mb-3">People</div>

            <div className="space-y-4">
              <PersonRow
                label="Author"
                name={editing ? authorName : book.author}
                reading={book.author_reading}
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
                  reading={book.translator_reading}
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
                  reading={book.illustrator_reading}
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
                  reading={book.publisher_reading}
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

          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium">My Review</div>
            {!editing ? (
              <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[140px]">
                {row.my_review?.trim() ? row.my_review : "—"}
              </div>
            ) : (
              <textarea
                value={myReview}
                onChange={(e) => setMyReview(e.target.value)}
                placeholder="Write your review here…"
                className="mt-3 w-full min-h-[160px] rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium mb-3">Reading</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded border bg-gray-50">
                <div className="text-gray-600">Started</div>
                {!editing ? (
                  <div className="font-medium">{started ? formatYmd(started) : "—"}</div>
                ) : (
                  <input
                    type="date"
                    value={startedAt}
                    onChange={(e) => setStartedAt(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1"
                  />
                )}
              </div>

              <div className="p-3 rounded border bg-gray-50">
                <div className="text-gray-600">Finished</div>
                {!editing ? (
                  <div className="font-medium">{finished ? formatYmd(finished) : "—"}</div>
                ) : (
                  <input
                    type="date"
                    value={finishedAt}
                    onChange={(e) => setFinishedAt(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1"
                  />
                )}
              </div>
            </div>

            {!editing && (
              <div className="mt-3 text-sm flex flex-wrap items-center gap-x-6 gap-y-1">
                {timeToRead && (
                  <div className="whitespace-nowrap">
                    <span className="text-gray-600">Time to read:</span>{" "}
                    <span className="font-medium">{timeToRead}</span>
                  </div>
                )}

                <div className="whitespace-nowrap">
                  <span className="text-gray-600">Words looked up (unique):</span>{" "}
                  <span className="font-medium">
                    {uniqueLookupCount == null ? "—" : uniqueLookupCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium mb-3">Ratings</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RatingField
                label="Overall"
                value={row.rating_overall}
                editing={editing}
                inputValue={ratingOverall}
                setInputValue={setRatingOverall}
                helper="1 = worst, 10 = best"
              />

              <RatingField
                label="Would Recommend"
                value={row.rating_recommend}
                editing={editing}
                inputValue={ratingRecommend}
                setInputValue={setRatingRecommend}
                helper="1 = definitely recommend, 10 = absolutely not"
              />

              <RatingField
                label="Difficulty (for me)"
                value={row.rating_difficulty}
                editing={editing}
                inputValue={ratingDifficulty}
                setInputValue={setRatingDifficulty}
                helper="1 = hardest, 10 = easiest"
              />

              <div className="p-3 rounded border bg-gray-50 text-sm">
                <div className="text-gray-600">My Level at Time of Reading</div>
                {!editing ? (
                  <div className="font-medium mt-1">{row.reader_level || "—"}</div>
                ) : (
                  <select
                    value={readerLevel}
                    onChange={(e) => setReaderLevel(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-sm bg-white"
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

              <div className="p-3 rounded border bg-gray-50 text-sm sm:col-span-2">
                <div className="text-gray-600">What level would I recommend it to?</div>
                {!editing ? (
                  <div className="font-medium mt-1">{row.recommended_level || "—"}</div>
                ) : (
                  <select
                    value={recommendedLevel}
                    onChange={(e) => setRecommendedLevel(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-sm bg-white"
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
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium mb-3">Details</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap min-h-[40px]">
                  {book.trigger_warnings?.trim() ? book.trigger_warnings : "—"}
                </div>
              ) : (
                <textarea
                  value={triggerWarnings}
                  onChange={(e) => setTriggerWarnings(e.target.value)}
                  placeholder="Anything you want to flag (one per line or free text)"
                  className="mt-2 w-full min-h-[90px] rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
                />
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium mb-3">Related Links</div>

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
                            className="text-blue-600 hover:underline shrink-0"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">—</div>
              )
            ) : (
              <div>
                <div className="text-xs text-gray-500 mb-2">
                  One per line. Optional format: <span className="font-mono">Label | URL</span>
                </div>
                <textarea
                  value={linksText}
                  onChange={(e) => setLinksText(e.target.value)}
                  placeholder={`Amazon | https://...\nPublisher | https://...\nhttps://...`}
                  className="w-full min-h-[120px] rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium">Notes</div>

            {!editing ? (
              <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[260px]">
                {row.notes?.trim() ? row.notes : "—"}
              </div>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Big notes area… reactions, vocab notes, lesson plan, etc."
                className="mt-3 w-full min-h-[260px] rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            )}

            <div className="mt-2 text-xs text-gray-500">
              Notes/review/ratings/levels save to <code className="px-1">user_books</code> •
              Metadata saves to <code className="px-1">books</code>
            </div>
          </div>
        </div>
      </div>
    </main>
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
    <div className="p-3 rounded border bg-gray-50">
      <div className="text-gray-600">{label}</div>
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

function RatingField({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
  helper,
}: {
  label: string;
  value: number | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
  helper: string;
}) {
  const numeric = value ?? null;

  return (
    <div className="p-3 rounded border bg-gray-50 text-sm">
      <div className="text-gray-600">{label}</div>

      {!editing ? (
        <>
          <div className="mt-1 font-medium">{numeric ? `${numeric}/10` : "—"}</div>
          <div className="text-amber-600 tracking-tight">{stars10(numeric)}</div>
          <div className="text-xs text-gray-500 mt-1">{helper}</div>
        </>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={inputValue || 5}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full"
            />
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="1-10"
              className="w-16 rounded border px-2 py-1 text-sm"
            />
          </div>
          <div className="text-amber-600 tracking-tight mt-1">
            {stars10(inputValue ? Number(inputValue) : null)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{helper}</div>
        </>
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
      <div className="w-20 h-20 rounded-full border overflow-hidden bg-gray-100 shrink-0 mt-0.5">
        {img ? (
          <img src={img} alt={`${label} photo`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
            —
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-600">{label}</div>

        {!editing ? (
          <>
            <div className="text-sm font-medium truncate">{name || "—"}</div>
            <div className="text-xs text-gray-500 mt-0.5">{reading || "—"}</div>
          </>
        ) : (
          <>
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder={`${label} name`}
              className="mt-1 w-full rounded border px-2 py-1 text-xs"
            />
            <input
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              placeholder={`${label} reading (よみ)`}
              className="mt-1 w-full rounded border px-2 py-1 text-xs"
            />
            <input
              value={imgValue}
              onChange={(e) => setImgValue(e.target.value)}
              placeholder={`${label} image URL / logo URL`}
              className="mt-1 w-full rounded border px-2 py-1 text-xs"
            />
          </>
        )}
      </div>
    </div>
  );
}