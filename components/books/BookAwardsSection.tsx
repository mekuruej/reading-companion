"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  COMMON_BOOK_AWARDS, BOOK_AWARD_RESULTS, bookAwardSourceUrl,
  normalizeBookAwards, validateBookAwards, type BookAward,
} from "@/lib/books/bookAwards";

const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const buttonClass = "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-50";

// Mount with key={bookId} so a book change discards any outstanding edit state.
export default function BookAwardsSection({ bookId, canEdit = false, className = "" }: {
  bookId: string;
  canEdit?: boolean;
  className?: string;
}) {
  const [awards, setAwards] = useState<BookAward[]>([]);
  const [draft, setDraft] = useState<BookAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error } = await supabase.from("books").select("awards").eq("id", bookId).single();
        if (error) throw error;
        if (!cancelled) setAwards(normalizeBookAwards(data.awards));
      } catch {
        if (!cancelled) setLoadError("Awards could not be loaded. Please reload the page to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [bookId]);

  function update(index: number, patch: Partial<BookAward>) {
    setDraft((previous) => previous.map((award, i) => i === index ? { ...award, ...patch } : award));
  }

  async function save() {
    if (!canEdit || saving) return;
    const validationError = validateBookAwards(draft);
    if (validationError) { setSaveError(validationError); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const nextAwards = normalizeBookAwards(draft);
      const { data, error } = await supabase.from("books")
        .update({ awards: nextAwards }).eq("id", bookId).select("awards").single();
      if (error) throw error;
      setAwards(normalizeBookAwards(data.awards));
      setEditing(false);
    } catch {
      setSaveError("Awards could not be saved. Your edits are still here; please try again.");
    } finally {
      setSaving(false);
    }
  }

  function fields(award: BookAward, index: number) {
    return (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-stone-700">
          Year (optional)
          <input className={inputClass} value={award.year} inputMode="numeric" maxLength={4}
            onChange={(event) => update(index, { year: event.target.value })} />
        </label>
        {award.kind === "award" ? (
          <label className="block text-sm text-stone-700">
            Result
            <select className={inputClass} value={award.result}
              onChange={(event) => update(index, { result: event.target.value as BookAward["result"] })}>
              {Object.entries(BOOK_AWARD_RESULTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        ) : <p className="self-center text-sm text-stone-600">Selected book</p>}
        <label className="block text-sm text-stone-700">
          {award.kind === "selection" ? "School level / category (optional)" : "Category / rank / round (optional)"}
          <input className={inputClass} value={award.detail}
            placeholder={award.kind === "selection" ? "e.g. Elementary school, lower grades" : "e.g. 2nd place, translation category"}
            onChange={(event) => update(index, { detail: event.target.value })} />
        </label>
        <label className="block text-sm text-stone-700">
          Source link (optional)
          <input className={inputClass} type="url" placeholder="https://..." value={award.source_url}
            onChange={(event) => update(index, { source_url: event.target.value })} />
        </label>
      </div>
    );
  }

  if (!canEdit && (loading || (!loadError && awards.length === 0))) return null;

  return (
    <section className={`rounded-2xl border border-stone-200 bg-stone-50 p-4 ${className}`} aria-label="Awards and selections">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-900">Awards &amp; Selections</h2>
        {canEdit && !loading && !loadError && !editing ? (
          <button type="button" className={buttonClass} onClick={() => { setDraft(awards.map((award) => ({ ...award }))); setSaveError(null); setEditing(true); }}>Edit awards</button>
        ) : null}
      </div>
      {loading ? <p className="text-sm text-stone-500">Loading awards…</p> : null}
      {loadError ? <p role="alert" className="text-sm text-red-700">{loadError}</p> : null}
      {editing && canEdit ? (
        <>
          <p className="mb-4 text-sm text-stone-600">Select the awards or reading selections associated with this book. Saved entries appear on About this book.</p>
          <fieldset disabled={saving} className="space-y-4">
            <legend className="mb-2 text-sm font-semibold text-stone-900">Common awards &amp; selections</legend>
            {COMMON_BOOK_AWARDS.map((preset) => {
              const index = draft.findIndex((award) => award.id === preset.id);
              return (
                <div key={preset.id} className="rounded-xl border border-stone-200 bg-white p-3">
                  <label className="flex items-start gap-2 text-sm font-semibold text-stone-800">
                    <input type="checkbox" className="mt-1" checked={index >= 0} onChange={(event) => {
                      if (event.target.checked) setDraft((previous) => [...previous, { ...preset, year: "", result: preset.kind === "selection" ? "selected" : "winner", detail: "", source_url: "" }]);
                      else setDraft((previous) => previous.filter((award) => award.id !== preset.id));
                    }} />
                    {preset.name}
                  </label>
                  {preset.id === "kadai_tosho" ? <p className="mt-1 text-xs text-stone-500">青少年読書感想文全国コンクール — a reading selection, rather than an award for the book.</p> : null}
                  {index >= 0 ? fields(draft[index], index) : null}
                </div>
              );
            })}
          </fieldset>
          <fieldset disabled={saving} className="mt-5 space-y-3">
            <legend className="mb-2 text-sm font-semibold text-stone-900">Other awards &amp; selections</legend>
            {draft.map((award, index) => COMMON_BOOK_AWARDS.some((preset) => preset.id === award.id) ? null : (
              <div key={award.id || index} className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-stone-700">Name
                    <input className={inputClass} value={award.name} onChange={(event) => update(index, { name: event.target.value })} />
                  </label>
                  <label className="text-sm text-stone-700">Type
                    <select className={inputClass} value={award.kind} onChange={(event) => {
                      const kind = event.target.value as BookAward["kind"];
                      update(index, { kind, result: kind === "selection" ? "selected" : "winner" });
                    }}>
                      <option value="award">Award</option><option value="selection">Reading selection</option>
                    </select>
                  </label>
                </div>
                {fields(award, index)}
                <button type="button" className={`${buttonClass} mt-3`} aria-label={`Remove ${award.name || "unnamed award"}`}
                  onClick={() => setDraft((previous) => previous.filter((_, i) => i !== index))}>Remove</button>
              </div>
            ))}
            <button type="button" className={buttonClass} onClick={() => setDraft((previous) => [...previous, {
              id: `custom_${crypto.randomUUID()}`, name: "", kind: "award", year: "", result: "winner", detail: "", source_url: "",
            }])}>Add another award or selection</button>
          </fieldset>
          {saveError ? <p role="alert" className="mt-3 text-sm text-red-700">{saveError}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={buttonClass} disabled={saving} onClick={() => { setEditing(false); setSaveError(null); }}>Cancel</button>
            <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving…" : "Save awards"}</button>
          </div>
        </>
      ) : !loading && !loadError ? (
        awards.length > 0 ? <ul className="grid gap-3 sm:grid-cols-2">
          {awards.map((award, index) => {
            const source = bookAwardSourceUrl(award.source_url);
            return (
              <li key={`${award.id}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-stone-900">{award.name}</h3>
                <p className="mt-1 text-sm text-stone-700">{[award.year, BOOK_AWARD_RESULTS[award.result], award.detail].filter(Boolean).join(" · ")}</p>
                {source ? <a href={source} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-blue-700 underline">Source ↗</a> : null}
              </li>
            );
          })}
        </ul> : <p className="text-sm text-stone-500">No awards or selections added yet.</p>
      ) : null}
    </section>
  );
}
