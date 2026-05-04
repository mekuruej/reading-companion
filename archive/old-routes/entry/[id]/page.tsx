"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type BookRow = { id: string; title: string };

type CardType = "word" | "katakana" | "grammar" | "kanji" | "culture";
type ReadingKind = "on" | "kun" | null;
type Stage =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "grey"
  | "purple"
  | "teal"
  | "black"
  | "pink";

type CardRow = {
  id: string;
  word: string;
  reading: string | null;
  meaning: string | null;
  card_type: CardType;
  reading_kind: ReadingKind;
  tags: string[];
};

type ProgressRow = {
  user_id: string;
  card_id: string;
  stage: Stage;
  stage_hits: number;
  lookup_count: number;
  first_lookup_at: string | null;
  last_lookup_at: string | null;
};

function repsForLevel(level: string | null | undefined) {
  if (level === "beginner") return 3;
  if (level === "intermediate") return 2;
  return 1;
}

function kanjiKindLabel(kind: ReadingKind) {
  if (kind === "on") return "Onyomi";
  if (kind === "kun") return "Kunyomi";
  return null;
}

function typeLabel(card: CardRow) {
  if (card.card_type === "kanji") return kanjiKindLabel(card.reading_kind) ?? "Kanji";
  if (card.card_type === "katakana") return "Katakana";
  if (card.card_type === "culture") return "Culture";
  if (card.card_type === "grammar") return "Grammar";
  return "Word";
}

function stageColorClass(stage: Stage, cardType: CardType) {
  if (stage === "black") return "bg-black text-white";
  if (stage === "pink") return "bg-pink-500 text-white";
  if (stage === "teal") return "bg-teal-500 text-white";

  if (stage === "purple") {
    if (cardType === "katakana") return "bg-purple-600 text-white";
    if (cardType === "kanji") return "bg-purple-200 text-purple-900";
    return "bg-purple-500 text-white";
  }

  if (stage === "red") return "bg-red-600 text-white";
  if (stage === "orange") return "bg-orange-500 text-white";
  if (stage === "yellow") return "bg-yellow-300 text-slate-900";
  if (stage === "green") return "bg-green-600 text-white";
  if (stage === "blue") return "bg-blue-600 text-white";
  if (stage === "grey") return "bg-slate-500 text-white";
  return "bg-slate-200 text-slate-900";
}

