"use client";
import WordContextFields from "./WordContextFields";
import type { WordContext } from "@/lib/vocabulary/wordContext";

import WordPositionField from "@/components/vocabulary/WordPositionField";
import type { ProgressTrackingMethod } from "@/lib/books/readingProgress";
import { type KeyboardEvent, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchJapaneseDictionaryCandidates,
  type JapaneseDictionaryCandidate,
} from "@/lib/vocabulary/japaneseDictionaryCandidates";

export type JapaneseDictionaryCaptureValue = WordContext & {
  alternativeSurface?: string;
  surface: string;
  cacheSurface: string;
  reading: string;
  meaning: string;
  meaningChoices: string[];
  meaningChoiceIndex: number | null;
  isManual: boolean;
  pageNumber: string;
  chapterNumber: string;
  chapterName: string;
  followAlongSupportNote: string;
};

type JapaneseDictionaryCaptureProps = {
  positionUnit?: ProgressTrackingMethod;
  title: string;
  description: string;
  saveLabel?: string;
  savingLabel?: string;
  successMessage?: string;
  variant?: "card" | "embedded";
  onSave: (value: JapaneseDictionaryCaptureValue) => Promise<"added" | "already-included" | "readded">;
};

function blankManualValue(surface: string): JapaneseDictionaryCaptureValue {
  return {
    surface,
    cacheSurface: "",
    reading: "",
    meaning: "",
    meaningChoices: [],
    meaningChoiceIndex: null,
    isManual: true,
    pageNumber: "",
    chapterNumber: "",
    chapterName: "",
    followAlongSupportNote: "",
  };
}

function valueFromCandidate(candidate: JapaneseDictionaryCandidate): JapaneseDictionaryCaptureValue {
  return {
    surface: candidate.surface,
    cacheSurface: candidate.cacheSurface,
    reading: candidate.reading,
    meaning: candidate.meaning,
    meaningChoices: candidate.meaningChoices,
    meaningChoiceIndex: candidate.meaningChoices.length > 0 ? candidate.meaningChoiceIndex : null,
    isManual: candidate.isManual,
    pageNumber: "",
    chapterNumber: "",
    chapterName: "",
    followAlongSupportNote: "",
  };
}

