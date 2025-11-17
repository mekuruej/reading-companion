"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const KANJI_REGEX = /[\u3400-\u9FFF]/g;

async function getStrokeDataForWord(word: string) {
  const kanji = word.match(KANJI_REGEX) || [];
  const results: { char: string; strokes: number | null }[] = [];

  for (const ch of kanji) {
    try {
      const r = await fetch(
        `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`
      );
      if (r.ok) {
        const data = await r.json();
        results.push({ char: ch, strokes: data.stroke_count ?? null });
      } else {
        results.push({ char: ch, strokes: null });
      }
    } catch {
      results.push({ char: ch, strokes: null });
    }
  }

  return results;
}

function InnerVocabPageContent() {
  const searchParams = useSearchParams();
  const preselectedBook = searchParams.get("bookId") || "";

  const [books, setBooks] = useState<any[]>([]);
  const [bookId, setBookId] = useState(preselectedBook);

  const [word, setWord] = useState("");
  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");
  const [jlpt, setJlpt] = useState("");
  const [isCommon, setIsCommon] = useState(false);
  const [page, setPage] = useState("");
  const [strokeData, setStrokeData] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [message, setMessage] = useState("");
  const [vocab, setVocab] = useState<any[]>([]);
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterName, setChapterName] = useState("");

  useEffect(() => {
    if (!bookId) return;
    const saved = localStorage.getItem(`chapter_${bookId}`);
    if (saved) {
      const { number, name } = JSON.parse(saved);
      setChapterNumber(number);
      setChapterName(name);
    }
  }, [bookId]);

  useEffect(() => {
    if (!bookId) return;
    localStorage.setItem(
      `chapter_${bookId}`,
      JSON.stringify({
        number: chapterNumber,
        name: chapterName,
      })
    );
  }, [chapterNumber, chapterName, bookId]);

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("books")
      .select("id, title, started_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setBooks(data || []);
  }

  useEffect(() => {
    if (bookId) fetchVocab();
  }, [bookId]);

  async function fetchVocab() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("vocab")
      .select("*")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setVocab(data || []);
  }

  async function fetchPreview(e: React.FormEvent) {
    e.preventDefault();
    setPreviewMode(false);
    setMessage("⏳ Fetching Jisho info...");

    try {
      const res = await fetch(
        `/api/jisho?keyword=${encodeURIComponent(word)}`
      );
      if (!res.ok) throw new Error("Failed to fetch Jisho");

      const data = await res.json();
      const entry = data?.data?.[0];

      if (entry) {
        setReading(entry.japanese?.[0]?.reading || "");
        setMeaning(entry.senses?.[0]?.english_definitions?.join(", ") || "");
        setJlpt(entry.jlpt?.[0] || "Non-JLPT word");
        setIsCommon(entry.is_common || false);
      }

      const strokes = await getStrokeDataForWord(word);
      setStrokeData(strokes);

      setPreviewMode(true);
      setMessage("Preview loaded!");
    } catch (err) {
      console.error(err);
      setMessage("❌ Error fetching preview.");
    }
  }

  async function saveWord() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return alert("Please sign in first");

    const normalizedJlpt =
      jlpt && jlpt.startsWith("jlpt-")
        ? jlpt
        : jlpt.toLowerCase().startsWith("n")
        ? `jlpt-${jlpt.toLowerCase()}`
        : "Non-JLPT word";

    const selectedBook = books.find((b) => b.id === bookId);
    if (selectedBook && !selectedBook.started_at) {
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("books")
        .update({ started_at: today })
        .eq("id", bookId);
    }

    const { error } = await supabase.from("vocab").insert([
      {
        book_id: bookId,
        word,
        reading,
        meaning,
        jlpt: normalizedJlpt,
        is_common: isCommon,
        page_number: page ? Number(page) : null,
        chapter_number: chapterNumber ? Number(chapterNumber) : null,
        chapter_name: chapterName || null,
        strokes: strokeData,
        color_stage: 0,
        lookup_count: 1,
        user_id: user.id,
      },
    ]);

    if (error) {
      console.error(error);
      setMessage(`❌ Failed to save: ${error.message}`);
      return;
    }

    setMessage("✅ Saved successfully!");
    setPreviewMode(false);

    setWord("");
    setReading("");
    setMeaning("");
    setJlpt("");
    setIsCommon(false);
    setPage("");
    setStrokeData([]);

    fetchVocab();
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">📝 Add Vocabulary</h1>

      <form onSubmit={fetchPreview} className="flex flex-col gap-3 mb-6">
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          className="border p-2 rounded"
          required
        >
          <option value="">Select a book…</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <button className="bg-amber-500 text-white py-2 rounded hover:bg-amber-600">
          Fetch Info 🔍
        </button>
      </form>

      {message && (
        <p className="text-center text-sm mb-4">{message}</p>
      )}

      {previewMode && (
        <div className="border p-4 rounded bg-gray-50 mb-6">
          <h2 className="font-semibold text-lg mb-2">Preview</h2>

          <p className="text-xl font-bold">
            {word}（{reading}）
          </p>
          <p className="mb-2">{meaning}</p>

          <div className="flex flex-wrap gap-2 mb-2">
            <span className="px-2 bg-blue-100 text-blue-700 rounded text-xs">
              {jlpt.startsWith("jlpt-")
                ? jlpt.replace("jlpt-", "N").toUpperCase()
                : jlpt}
            </span>

            <span className="px-2 bg-gray-100 text-gray-700 rounded text-xs">
              {isCommon ? "Common" : "Rare"}
            </span>

            {strokeData.length > 0 && (
              <span className="px-2 bg-amber-100 text-amber-700 rounded text-xs">
                {strokeData
                  .map((s) => `${s.char}:${s.strokes ?? "?"}`)
                  .join(" / ")}{" "}
                strokes
              </span>
            )}
          </div>

          <input
            type="text"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            className="border p-2 rounded w-full mb-2"
          />

          <input
            type="text"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            className="border p-2 rounded w-full mb-2"
          />

          <input
            type="number"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="Page number (optional)"
            className="border p-2 rounded w-full mb-2"
          />

          <input
            type="number"
            value={chapterNumber}
            onChange={(e) => setChapterNumber(e.target.value)}
            placeholder="Chapter number (optional)"
            className="border p-2 rounded w-full mb-2"
          />

          <input
            type="text"
            value={chapterName}
            onChange={(e) => setChapterName(e.target.value)}
            placeholder="Chapter name (optional)"
            className="border p-2 rounded w-full mb-2"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPreviewMode(false)}
              className="px-3 py-1 border rounded"
            >
              Cancel
            </button>

            <button
              onClick={saveWord}
              className="px-3 py-1 bg-amber-500 text-white rounded"
            >
              Save to My Vocab
            </button>
          </div>
        </div>
      )}

      <h2 className="text-xl font-medium mb-3">📘 Vocabulary</h2>
      {!bookId && (
        <p className="text-gray-500">Select a book to view vocab.</p>
      )}

      {bookId && (
        <ul className="space-y-2">
          {vocab.map((item) => {
            let displayStrokes = "";
            if (Array.isArray(item.strokes)) {
              displayStrokes = item.strokes
                .map((s: any) => `${s.char}:${s.strokes ?? "?"}`)
                .join(" / ");
            }

            return (
              <li
                key={item.id}
                className="border p-3 rounded hover:bg-amber-50"
              >
                <div>
                  <span className="font-semibold text-lg">
                    {item.word}
                  </span>
                  {item.reading && (
                    <span className="text-gray-500 ml-2">
                      ({item.reading})
                    </span>
                  )}
                  <div className="text-sm mt-1">{item.meaning}</div>

                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    {item.jlpt && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {item.jlpt.startsWith("jlpt-")
                          ? `N${item.jlpt
                              .replace("jlpt-", "")
                              .replace("n", "")}`
                          : item.jlpt}
                      </span>
                    )}

                    {item.page_number && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                        p. {item.page_number}
                      </span>
                    )}

                    {item.chapter_number && (
                      <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded">
                        Ch. {item.chapter_number}
                      </span>
                    )}

                    {item.chapter_name && (
                      <span className="px-2 py-0.5 bg-pink-50 text-pink-600 border border-pink-200 rounded">
                        {item.chapter_name}
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 rounded ${
                        item.is_common
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.is_common ? "Common" : "Rare"}
                    </span>

                    {displayStrokes && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                        {displayStrokes} strokes
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
export default function VocabPageContent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InnerVocabPageContent />
    </Suspense>
  );
}