export default function EntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const cardId = params.id;

  const [card, setCard] = useState<CardRow | null>(null);
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  // ✅ Add-to-book state (MUST be inside component)
  const [books, setBooks] = useState<BookRow[]>([]);
  const [bookLinks, setBookLinks] = useState<
    Array<{
      id: string;
      book_id: string;
      chapter: string | null;
      location: string | null;
      context: string | null;
      collocation: string | null;
      note: string | null;
      created_at: string;
      books?: { title: string } | null;
    }>
  >([]);

  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [chapter, setChapter] = useState("");
  const [location, setLocation] = useState("");
  const [context, setContext] = useState("");
  const [collocation, setCollocation] = useState("");
  const [note, setNote] = useState("");
  const [skipAddToBook, setSkipAddToBook] = useState(false);
  const [savingLink, setSavingLink] = useState(false);

  const reps = useMemo(() => repsForLevel(level), [level]);

  async function loadMyBooksAndLinks(userId: string) {
    // 1) My books (via user_books)
    const { data: ub, error: ubErr } = await supabase
      .from("user_books")
      .select("book_id")
      .eq("user_id", userId);

    if (ubErr) throw ubErr;

    const bookIds = (ub ?? []).map((r: any) => r.book_id).filter(Boolean);

    if (bookIds.length === 0) {
      setBooks([]);
    } else {
      const { data: b, error: bErr } = await supabase
        .from("books")
        .select("id,title")
        .in("id", bookIds)
        .order("title", { ascending: true });

      if (bErr) throw bErr;
      setBooks((b ?? []) as BookRow[]);
    }

    // 2) Links for THIS card (Appears in...)
    const { data: links, error: linkErr } = await supabase
      .from("user_book_cards")
      .select("id,book_id,chapter,location,context,collocation,note,created_at,books(title)")
      .eq("user_id", userId)
      .eq("card_id", cardId)
      .order("created_at", { ascending: false });

    if (linkErr) throw linkErr;
    setBookLinks((links ?? []) as any[]);
  }

  async function addCardToBook(userId: string) {
    if (!selectedBookId) return;

    setSavingLink(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from("user_book_cards").insert({
        user_id: userId,
        book_id: selectedBookId,
        card_id: cardId,
        chapter: chapter.trim() || null,
        location: location.trim() || null,
        context: context.trim() || null,
        collocation: collocation.trim() || null,
        note: note.trim() || null,
      });

      if (error) throw error;

      // reset form
      setChapter("");
      setLocation("");
      setContext("");
      setNote("");

      await loadMyBooksAndLinks(userId);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to add to book");
    } finally {
      setSavingLink(false);
    }
  }

  async function loadEverythingReadOnly() {
    setLoading(true);
    setErrorMsg(null);
    setNeedsSignIn(false);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setNeedsSignIn(true);
        setCard(null);
        setProgress(null);
        setLevel(null);
        setBooks([]);
        setBookLinks([]);
        return;
      }

      // 1) Fetch card
      const { data: cardData, error: cardErr } = await supabase
        .from("cards")
        .select("id,word,reading,meaning,card_type,reading_kind,tags")
        .eq("id", cardId)
        .single();
      if (cardErr) throw cardErr;
      setCard(cardData as CardRow);

      // 2) Fetch user level
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("level")
        .eq("id", user.id)
        .maybeSingle();
      if (profileErr) throw profileErr;
      setLevel(profileData?.level ?? "beginner");

      // 3) Progress (✅ includes first/last lookup)
      const { data: progRow, error: progErr } = await supabase
        .from("user_card_progress")
        .select("user_id,card_id,stage,stage_hits,lookup_count,first_lookup_at,last_lookup_at")
        .eq("user_id", user.id)
        .eq("card_id", cardId)
        .maybeSingle();
      if (progErr) throw progErr;
      setProgress((progRow as any) ?? null);

      // 4) Books + links for this card
      await loadMyBooksAndLinks(user.id);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load entry");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReading() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.rpc("confirm_reading", { p_card_id: cardId });
      if (error) throw error;
      setProgress((data as ProgressRow) ?? null);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmMeaning() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.rpc("confirm_meaning", { p_card_id: cardId });
      if (error) throw error;
      setProgress((data as ProgressRow) ?? null);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!cardId) return;
    loadEverythingReadOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  if (loading) return <div className="p-4 text-sm text-slate-600">Loading…</div>;

  if (needsSignIn) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <button
          onClick={() => router.push("/dictionary")}
          className="text-sm text-slate-600 hover:underline"
        >
          ← Back to Dictionary
        </button>
        <div className="mt-4 rounded-2xl border p-4 text-sm text-slate-700">
          You’re not signed in, so I can’t show your progress yet.
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <button
          onClick={() => router.push("/dictionary")}
          className="text-sm text-slate-600 hover:underline"
        >
          ← Back to Dictionary
        </button>
        <div className="mt-4 text-sm text-slate-700">Entry not found.</div>
      </div>
    );
  }

  const stage: Stage = (progress?.stage ?? "red") as Stage;
  const stageHits = progress?.stage_hits ?? 0;
  const lookupCount = progress?.lookup_count ?? 0;

  const showHits = stage !== "purple" && stage !== "grey";
  const showGreenGate = stage === "green" && card.card_type === "word";
  const showBlueGate = stage === "blue" && card.card_type === "word";

  return (
    <div className="mx-auto max-w-2xl p-4">
      <button
        onClick={() => router.push("/dictionary")}
        className="text-sm text-slate-600 hover:underline"
      >
        ← Back to Dictionary
      </button>

      <div className="mt-3 rounded-2xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {card.word}{" "}
              {card.reading ? (
                <span className="text-base font-normal text-slate-600">
                  （{card.reading}
                  {card.card_type === "kanji" && kanjiKindLabel(card.reading_kind)
                    ? ` / ${kanjiKindLabel(card.reading_kind)}`
                    : ""}
                  ）
                </span>
              ) : null}
            </h1>

            {card.meaning ? (
              <p className="mt-2 text-slate-800">{card.meaning}</p>
            ) : (
              <p className="mt-2 text-slate-500">(No description yet)</p>
            )}

            {card.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {card.tags.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="text-right flex flex-col items-end gap-2">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
                stageColorClass(stage, card.card_type),
              ].join(" ")}
            >
              {stage}
              {showHits ? (
                <span className="text-xs font-normal opacity-90">
                  {stageHits}/{reps}
                </span>
              ) : null}
            </span>

            <span className="rounded-full border px-2 py-1 text-xs text-slate-700">
              {typeLabel(card)}
            </span>

            <div className="text-xs text-slate-600">
              Lookups: <span className="font-semibold">{lookupCount}</span>
            </div>

            {progress?.last_lookup_at ? (
              <div className="mt-1 text-xs text-slate-500">
                Last lookup:{" "}
                {new Intl.DateTimeFormat("ja-JP", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Tokyo",
                }).format(new Date(progress.last_lookup_at))}
              </div>
            ) : null}

            <div className="text-xs text-slate-600">
              Level: <span className="font-semibold">{level ?? "beginner"}</span>
            </div>
          </div>
        </div>

        {(showGreenGate || showBlueGate) && (
          <div className="mt-4 flex gap-2">
            {showGreenGate && (
              <button
                disabled={busy}
                onClick={handleConfirmReading}
                className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                読めた
              </button>
            )}
            {showBlueGate && (
              <button
                disabled={busy}
                onClick={handleConfirmMeaning}
                className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                意味わかった
              </button>
            )}
          </div>
        )}

        {stage === "purple" && card.card_type !== "word" && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            This card stops at <b>Purple</b> for now (until typed 読み方 flashcards).
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
      </div>

      {/* ✅ Add to Book */}
      <div className="mt-6 rounded-2xl border p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-800">Add to Book</div>
          <div className="text-xs text-slate-500">Attach this entry to where you met it.</div>
        </div>

        {books.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">
            No books found yet. Add a book first, then you can attach vocab to it.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              <option value="">Select a book…</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="Chapter (optional)"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Page / Location (optional)"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              {/* ✅ Collocation spans both columns */}
              <input
                value={collocation}
                onChange={(e) => setCollocation(e.target.value)}
                placeholder="Collocation (optional) e.g. 終電に間に合う"
                className="w-full rounded-xl border px-3 py-2 sm:col-span-2"
              />

            </div>

            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Context sentence (optional)"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              rows={2}
            />

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Your note / nuance (optional)"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              rows={2}
            />

            <button
              disabled={!selectedBookId || savingLink}
              onClick={async () => {
                const { data } = await supabase.auth.getUser();
                const u = data?.user;
                if (!u) return;
                await addCardToBook(u.id);
              }}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {savingLink ? "Saving…" : "Add to this book"}
            </button>
          </div>
        )}

        {bookLinks.length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-semibold text-slate-700">Appears in</div>
            <ul className="mt-2 space-y-2">
              {bookLinks.map((l) => (
                <li key={l.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="font-semibold">{l.books?.title ?? l.book_id}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {[l.chapter && `Ch: ${l.chapter}`, l.location && `Loc: ${l.location}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {l.context ? <div className="mt-2 text-slate-700">{l.context}</div> : null}
                  {l.note ? <div className="mt-2 text-slate-600 italic">{l.note}</div> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
