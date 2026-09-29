"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EDITION_FORMAT_OPTIONS } from "@/lib/books/bookMetadata";

type Edition = {
  id: string; title: string | null; author: string | null; language_code: string | null;
  edition_format: string | null; edition_note: string | null; isbn13: string | null;
  asin: string | null; publisher: string | null; published_date: string | null;
  page_count: number | null; kindle_location_count: number | null;
  audiobook_duration_minutes: number | null; updated_at: string;
};
type Counts = { total: number; valid: number; missing: number; legacy: number };

async function requestQueue(method = "GET", changes?: unknown[]) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  const response = await fetch("/api/admin/book-formats", {
    method, cache: "no-store",
    headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
    ...(changes ? { body: JSON.stringify({ changes }) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not load format corrections.");
  return result;
}

export default function FormatCleanupPage() {
  const [items, setItems] = useState<Edition[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true); setMessage("");
    try {
      const result = await requestQueue();
      setItems(result.items); setCounts(result.counts); setDrafts({}); setErrors({});
    } catch (error) { setMessage((error as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const selected = items.filter(item => drafts[item.id]);
  const filtered = items.filter(item => [item.title, item.author, item.isbn13, item.asin, item.language_code]
    .some(value => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));

  async function save() {
    setSaving(true); setMessage(""); setErrors({});
    try {
      const result: { saved: string[]; failed: { id: string; message: string }[] } = await requestQueue("PATCH", selected.map(item => ({
        id: item.id, format: drafts[item.id], previousFormat: item.edition_format, updatedAt: item.updated_at,
      })));
      const saved = new Set(result.saved);
      const removedMissing = items.filter(item => saved.has(item.id) && !item.edition_format?.trim()).length;
      setItems(previous => previous.filter(item => !saved.has(item.id)));
      setDrafts(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !saved.has(id))));
      setCounts(previous => previous ? { ...previous, valid: previous.valid + saved.size,
        missing: previous.missing - removedMissing, legacy: previous.legacy - (saved.size - removedMissing) } : null);
      setErrors(Object.fromEntries(result.failed.map(item => [item.id, item.message])));
      setMessage(`${saved.size} correction${saved.size === 1 ? "" : "s"} saved.${result.failed.length ? ` ${result.failed.length} need attention below.` : ""}`);
    } catch (error) { setMessage((error as Error).message); }
    finally { setSaving(false); }
  }

  return <main className="mx-auto max-w-6xl px-4 py-8">
    <Link href="/teacher/general-upkeep" className="text-sm font-semibold text-stone-500">← Back to Site Upkeep</Link>
    <h1 className="mt-4 text-3xl font-black">Missing / Legacy Formats</h1>
    <p className="mt-2 text-sm text-stone-600">Repair shared edition formats inline. Check the edition details, choose a format, then save your selections. Nothing is guessed or saved automatically.</p>
    {counts ? <p className="mt-3 text-sm">{counts.missing} missing · {counts.legacy} legacy / unrecognized · {counts.valid} valid · {counts.total} catalog editions</p> : null}
    <div className="sticky top-0 z-10 mt-5 flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
      <input aria-label="Search editions" placeholder="Title, author, ISBN, ASIN, or language" value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 rounded-xl border p-2" />
      <button disabled={loading || saving || selected.length === 0 || selected.length > 100} onClick={() => void save()} className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : `Save Changes (${selected.length})`}</button>
      <button disabled={loading || saving || selected.length > 0} onClick={() => void load()} className="rounded-xl border px-3 py-2 disabled:opacity-50">Reload queue</button>
    </div>
    <p className="mt-2 text-xs text-stone-500">{selected.length} unsaved selection{selected.length === 1 ? "" : "s"}, including any hidden by search. Save up to 100 at a time. Clear selections to reload.</p>
    {message ? <p role="status" className="mt-4 rounded-xl border bg-stone-50 p-3 text-sm">{message}</p> : null}
    {loading ? <p className="mt-6">Loading editions…</p> : counts && !items.length ? <p className="mt-6">All catalog editions have a valid format.</p> : null}
    {!loading && items.length > 0 && filtered.length === 0 ? <p className="mt-6">No editions match this search.</p> : null}
    <div className="mt-5 space-y-3">{!loading && filtered.map(item => <section key={item.id} className="grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_240px]">
      <div className="min-w-0">
        <h2 className="break-words font-bold">{item.title || "Untitled"}</h2>
        <p className="text-sm text-stone-600">{item.author || "Author not recorded"} · {item.language_code || "Language not recorded"}</p>
        <p className="mt-2 break-words text-sm">{[item.isbn13 && `ISBN ${item.isbn13}`, item.asin && `ASIN ${item.asin}`, item.publisher, item.published_date].filter(Boolean).join(" · ") || "No identifiers or publication details recorded"}</p>
        {item.edition_note ? <p className="mt-1 text-sm">Edition note: {item.edition_note}</p> : null}
        <p className="mt-1 text-sm text-stone-600">{[item.page_count && `${item.page_count} pages`, item.kindle_location_count && `${item.kindle_location_count} Kindle locations`, item.audiobook_duration_minutes && `${item.audiobook_duration_minutes} audio minutes`].filter(Boolean).join(" · ") || "No progress totals recorded"}</p>
        <p className="mt-1 break-all text-xs text-stone-400">Edition ID: {item.id}</p>
      </div>
      <div>
        <p className="mb-2 text-xs text-stone-500">Current: {item.edition_format === null ? "Missing (NULL)" : item.edition_format.trim() ? JSON.stringify(item.edition_format) : "Empty"}</p>
        <label className="text-sm font-semibold">Format
          <select aria-label={`Format for ${item.title || "this edition"}`} disabled={saving} value={drafts[item.id] ?? ""} onChange={event => setDrafts(previous => ({ ...previous, [item.id]: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white p-2">
            <option value="">Leave unresolved</option>
            {EDITION_FORMAT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {drafts[item.id] ? <p className="mt-2 text-xs font-semibold text-amber-700">Unsaved selection</p> : null}
        {errors[item.id] ? <p role="alert" className="mt-2 text-sm text-red-700">{errors[item.id]}</p> : null}
      </div>
    </section>)}</div>
  </main>;
}
