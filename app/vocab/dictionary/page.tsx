"use client";

import { useState } from "react";

type DictionaryEntry = {
  word: string;
  reading: string;
  meaning: string;
  jlpt?: string | null;
  isCommon?: boolean | null;
};

export default function JishoPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg(null);
    setResults([]);

    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(q)}`);

      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];

      const mapped: DictionaryEntry[] = data.map((item: any) => {
        const japanese0 = item?.japanese?.[0] ?? {};
        const senses = Array.isArray(item?.senses) ? item.senses : [];

        const word = japanese0.word ?? japanese0.reading ?? "";
        const reading = japanese0.reading ?? "";
        const meaning = senses
          .flatMap((s: any) => s.english_definitions ?? [])
          .filter(Boolean)
          .join("; ");

        const jlptArr = Array.isArray(item?.jlpt) ? item.jlpt : [];
        const jlpt =
          jlptArr.length > 0
            ? String(jlptArr[0]).toUpperCase().replace("JLPT-", "")
            : null;

        return {
          word,
          reading,
          meaning: meaning || "—",
          jlpt,
          isCommon: item?.is_common ?? false,
        };
      });

      setResults(mapped);

      if (mapped.length === 0) {
        setErrorMsg("No results found.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Could not search dictionary.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Dictionary</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
          placeholder="Search Japanese word..."
          className="flex-1 border rounded px-3 py-2 bg-white"
        />

        <button
          type="button"
          onClick={runSearch}
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {errorMsg ? <p className="text-sm text-red-600 mb-3">{errorMsg}</p> : null}

      <div className="space-y-3">
        {results.map((entry, idx) => (
          <div
            key={`${entry.word}-${entry.reading}-${idx}`}
            className="border rounded-lg p-4 bg-white"
          >
            <div className="text-xl font-semibold">{entry.word || "—"}</div>
            <div className="text-sm text-gray-600">{entry.reading || "—"}</div>
            <div className="mt-2 text-sm text-gray-800">{entry.meaning || "—"}</div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {entry.jlpt ? (
                <span className="px-2 py-1 rounded bg-gray-100 border">
                  {entry.jlpt}
                </span>
              ) : null}

              {entry.isCommon ? (
                <span className="px-2 py-1 rounded bg-green-50 border text-green-700">
                  Common
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}