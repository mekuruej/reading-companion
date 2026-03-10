// Prepare Readings
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileRole = "teacher" | "student";

type DraftRow = {
  id: string;
  sourceWord: string;
  kanji: string;
  reading: string;
  readingType: "onyomi" | "kunyomi" | "other";
};

const KANJI_REGEX = /[\u3400-\u9FFF]/g;

function extractKanjiChars(text: string): string[] {
  const matches = text.match(KANJI_REGEX) || [];
  return matches.filter(Boolean);
}

function makeRowId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function PrepareWeeklyReadingsPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<ProfileRole>("student");

  const [bookTitle, setBookTitle] = useState("");
const [bookCover, setBookCover] = useState<string | null>(null);
const [studentName, setStudentName] = useState("");

  const [sourceWordsText, setSourceWordsText] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);

  const validRows = useMemo(
    () => rows.filter((r) => r.kanji.trim() && r.reading.trim()),
    [rows]
  );

  useEffect(() => {
    if (!userBookId) return;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      setNeedsSignIn(false);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          setNeedsSignIn(true);
          setLoading(false);
          return;
        }

        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = (prof?.role as ProfileRole | null) ?? "student";
        setMyRole(role);

        const { data: ub, error: ubErr } = await supabase
  .from("user_books")
  .select(
    `
    id,
    user_id,
    books:book_id (
      title,
      cover_url
    )
  `
  )
  .eq("id", userBookId)
  .single();

        if (ubErr) throw ubErr;

        setBookTitle((ub as any)?.books?.title ?? "");
setBookCover((ub as any)?.books?.cover_url ?? null);

const studentUserId = (ub as any)?.user_id ?? null;

if (studentUserId) {
  const { data: studentProf } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", studentUserId)
    .single();

  setStudentName(studentProf?.display_name ?? "");
} else {
  setStudentName("");
}

      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load page");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userBookId]);

  async function generateRowsFromWords() {
    const words = sourceWordsText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const nextRows: DraftRow[] = [];

    for (const word of words) {
  const kanjiChars = Array.from(word).filter((c) => /[一-龯々]/.test(c));
  if (!kanjiChars.length) continue;

  const wordReading = await fetchWordReading(word);
  const split = splitReadingAcrossKanji(word, wordReading);

  kanjiChars.forEach((k, i) => {
    const r = split[i] ? hiraToKata(split[i]) : "";

    nextRows.push({
  id: makeRowId(),
  sourceWord: word,
  kanji: k,
  reading: r,
  readingType: "onyomi",
});
  });
}

    setRows(nextRows);
  }

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }
  function hiraToKata(s: string) {
  return s.replace(/[ぁ-ゖ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

async function fetchWordReading(word: string) {
  try {
    const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(word)}`);
    const json = await res.json();

    const item = json?.data?.[0];
    const reading = item?.japanese?.[0]?.reading;

    return reading ?? "";
  } catch {
    return "";
  }
}

function splitReadingAcrossKanji(word: string, reading: string) {
  const kanjiChars = Array.from(word).filter((c) => /[一-龯々]/.test(c));

  if (kanjiChars.length === 0) return [];

  const readingChars = Array.from(reading);
  const chunkSize = Math.floor(readingChars.length / kanjiChars.length) || 1;

  const chunks: string[] = [];
  let idx = 0;

  for (let i = 0; i < kanjiChars.length; i++) {
    if (i === kanjiChars.length - 1) {
      chunks.push(readingChars.slice(idx).join(""));
    } else {
      chunks.push(readingChars.slice(idx, idx + chunkSize).join(""));
      idx += chunkSize;
    }
  }

  return chunks;
}

  async function activateNow() {
    if (validRows.length === 0) {
      setErrorMsg("Please add at least one kanji + reading row.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error("You must be signed in.");

      if (myRole !== "teacher") {
        throw new Error("Only teachers can prepare weekly readings.");
      }

      // Remove any existing active / prepared sets for this book
      const { data: oldSets, error: oldErr } = await supabase
        .from("user_book_weekly_reading_sets")
        .select("id")
        .eq("user_book_id", userBookId);

      if (oldErr) throw oldErr;

      if ((oldSets ?? []).length > 0) {
        const oldIds = oldSets!.map((s: any) => s.id);
        const { error: delErr } = await supabase
          .from("user_book_weekly_reading_sets")
          .delete()
          .in("id", oldIds);

        if (delErr) throw delErr;
      }

      const sourceWords = Array.from(
        new Set(rows.map((r) => r.sourceWord.trim()).filter(Boolean))
      );

      const { data: createdSet, error: setErr } = await supabase
        .from("user_book_weekly_reading_sets")
        .insert([
          {
            user_book_id: userBookId,
            status: "active",
            source_words: sourceWords,
            created_by: user.id,
            activated_at: new Date().toISOString(),
          },
        ])
        .select("id")
        .single();

      if (setErr) throw setErr;

      const setId = createdSet.id;

      const cardPayload = validRows.map((r, i) => ({
  set_id: setId,
  sort_order: i + 1,
  source_word: r.sourceWord.trim(),
  kanji: r.kanji.trim(),
  reading: r.reading.trim(),
  reading_type: r.readingType,
}));

  console.log("weekly reading payload", cardPayload);
      const { error: cardsErr } = await supabase
        .from("user_book_weekly_reading_cards")
        .insert(cardPayload);

      if (cardsErr) throw cardsErr;

      await supabase
        .from("user_books")
        .update({ weekly_readings_last_seen_at: null })
        .eq("id", userBookId);

      router.push(`/books/${userBookId}/weekly-readings`);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to activate weekly readings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-gray-500">Loading weekly readings prep…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p>You need to sign in.</p>
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Go to Login
        </button>
      </main>
    );
  }

  if (myRole !== "teacher") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-700">Only teachers can access this page.</p>
        <button
          onClick={() => router.push(`/books/${userBookId}`)}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Back
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
  {bookCover ? (
    <img src={bookCover} alt="" className="w-16 h-24 rounded object-cover" />
  ) : null}
  <div>
    <div className="text-xs uppercase tracking-wide text-gray-500">Teacher Prep</div>
    <h1 className="text-2xl font-semibold">Prepare Weekly Readings</h1>

    <p className="text-sm text-gray-500 mt-1 max-w-xl">
      Kanji have multiple readings. The reading you will practice
      comes from an upcoming word in your book.
    </p>

    <p className="text-sm text-gray-700">{bookTitle}</p>

    {studentName ? (
      <p className="text-sm text-gray-500">Student: {studentName}</p>
    ) : null}
  </div>
</div>

      {errorMsg ? <p className="mb-4 text-sm text-red-700">{errorMsg}</p> : null}

      <div className="border rounded-xl bg-white p-4 mb-6">
        <h2 className="text-lg font-medium mb-2">Step 1: Enter upcoming compounds</h2>
        <p className="text-sm text-gray-500 mb-2">
  Paste one word per line. We’ll split the kanji out into editable rows.
</p>

<p className="text-sm text-amber-700 mb-3">
  Teachers: Be sure to check the readings. The auto-generation can make mistakes.
  Readings should be in katakana only. On Mac, control + K will turn it into katakana.
</p>

        <textarea
          value={sourceWordsText}
          onChange={(e) => setSourceWordsText(e.target.value)}
          placeholder={`食欲\n共同\n文化\n政府\n成長\n重要`}
          className="w-full min-h-[160px] border rounded p-3 text-sm"
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={generateRowsFromWords}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black"
          >
            Generate Rows
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceWordsText("");
              setRows([]);
            }}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="border rounded-xl bg-white p-4">
        <h2 className="text-lg font-medium mb-2">Step 2: Enter the readings</h2>
        <p className="text-sm text-gray-500 mb-3">
          Confirm the exact reading you want students to study this week.
        </p>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No rows yet. Generate them from the words above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
  <tr className="text-left border-b">
    <th className="p-2">Source Word</th>
    <th className="p-2">Kanji</th>
    <th className="p-2">Reading</th>
    <th className="p-2">Reading Type</th>
    <th className="p-2">Action</th>
  </tr>
</thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b">
  <td className="p-2">{r.sourceWord}</td>
  <td className="p-2 text-xl font-semibold">{r.kanji}</td>
  <td className="p-2">
    <input
      value={r.reading}
      onChange={(e) => updateRow(r.id, { reading: e.target.value })}
      placeholder="e.g. ショク"
      className="w-full border rounded px-2 py-1"
    />
  </td>
  <td className="p-2">
    <select
      value={r.readingType}
      onChange={(e) =>
        updateRow(r.id, {
          readingType: e.target.value as "onyomi" | "kunyomi" | "other",
        })
      }
      className="w-full border rounded px-2 py-1 bg-white"
    >
      <option value="onyomi">Onyomi</option>
      <option value="kunyomi">Kunyomi</option>
      <option value="other">Other</option>
    </select>
  </td>
  <td className="p-2">
    <button
      type="button"
      onClick={() => removeRow(r.id)}
      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
    >
      Remove
    </button>
  </td>
</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Ready rows: {validRows.length}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push(`/books/${userBookId}`)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Back
            </button>

            <button
              type="button"
              onClick={activateNow}
              disabled={saving || validRows.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-800 disabled:opacity-50"
            >
              {saving ? "Activating..." : "Activate Weekly Readings"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}