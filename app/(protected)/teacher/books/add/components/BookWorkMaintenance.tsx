"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { BookWork, BookWorkContext, WorkEdition } from "@/lib/books/bookWorks";

type Candidate = WorkEdition & { work: BookWork | BookWork[] | null };
async function requestWork(query = "", body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in.");
  const response = await fetch(`/api/admin/book-works${query}`, {
    method: body ? "POST" : "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not load work linkage.");
  return result;
}
function editionLabel(edition: WorkEdition) {
  return [edition.edition_format?.replace(/_/g, " "), edition.edition_note,
    edition.isbn13 ? `ISBN ${edition.isbn13}` : null, edition.asin ? `ASIN ${edition.asin}` : null,
    edition.language_code].filter(Boolean).join(" · ") || "Edition details not set";
}
export default function BookWorkMaintenance({ bookId }: { bookId: string }) {
  const [context, setContext] = useState<BookWorkContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [kind, setKind] = useState<"works" | "editions">("works");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(BookWork | Candidate)[]>([]);
  const [more, setMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const generation = useRef(0);
  async function reload() {
    setLoading(true); generation.current++; setSearching(false); setResults([]); setMore(false); setKind("works");
    try {
      const next: BookWorkContext = await requestWork(`?bookId=${encodeURIComponent(bookId)}`);
      setContext(next); setTitle(next.edition.title ?? ""); setAuthor(next.edition.author ?? "");
    } catch (error) { setContext(null); throw error; }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    requestWork(`?bookId=${encodeURIComponent(bookId)}`).then((next: BookWorkContext) => {
      if (active) { setContext(next); setTitle(next.edition.title ?? ""); setAuthor(next.edition.author ?? ""); }
    }).catch(error => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; generation.current++; };
  }, [bookId]);
  async function search() {
    const version = ++generation.current;
    setSearching(true); setMessage(""); setResults([]); setMore(false);
    try {
      const result = await requestWork(`?${new URLSearchParams({ kind, q: query })}`);
      if (version === generation.current) { setResults(result.items); setMore(result.more); if (!result.items.length) setMessage("No matches. Try another title, author or identifier."); }
    } catch (error) { if (version === generation.current) setMessage(error instanceof Error ? error.message : "Search failed."); }
    finally { if (version === generation.current) setSearching(false); }
  }
  async function change(edition: WorkEdition, action: "create" | "link" | "unlink", destination?: BookWork, oldWork?: BookWork | null) {
    const from = edition.work_id ? `${oldWork?.title || "Work"} (${edition.work_id})` : "Unlinked";
    const to = action === "create" ? `new work “${title.trim()}”` : action === "unlink" ? "Unlinked" : `“${destination?.title}” (${destination?.id})`;
    if (!window.confirm(`${edition.title || "Untitled edition"}\n${editionLabel(edition)}\nEdition ID: ${edition.id}\n\nCurrent work: ${from}\nChange to: ${to}\n\n${action === "unlink" ? "Remove only this work link? The edition will remain." : "Confirm that this edition belongs to this underlying work. Search similarity is not proof."}`)) return;
    setBusy(true); setMessage(""); generation.current++; setSearching(false);
    try {
      await requestWork("", { action, bookId: edition.id, expectedWorkId: edition.work_id, confirmed: true,
        ...(action === "link" ? { workId: destination!.id } : {}), ...(action === "create" ? { title, author } : {}) });
      setResults([]); setMore(false);
      await reload(); setMessage("Work link saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the work link."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5" aria-labelledby="work-maintenance-title">
    <h2 id="work-maintenance-title" className="text-lg font-bold">Work · edition linkage</h2>
    <button type="button" disabled={busy || loading} className="mt-1 text-xs underline disabled:opacity-50" onClick={() => void reload().catch(error => setMessage(error.message))}>Reload work information</button>
    <p className="mt-1 text-sm text-stone-600">Explicitly group editions of the same underlying work. Each edition keeps its own identifiers, pagination and reader data.</p>
    {message ? <p role="status" className="mt-3 text-sm text-stone-700">{message}</p> : null}
    {loading ? <p className="mt-3 text-sm">Loading work…</p> : !context ? <button type="button" className="mt-3 text-sm underline" onClick={() => void reload().catch(error => setMessage(error.message))}>Reload work information</button> : <fieldset disabled={busy} className="mt-4 space-y-4 disabled:opacity-60">
      <div>
        <p className="text-sm"><strong>Work:</strong> {context.work ? `${context.work.title}${context.work.author ? ` — ${context.work.author}` : ""}` : "Not linked"}</p>
        {context.work ? <>
          <p className="mt-1 break-all text-xs text-stone-500">Work ID: {context.work.id}</p>
          <button type="button" className="mt-2 text-xs font-semibold underline" onClick={() => void change(context.edition, "unlink", undefined, context.work)}>Remove this edition’s work link</button>
          <h3 className="mt-4 text-sm font-semibold">Editions in this work</h3>
          <ul className="mt-2 space-y-2">{context.editions.map(edition => <li key={edition.id} className="rounded-lg bg-stone-50 p-2 text-sm">
            <Link className="underline" href={`/teacher/books/add?bookId=${encodeURIComponent(edition.id)}`}>{edition.title || "Untitled edition"}</Link>
            {edition.id === bookId ? <span className="ml-2 font-semibold">Current edition</span> : null}
            <p className="text-xs text-stone-600">{editionLabel(edition)}</p>
          </li>)}</ul>
        </> : <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold">Create work from this edition</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Work display title<input className="mt-1 w-full rounded border p-2" value={title} maxLength={500} onChange={event => setTitle(event.target.value)} /></label>
            <label className="text-sm">Work display author (optional)<input className="mt-1 w-full rounded border p-2" value={author} maxLength={500} onChange={event => setAuthor(event.target.value)} /></label>
          </div>
          <button type="button" disabled={!title.trim()} className="mt-3 rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={() => void change(context.edition, "create")}>Create work and link this edition…</button>
        </details>}
      </div>
      <div className="border-t pt-4">
        <label className="text-sm font-semibold">Find
          <select className="ml-2 rounded border p-1" value={kind} onChange={event => { generation.current++; setSearching(false); setKind(event.target.value as typeof kind); setResults([]); setMore(false); }}>
            <option value="works">Existing work for this edition</option>
            {context.work ? <option value="editions">Another edition to add to this work</option> : null}
          </select>
        </label>
        <div className="mt-2 flex gap-2">
          <input aria-label={kind === "works" ? "Search works by title or author" : "Search editions by title, author, ISBN or ASIN"} className="min-w-0 flex-1 rounded border p-2 text-sm" value={query} maxLength={120} onChange={event => { generation.current++; setSearching(false); setResults([]); setMore(false); setQuery(event.target.value); }} />
          <button type="button" disabled={!query.trim() || searching} className="rounded border px-3 text-sm disabled:opacity-50" onClick={() => void search()}>{searching ? "Searching…" : "Search"}</button>
        </div>
        <p className="mt-1 text-xs text-stone-500">Search only finds candidates. Linking always requires your explicit confirmation.</p>
        <ul className="mt-3 space-y-2">{results.map(result => {
          const edition = "work_id" in result ? result as Candidate : null;
          const linkedWork = edition ? Array.isArray(edition.work) ? edition.work[0] : edition.work : null;
          const alreadyLinked = edition ? edition.work_id === context.work?.id : result.id === context.work?.id;
          return <li key={result.id} className="rounded border p-3 text-sm">
            <p className="font-semibold">{result.title || "Untitled"}{result.author ? ` — ${result.author}` : ""}</p>
            <p className="break-all text-xs text-stone-500">{edition ? "Edition" : "Work"} ID: {result.id}</p>
            {edition ? <><p className="text-xs">{editionLabel(edition)}</p><p className="text-xs">Current work: {linkedWork ? `${linkedWork.title} (${linkedWork.id})` : edition.work_id || "Unlinked"}</p></> : null}
            {alreadyLinked ? <p className="mt-1 text-xs">Already linked</p> : <button type="button" className="mt-2 font-semibold underline" onClick={() => void (edition && context.work ? change(edition, "link", context.work, linkedWork) : change(context.edition, "link", result as BookWork, context.work))}>{edition ? edition.work_id ? "Move edition to this work…" : "Link edition to this work…" : context.work ? "Change this edition’s work…" : "Link this edition to work…"}</button>}
          </li>;
        })}</ul>
        {more ? <p className="mt-2 text-xs">Showing the first 25 matches. Refine your search to find a specific work or edition.</p> : null}
      </div>
    </fieldset>}
  </section>;
}
