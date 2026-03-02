"use client";

import { useState } from "react";

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
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

function extractMeaningChoices(entry: any): string[] {
  const senses = entry?.senses ?? [];
  const choices: string[] = [];

  for (const s of senses) {
    const defs: string[] = s?.english_definitions ?? [];
    const text = defs.join(", ").trim();
    if (text) choices.push(text);
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  return choices.filter((c) => {
    const key = c.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// -------------------------------------------------------------
// Page
// -------------------------------------------------------------
export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [surface, setSurface] = useState("");
  const [reading, setReading] = useState("");
  const [jlpt, setJlpt] = useState("NON-JLPT");
  const [isCommon, setIsCommon] = useState(false);

  const [meaningChoices, setMeaningChoices] = useState<string[]>([]);
  const [meaningChoiceIndex, setMeaningChoiceIndex] = useState(0);

  async function lookup() {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setErr(null);

    setSurface("");
    setReading("");
    setJlpt("NON-JLPT");
    setIsCommon(false);
    setMeaningChoices([]);
    setMeaningChoiceIndex(0);

    try {
      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Lookup failed");

      const data = await res.json();
      const entry = data?.data?.[0];

      if (!entry) {
        setErr("No results found.");
        return;
      }

      const s = entry.japanese?.[0]?.word || q;
      const r = entry.japanese?.[0]?.reading || "";
      const j = normalizeJlpt(entry.jlpt?.[0] || "");
      const c = !!entry.is_common;

      const choices = extractMeaningChoices(entry);

      setSurface(s);
      setReading(r);
      setJlpt(j);
      setIsCommon(c);
      setMeaningChoices(choices);
      setMeaningChoiceIndex(0);
    } catch (e: any) {
      setErr(e?.message ?? "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  const chosenMeaning = meaningChoices[meaningChoiceIndex] ?? "";

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">📘 Dictionary Lookup</h1>
      <p className="text-sm text-gray-600 mb-4">
        Look up a word to check reading / meanings. This page does not save anywhere.
      </p>

      <div className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              lookup();
            }
          }}
          placeholder="Type a word… (例: 生意気)"
          className="border p-2 rounded w-full"
        />
        <button
          onClick={lookup}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "..." : "Lookup"}
        </button>
      </div>

      {err ? <p className="text-sm text-red-700 mb-3">{err}</p> : null}

      {surface || reading || meaningChoices.length ? (
        <div className="border rounded bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-semibold">{surface || query}</div>
              {reading ? <div className="text-sm text-gray-600">{reading}</div> : null}

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{jlpt}</span>
                <span
                  className={`px-2 py-1 rounded-full border ${
                    isCommon
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-100 text-gray-700 border-gray-300"
                  }`}
                >
                  {isCommon ? "Common" : "Rare"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setQuery("");
                setErr(null);
                setSurface("");
                setReading("");
                setJlpt("NON-JLPT");
                setIsCommon(false);
                setMeaningChoices([]);
                setMeaningChoiceIndex(0);
              }}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            >
              Clear
            </button>
          </div>

          {meaningChoices.length ? (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Meanings</div>
                <div className="text-xs text-gray-500">
                  {meaningChoiceIndex + 1}/{meaningChoices.length}
                </div>
              </div>

              <select
                value={meaningChoiceIndex}
                onChange={(e) => setMeaningChoiceIndex(Number(e.target.value))}
                className="border p-2 rounded w-full mt-2 bg-white text-sm"
              >
                {meaningChoices.map((m, i) => (
                  <option key={i} value={i}>
                    {i + 1}: {m}
                  </option>
                ))}
              </select>

              <div className="mt-3 p-3 rounded bg-gray-50 border">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Selected meaning</div>
                <div className="text-sm">{chosenMeaning || "—"}</div>
              </div>

              <details className="mt-3 text-sm text-gray-600">
                <summary className="cursor-pointer select-none">Show all meanings</summary>
                <ol className="list-decimal ml-5 mt-2 space-y-1">
                  {meaningChoices.map((m, i) => (
                    <li key={i} className={i === meaningChoiceIndex ? "font-medium text-gray-900" : ""}>
                      {m}
                    </li>
                  ))}
                </ol>
              </details>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">No meanings returned for this entry.</p>
          )}
        </div>
      ) : null}
    </main>
  );
}