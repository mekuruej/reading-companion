"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getTeacherBackLink } from "../../components/teacherBackLink";

type KanjiReadingType = "on" | "kun" | "other";

type KanjiFastPassRow = {
  id?: number;
  kanji: string;
  kanji_position: number;
  reading_type: KanjiReadingType;
  base_reading: string;
  realized_reading: string;
  flagged_for_review?: boolean | null;
  excluded_from_kanji_practice?: boolean | null;
};

type CacheSearchResult = {
  id: number;
  surface: string;
  reading: string;
  jlpt: string | null;
  meaning_preview: string | null;
  kanji_count: number;
  map_rows: KanjiFastPassRow[];
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function extractKanjiChars(value: string) {
  return Array.from(value).filter((char) => /\p{Script=Han}/u.test(char));
}

function buildRowsFromCache(result: CacheSearchResult) {
  const chars = extractKanjiChars(result.surface);
  const existingRows = result.map_rows ?? [];

  return chars.map((kanji, index) => {
    const existing = existingRows.find((row) => Number(row.kanji_position) === index);
    const defaultReading = chars.length === 1 ? result.reading.trim() : "";

    return {
      id: existing?.id,
      kanji,
      kanji_position: index,
      reading_type: existing?.reading_type ?? "on",
      base_reading: existing?.base_reading ?? defaultReading,
      realized_reading: existing?.realized_reading ?? existing?.base_reading ?? defaultReading,
      flagged_for_review: existing?.flagged_for_review ?? false,
      excluded_from_kanji_practice: existing?.excluded_from_kanji_practice ?? false,
    } satisfies KanjiFastPassRow;
  });
}

function hasCompleteKanjiMap(result: CacheSearchResult) {
  const chars = extractKanjiChars(result.surface);
  const mapRows = result.map_rows ?? [];
  if (chars.length === 0 || mapRows.length < chars.length) return false;

  return chars.every((kanji, index) => {
    const row = mapRows.find((candidate) => Number(candidate.kanji_position) === index);
    return Boolean(
      row &&
        row.kanji === kanji &&
        row.base_reading?.trim() &&
        row.realized_reading?.trim() &&
        row.reading_type
    );
  });
}

function hasFlaggedKanjiMapRows(result: CacheSearchResult) {
  return (result.map_rows ?? []).some((row) => row.flagged_for_review);
}

function hasCleanCompleteKanjiMap(result: CacheSearchResult) {
  return hasCompleteKanjiMap(result) && !hasFlaggedKanjiMapRows(result);
}

function mapStatus(result: CacheSearchResult) {
  const chars = extractKanjiChars(result.surface);
  if (chars.length === 0) return "No kanji";
  if (hasFlaggedKanjiMapRows(result)) return "In queue: flagged";
  if (hasCompleteKanjiMap(result)) return "Already mapped";
  if ((result.map_rows ?? []).length > 0) return "Needs reading rows";
  return "No map rows yet";
}

export default function TeacherKanjiFastPassPage() {
  const searchParams = useSearchParams();
  const backLink = getTeacherBackLink(searchParams.get("from"));

  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<CacheSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CacheSearchResult | null>(null);
  const [rows, setRows] = useState<KanjiFastPassRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      setAccessChecked(false);
      setCanAccess(false);
      setMessage("");

      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (cancelled) return;

      if (authError || !user) {
        setMessage("Please sign in to use Kanji Fast Pass.");
        setAccessChecked(true);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (profileError) {
        setMessage(profileError.message ?? "Could not load teacher profile.");
        setAccessChecked(true);
        return;
      }

      const isSuperTeacher =
        profile?.role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);

      setCanAccess(isSuperTeacher);
      setMessage(isSuperTeacher ? "" : "Super teacher access is required.");
      setAccessChecked(true);
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  function selectResult(result: CacheSearchResult) {
    setSelectedResult(result);
    setRows(buildRowsFromCache(result));
    setMessage("");
  }

  function updateRow(
    index: number,
    field: keyof Pick<KanjiFastPassRow, "reading_type" | "base_reading" | "realized_reading">,
    value: string
  ) {
    setRows((previousRows) =>
      previousRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        if (field === "reading_type") {
          return {
            ...row,
            reading_type: value === "kun" || value === "other" ? value : "on",
          };
        }

        if (field === "base_reading") {
          const shouldSyncRealized = !row.realized_reading || row.realized_reading === row.base_reading;
          return {
            ...row,
            base_reading: value,
            realized_reading: shouldSyncRealized ? value : row.realized_reading,
          };
        }

        return { ...row, realized_reading: value };
      })
    );
  }

  async function searchCache() {
    const cleanKeyword = keyword.trim();
    if (!cleanKeyword) return;

    setLookupLoading(true);
    setMessage("");
    setResults([]);
    setSelectedResult(null);
    setRows([]);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again before searching.");

      const response = await fetch(
        `/api/teacher/kanji-fast-pass?keyword=${encodeURIComponent(cleanKeyword)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await response.json().catch(() => null);

      if (!response.ok) throw new Error(json?.error ?? "Could not search vocabulary cache.");

      const nextResults = Array.isArray(json?.results) ? (json.results as CacheSearchResult[]) : [];
      setResults(nextResults);
      if (nextResults.length === 1) selectResult(nextResults[0]);
      if (nextResults.length === 0) {
        setMessage("No existing vocabulary cache word found. Add it through Global Vocabulary Entry first.");
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Could not search vocabulary cache.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function saveFastPass() {
    if (!selectedResult) return;
    setSaving(true);
    setMessage("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again before saving.");

      const response = await fetch("/api/teacher/kanji-fast-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vocabulary_cache_id: selectedResult.id,
          rows,
        }),
      });
      const json = await response.json().catch(() => null);

      if (!response.ok) throw new Error(json?.error ?? "Could not save kanji map.");

      setMessage(
        `Saved. ${json.kanji_map_inserted} row${json.kanji_map_inserted === 1 ? "" : "s"} added, ${json.kanji_map_updated} updated.`
      );
      await searchCache();
    } catch (err: any) {
      setMessage(err?.message ?? "Could not save kanji map.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(
    selectedResult &&
      !hasCleanCompleteKanjiMap(selectedResult) &&
      rows.length > 0 &&
      rows.every((row) => row.base_reading.trim() && row.realized_reading.trim())
  );

  if (!accessChecked) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl text-sm text-stone-500">Loading teacher access...</div>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Teacher access
          </p>
          <h1 className="mt-2 text-2xl font-black text-stone-900">Kanji Fast Pass</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "Super teacher access is required."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href={backLink.href} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            ← {backLink.label}
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Kanji upkeep
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
            Fast-pass Kanji Reading
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Find an existing global vocabulary word, check its kanji map, and fill trusted reading rows quickly.
          </p>
        </section>

        {message ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              message.startsWith("Saved")
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {message}
          </div>
        ) : null}

        <section className="mt-6 rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              Cache lookup
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void searchCache();
              }}
              className="mt-3 flex flex-col gap-3 sm:flex-row"
            >
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search exact word or reading..."
                className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
              />
              <button
                type="submit"
                disabled={lookupLoading || !keyword.trim()}
                className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                {lookupLoading ? "Searching..." : "Search Cache"}
              </button>
            </form>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              If the word is not already in the shared vocabulary cache, add it through Global Vocabulary Entry first. If the cache word already has a complete kanji map, no fast-pass work is needed.
            </p>
          </div>

          {results.length > 0 ? (
            <div className="border-b border-stone-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Matches
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {results.map((result) => {
                  const selected = selectedResult?.id === result.id;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => selectResult(result)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-stone-900 bg-stone-100"
                          : "border-stone-200 bg-white hover:border-stone-400"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-2xl font-black text-stone-950">{result.surface}</p>
                          <p className="mt-1 text-sm font-semibold text-stone-600">{result.reading}</p>
                        </div>
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                          {mapStatus(result)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-stone-500">
                        {result.jlpt ?? "Unlabeled"}
                        {result.meaning_preview ? ` · ${result.meaning_preview}` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="divide-y divide-stone-200">
            {!selectedResult ? (
              <div className="p-5 text-sm text-stone-500">
                Search and choose an existing vocabulary cache word to edit its kanji map.
              </div>
            ) : hasCleanCompleteKanjiMap(selectedResult) ? (
              <div className="p-5 text-sm text-emerald-700">
                This vocabulary cache word already has complete kanji-map rows. Nothing needs to be saved here.
              </div>
            ) : rows.length === 0 ? (
              <div className="p-5 text-sm text-stone-500">
                This cache word has no kanji characters.
              </div>
            ) : (
              rows.map((row, index) => (
                <div key={`${row.kanji}-${row.kanji_position}`} className="p-5">
                  <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-center">
                    <div className="flex items-center gap-3">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-3xl font-black text-stone-950">
                        {row.kanji}
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          Position {row.kanji_position + 1}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-stone-600">
                          {selectedResult.surface} · {selectedResult.reading}
                        </p>
                        {row.flagged_for_review ? (
                          <p className="mt-2 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                            Flagged in queue
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[120px_1fr_1fr]">
                      <label className="block text-sm font-semibold text-stone-700">
                        Type
                        <select
                          value={row.reading_type}
                          onChange={(event) => updateRow(index, "reading_type", event.target.value)}
                          className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="on">on</option>
                          <option value="kun">kun</option>
                          <option value="other">other</option>
                        </select>
                      </label>

                      <label className="block text-sm font-semibold text-stone-700">
                        Base reading
                        <input
                          value={row.base_reading}
                          onChange={(event) => updateRow(index, "base_reading", event.target.value)}
                          placeholder="こう"
                          className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-stone-700">
                        Reading in this word
                        <input
                          value={row.realized_reading}
                          onChange={(event) => updateRow(index, "realized_reading", event.target.value)}
                          placeholder="こう"
                          className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-stone-200 p-5">
            <button
              type="button"
              onClick={saveFastPass}
              disabled={!canSave || saving}
              className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Kanji Map"}
            </button>
            <Link
              href="/teacher/global-words?from=site-upkeep"
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              Global Vocabulary Entry
            </Link>
            <Link
              href="/teacher/kanji?from=site-upkeep"
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              Open Kanji Queue
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
