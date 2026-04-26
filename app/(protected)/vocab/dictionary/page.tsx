"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type DictionaryEntry = {
  word: string;
  reading: string;
  meanings: string[];
  jlpt?: string | null;
  isCommon?: boolean | null;
};

type KanjiMeta = {
  kanji: string;
  strokes: number | null;
  radical: string | null;
};

type RelatedWord = {
  word: string;
  reading: string;
  meaning: string;
};

type KanjiGroup = {
  kanji: string;
  relatedWords: RelatedWord[];
};

function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

function getUniqueKanji(surface: string) {
  return Array.from(new Set(surface.match(/[\u3400-\u9FFF]/g) || []));
}

export default function DictionaryPage() {
  const searchParams = useSearchParams();
  const initialWord = searchParams.get("word") ?? "";

  const [query, setQuery] = useState(initialWord);
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extraLoadingWord, setExtraLoadingWord] = useState<string | null>(null);
  const [kanjiMetaByWord, setKanjiMetaByWord] = useState<Record<string, KanjiMeta[]>>({});
  const [kanjiGroupsByWord, setKanjiGroupsByWord] = useState<Record<string, KanjiGroup[]>>({});

  useEffect(() => {
    if (!initialWord) return;
    void runSearch(initialWord);
  }, [initialWord]);

  async function loadDictionaryExtras(surface: string) {
    setExtraLoadingWord(surface);

    try {
      const chars = getUniqueKanji(surface);

      if (chars.length === 0) {
        setKanjiMetaByWord((prev) => ({ ...prev, [surface]: [] }));
        setKanjiGroupsByWord((prev) => ({ ...prev, [surface]: [] }));
        return;
      }

      const metaResults: KanjiMeta[] = [];
      const groupResults: KanjiGroup[] = [];

      for (const ch of chars) {
        try {
          const r = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`);
          if (!r.ok) {
            metaResults.push({ kanji: ch, strokes: null, radical: null });
          } else {
            const data = await r.json();
            metaResults.push({
              kanji: ch,
              strokes: data.stroke_count ?? null,
              radical: null,
            });
          }
        } catch {
          metaResults.push({ kanji: ch, strokes: null, radical: null });
        }

        try {
          const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(ch)}`);
          if (!res.ok) {
            groupResults.push({ kanji: ch, relatedWords: [] });
            continue;
          }

          const data = await res.json();
          const relatedWords: RelatedWord[] = (data?.data ?? [])
            .map((item: any) => ({
              word: item?.japanese?.[0]?.word ?? item?.japanese?.[0]?.reading ?? "",
              reading: item?.japanese?.[0]?.reading ?? "",
              meaning: item?.senses?.[0]?.english_definitions?.join("; ") ?? "",
            }))
            .filter((x: RelatedWord) => x.word && x.word !== surface)
            .slice(0, 3);

          groupResults.push({
            kanji: ch,
            relatedWords,
          });
        } catch {
          groupResults.push({ kanji: ch, relatedWords: [] });
        }
      }

      setKanjiMetaByWord((prev) => ({ ...prev, [surface]: metaResults }));
      setKanjiGroupsByWord((prev) => ({ ...prev, [surface]: groupResults }));
    } catch {
      setKanjiMetaByWord((prev) => ({ ...prev, [surface]: [] }));
      setKanjiGroupsByWord((prev) => ({ ...prev, [surface]: [] }));
    } finally {
      setExtraLoadingWord((current) => (current === surface ? null : current));
    }
  }

  async function runSearch(raw?: string) {
    const q = (raw ?? query).trim();
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
        const meanings = senses
          .map((s: any) =>
            Array.isArray(s?.english_definitions)
              ? s.english_definitions.join("; ")
              : ""
          )
          .filter(Boolean);

        const jlptArr = Array.isArray(item?.jlpt) ? item.jlpt : [];
        const jlpt =
          jlptArr.length > 0
            ? String(jlptArr[0]).toUpperCase().replace("JLPT-", "")
            : null;

        return {
          word,
          reading,
          meanings: meanings.length ? meanings : ["—"],
          jlpt,
          isCommon: item?.is_common ?? false,
        };
      });

      setResults(mapped);
      const uniqueSurfaces = Array.from(
        new Set(mapped.map((entry) => entry.word).filter(Boolean))
      );

      for (const surface of uniqueSurfaces) {
        void loadDictionaryExtras(surface);
      }

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
    <main className="mx-auto min-h-screen max-w-5xl px-6 pb-10 pt-15">
      <h1 className="mb-1 text-2xl font-semibold">Dictionary</h1>
      <p className="mb-4 text-sm text-stone-500">
        Look up a word directly. When you want to know where you met it, jump over to Word History.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSearch();
          }}
          placeholder="Search Japanese word..."
          className="flex-1 border rounded px-3 py-2 bg-white"
        />

        <button
          type="button"
          onClick={() => void runSearch()}
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
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="text-2xl font-semibold text-stone-900">
              {entry.word || "—"}
            </div>

            <div className="mt-1 text-base text-stone-500">
              {entry.reading || "—"}
            </div>

            <div className="mt-4 space-y-2">
              {entry.meanings.map((meaning, meaningIndex) => (
                <div
                  key={`${entry.word}-${entry.reading}-${meaningIndex}`}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Meaning {meaningIndex + 1}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-stone-800">
                    {meaning}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {normalizeJlpt(entry.jlpt) !== "NON-JLPT" ? (
                <span className="rounded-full border bg-white px-2 py-1">
                  {normalizeJlpt(entry.jlpt)}
                </span>
              ) : null}

              {entry.isCommon ? (
                <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-green-700">
                  Common
                </span>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border p-4">
              <div className="mb-2 text-sm font-semibold text-stone-900">Kanji Info</div>

              {extraLoadingWord === entry.word ? (
                <div className="text-sm text-stone-500">Loading kanji info…</div>
              ) : (kanjiMetaByWord[entry.word] ?? []).length === 0 ? (
                <div className="text-sm text-stone-500">No kanji info for this word.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(kanjiMetaByWord[entry.word] ?? []).map((k) => (
                    <span
                      key={`${entry.word}-${k.kanji}`}
                      className="rounded-full border bg-stone-50 px-3 py-1 text-sm"
                    >
                      {k.kanji} · {k.strokes ?? "?"} strokes
                      {k.radical ? ` · radical ${k.radical}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border p-4">
              <div className="mb-2 text-sm font-semibold text-stone-900">Words Using These Kanji</div>

              {(kanjiGroupsByWord[entry.word] ?? []).length === 0 ? (
                <div className="text-sm text-stone-500">No related kanji words found.</div>
              ) : (
                <div className="space-y-5">
                  {(kanjiGroupsByWord[entry.word] ?? []).map((group) => (
                    <div key={`${entry.word}-${group.kanji}`}>
                      <div className="mb-2 text-sm font-semibold text-stone-700">
                        Words with {group.kanji}
                      </div>

                      {group.relatedWords.length === 0 ? (
                        <div className="text-sm text-stone-500">No related words found.</div>
                      ) : (
                        <div className="space-y-2">
                          {group.relatedWords.map((kw, meaningIndex) => (
                            <div
                              key={`${entry.word}-${group.kanji}-${kw.word}-${meaningIndex}`}
                              className="text-sm"
                            >
                              <span className="font-medium text-stone-900">{kw.word}</span>
                              {kw.reading ? (
                                <span className="ml-2 text-stone-600">（{kw.reading}）</span>
                              ) : null}
                              {kw.meaning ? (
                                <div className="mt-0.5 text-stone-500">{kw.meaning}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/vocab/history?word=${encodeURIComponent(entry.word || query)}`}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-50"
              >
                Open in Word History
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