export default function JapaneseDictionaryCapture({
  positionUnit = "page",
  title,
  description,
  saveLabel = "Save to Follow-Along",
  savingLabel = "Saving...",
  successMessage = "✓ Added to Follow-Along",
  variant = "card",
  onSave,
}: JapaneseDictionaryCaptureProps) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<JapaneseDictionaryCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JapaneseDictionaryCaptureValue>(blankManualValue(""));
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showManualFields, setShowManualFields] = useState(false);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  );
  const canSave = draft.surface.trim() && draft.meaning.trim() && (draft.isManual || selectedCandidateId);

  function selectCandidate(candidate: JapaneseDictionaryCandidate) {
    setSelectedCandidateId(candidate.id);
    setDraft((current) => ({
      ...valueFromCandidate(candidate),
      pageNumber: current.pageNumber,
      chapterNumber: current.chapterNumber,
      chapterName: current.chapterName,
      followAlongSupportNote: current.followAlongSupportNote,
      alternativeSurface: current.alternativeSurface,
      book_form: current.book_form,
      book_form_description: current.book_form_description,
    }));
    setShowManualFields(false);
    setMessage("");
    setError("");
  }

  async function searchDictionary() {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setError("Enter a word or phrase first.");
      return;
    }

    setSearching(true);
    setError("");
    setMessage("");
    setCandidates([]);
    setSelectedCandidateId(null);
    setDraft(blankManualValue(cleanQuery));

    try {
      const nextCandidates = await fetchJapaneseDictionaryCandidates(supabase, cleanQuery);
      setCandidates(nextCandidates);
      if (nextCandidates[0]) {
        selectCandidate(nextCandidates[0]);
        setMessage(
          nextCandidates.length > 1
            ? "Dictionary info loaded. Choose the result and meaning that match this book."
            : "Dictionary info loaded."
        );
      } else {
        setShowManualFields(true);
        setError("No dictionary result found. You can save a compact manual entry.");
      }
    } catch (searchError: any) {
      setShowManualFields(true);
      setError(searchError?.message ?? "Could not load dictionary data.");
    } finally {
      setSearching(false);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void searchDictionary();
  }

  async function save() {
    if (!canSave || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await onSave(draft);
      setMessage(result === "already-included" ? "Already in Follow-Along" : successMessage);
      setQuery("");
      setCandidates([]);
      setSelectedCandidateId(null);
      setDraft(blankManualValue(""));
      setShowManualFields(false);
    } catch (saveError: any) {
      setError(saveError?.message ?? "Could not save this word.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={variant === "card" ? "rounded-3xl border border-stone-200 bg-white p-5 shadow-sm" : ""}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
          Word Capture
        </p>
        <h2 className="mt-1 text-xl font-black text-stone-950">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Enter a word or phrase"
          className="min-h-9 min-w-0 flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-2 text-base text-stone-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={() => void searchDictionary()}
          disabled={searching || !query.trim()}
          className="rounded-2xl border border-blue-700 bg-blue-700 px-5 py-2 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
        <button
          type="button"
          onClick={() => {
            const manual = blankManualValue(query.trim());
            setDraft(manual);
            setSelectedCandidateId(null);
            setShowManualFields(true);
            setError("");
            setMessage("");
          }}
          className="rounded-2xl border border-stone-300 bg-white px-5 py-2 text-sm font-black text-stone-700 hover:bg-stone-50"
        >
          Manual
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-900">
          {message}
        </p>
      ) : null}

      {candidates.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {candidates.map((candidate) => {
            const selected = selectedCandidateId === candidate.id;

            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => selectCandidate(candidate)}
                className={`rounded-2xl border px-3 py-2 text-left transition ${
                  selected
                    ? "border-blue-400 bg-blue-50 shadow-sm ring-2 ring-blue-100"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-black text-stone-950">{candidate.surface}</p>
                    <p className="text-sm font-semibold text-stone-500">
                      {candidate.reading || "No reading listed"}
                    </p>
                  </div>
                  {selected ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-800">
                      Selected
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-700">
                  {candidate.meaning || "No meaning listed"}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedCandidate && selectedCandidate.meaningChoices.length > 1 ? (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">
            Meaning to save
          </span>
          <select
            value={draft.meaningChoiceIndex ?? 0}
            onChange={(event) => {
              const index = Number(event.target.value);
              setDraft((current) => ({
                ...current,
                meaning: selectedCandidate.meaningChoices[index] ?? "",
                meaningChoiceIndex: index,
              }));
            }}
            className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
          >
            {selectedCandidate.meaningChoices.map((meaning, index) => (
              <option key={`${meaning}-${index}`} value={index}>
                {index + 1}. {meaning || "No meaning listed"}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showManualFields ? (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">Word</span>
            <input value={draft.surface} onChange={(event) => setDraft((current) => ({ ...current, surface: event.target.value, isManual: true }))} className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">Reading</span>
            <input value={draft.reading} onChange={(event) => setDraft((current) => ({ ...current, reading: event.target.value, isManual: true }))} className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">Meaning</span>
            <input value={draft.meaning} onChange={(event) => setDraft((current) => ({ ...current, meaning: event.target.value, meaningChoices: [], meaningChoiceIndex: null, isManual: true }))} className="w-full rounded-2xl border border-stone-300 px-3 py-2 text-sm" />
          </label>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <label className="block text-xs font-medium text-stone-600">Alternative spelling / kanji
          <input className="w-full rounded-lg border px-2 py-1.5 text-sm" value={draft.alternativeSurface ?? ""}
            onChange={event => setDraft(current => ({ ...current, alternativeSurface: event.target.value }))} placeholder="Optional" />
        </label>
        <WordContextFields teacher value={{ ...draft, follow_along_support_note: draft.followAlongSupportNote }}
          onChange={value => setDraft(current => ({ ...current, ...value, followAlongSupportNote: value.follow_along_support_note ?? "" }))} />
      </div>

      <details className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-black text-stone-700">
          Location (optional)
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-[120px_140px_minmax(0,1fr)]">
          <WordPositionField unit={positionUnit} value={draft.pageNumber} onChange={value => setDraft(current => ({ ...current, pageNumber: value }))} />
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">Chapter</span>
            <input value={draft.chapterNumber} onChange={(event) => setDraft((current) => ({ ...current, chapterNumber: event.target.value }))} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.14em] text-stone-400">Chapter name</span>
            <input value={draft.chapterName} onChange={(event) => setDraft((current) => ({ ...current, chapterName: event.target.value }))} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
          </label>
        </div>

      </details>

      <button
        type="button"
        onClick={() => void save()}
        disabled={!canSave || saving}
        className="mt-3 rounded-2xl border border-stone-900 bg-stone-900 px-5 py-3 text-sm font-black text-white hover:bg-black disabled:opacity-50"
      >
        {saving ? savingLabel : saveLabel}
      </button>
    </section>
  );
}
