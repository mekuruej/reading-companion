"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const KANJI_REGEX = /[\u3400-\u9FFF]/g;

async function getStrokeData(word: string) {
  const chars = word.match(KANJI_REGEX) || [];
  const results: { char: string; strokes: number | null }[] = [];

  for (const ch of chars) {
    try {
      const r = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`);
      if (!r.ok) {
        results.push({ char: ch, strokes: null });
        continue;
      }
      const data = await r.json();
      results.push({ char: ch, strokes: data.stroke_count ?? null });
    } catch {
      results.push({ char: ch, strokes: null });
    }
  }

  return results;
}

function normalizeJlpt(val: string): string {
  if (!val) return "NON-JLPT";
  const v = val.toUpperCase();
  if (v.includes("N5")) return "N5";
  if (v.includes("N4")) return "N4";
  if (v.includes("N3")) return "N3";
  if (v.includes("N2")) return "N2";
  if (v.includes("N1")) return "N1";
  return "NON-JLPT";
}

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function EditVocabPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const vocabId = params.id;

  const [loading, setLoading] = useState(true);

  const [bookId, setBookId] = useState("");
  const [word, setWord] = useState("");
  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");
  const [jlpt, setJlpt] = useState("NON-JLPT");
  const [isCommon, setIsCommon] = useState(false);
  const [page, setPage] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [strokes, setStrokes] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  // ------------------------------------------------------------
  // Load vocab
  // ------------------------------------------------------------
  useEffect(() => {
    async function loadRow() {
      const { data, error } = await supabase
        .from("vocab")
        .select("*")
        .eq("id", vocabId)
        .single();

      if (error || !data) {
        setMessage("❌ Unable to load vocabulary.");
        setLoading(false);
        return;
      }

      setBookId(data.book_id);
      setWord(data.word || "");
      setReading(data.reading || "");
      setMeaning(data.meaning || "");

      setJlpt(normalizeJlpt(data.jlpt || ""));
      setIsCommon(Boolean(data.is_common));

      setPage(data.page_number ? String(data.page_number) : "");
      setChapterNumber(data.chapter_number ? String(data.chapter_number) : "");
      setChapterName(data.chapter_name || "");

      setStrokes(Array.isArray(data.strokes) ? data.strokes : []);

      setLoading(false);
    }

    loadRow();
  }, [vocabId]);

  // ------------------------------------------------------------
  // Refresh stroke count
  // ------------------------------------------------------------
  async function refreshStrokes() {
    const s = await getStrokeData(word);
    setStrokes(s);
  }

  // ------------------------------------------------------------
  // Save updated row
  // ------------------------------------------------------------
  async function saveChanges() {
    setMessage("Saving...");

    const { error } = await supabase
      .from("vocab")
      .update({
        word,
        reading,
        meaning,
        jlpt: normalizeJlpt(jlpt),
        is_common: isCommon,
        page_number: page ? Number(page) : null,
        chapter_number: chapterNumber ? Number(chapterNumber) : null,
        chapter_name: chapterName || null,
        strokes,
      })
      .eq("id", vocabId);

    if (error) {
      setMessage("❌ Failed: " + error.message);
      return;
    }

    setMessage("✅ Saved!");

    setTimeout(() => {
      router.push("/vocab");
    }, 600);
  }

  // ------------------------------------------------------------
  // Delete card
  // ------------------------------------------------------------
  async function deleteCard() {
    const ok = confirm("Are you sure you want to delete this card?");
    if (!ok) return;

    const { error } = await supabase
      .from("vocab")
      .delete()
      .eq("id", vocabId);

    if (error) {
      setMessage("❌ Delete failed: " + error.message);
      return;
    }

    router.push("/vocab");
  }

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  if (loading) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">✏️ Edit Vocabulary</h1>

      {message && <p className="mb-4 text-sm">{message}</p>}

      <input value={word} onChange={(e) => setWord(e.target.value)} className="border p-2 w-full rounded mb-3" />
      <input value={reading} onChange={(e) => setReading(e.target.value)} className="border p-2 w-full rounded mb-3" />

      <textarea
        value={meaning}
        onChange={(e) => setMeaning(e.target.value)}
        className="border p-2 w-full rounded mb-3"
        rows={3}
      />

      <select
        value={jlpt}
        onChange={(e) => setJlpt(e.target.value)}
        className="border p-2 w-full rounded mb-3"
      >
        <option value="NON-JLPT">NON-JLPT</option>
        <option value="N5">N5</option>
        <option value="N4">N4</option>
        <option value="N3">N3</option>
        <option value="N2">N2</option>
        <option value="N1">N1</option>
      </select>

      <button
        onClick={() => setIsCommon((c) => !c)}
        className={`px-3 py-1 rounded mb-3 border ${
          isCommon
            ? "bg-green-100 text-green-700 border-green-300"
            : "bg-gray-100 text-gray-700 border-gray-300"
        }`}
      >
        {isCommon ? "Common" : "Rare"}
      </button>

      <input
        type="number"
        value={page}
        onChange={(e) => setPage(e.target.value)}
        placeholder="Page number"
        className="border p-2 w-full rounded mb-3"
      />

      <input
        type="number"
        value={chapterNumber}
        onChange={(e) => setChapterNumber(e.target.value)}
        placeholder="Chapter number"
        className="border p-2 w-full rounded mb-3"
      />

      <input
        value={chapterName}
        onChange={(e) => setChapterName(e.target.value)}
        placeholder="Chapter name"
        className="border p-2 w-full rounded mb-3"
      />

      {strokes.length > 0 && (
        <p className="text-sm mb-3">
          {strokes.map((s) => `${s.char}:${s.strokes ?? "?"}`).join(" / ")} strokes
        </p>
      )}

      <button
        onClick={refreshStrokes}
        className="px-3 py-1 bg-purple-500 text-white rounded mb-6"
      >
        Refresh Stroke Count
      </button>

      <button onClick={saveChanges} className="px-4 py-2 bg-amber-500 text-white rounded w-full mb-4">
        Save Changes
      </button>

      <button onClick={deleteCard} className="px-4 py-2 bg-red-500 text-white rounded w-full mb-4">
        🗑 Delete Card
      </button>

      <button onClick={() => router.push("/vocab")} className="px-4 py-2 bg-gray-200 rounded w-full">
        ← Back
      </button>
    </main>
  );
}
