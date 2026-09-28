"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { bookTypeTitleLabel } from "@/lib/books/bookTypes";
import { ASSESSMENT_DIFFICULTIES, ASSESSMENT_STATUSES, ASSESSMENT_SUITABILITIES } from "@/lib/teacher/readingExperiences";
import { matchesTeachingDiscovery, type DiscoveryBook, type DiscoveryEntry } from "@/lib/teacher/teachingDiscovery";
import { getTeacherBackLink } from "../components/teacherBackLink";

const selectClass = "mt-1 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900";
const badgeClass = "rounded-full border px-2.5 py-1 text-xs font-black";
function statusTone(value: string) {
  if (value === "approved_for_lesson") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "usable" || value === "currently_using") return "border-sky-200 bg-sky-50 text-sky-800";
  if (value === "testing") return "border-violet-200 bg-violet-50 text-violet-800";
  if (value === "use_with_caution") return "border-amber-200 bg-amber-50 text-amber-800";
  if (value === "do_not_use") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-stone-200 bg-stone-50 text-stone-700";
}
function suitabilityLabel(value: string) {
  return value === "excellent" ? "Excellent" : value === "usable" ? "Usable" : "Poor Fit";
}
function BookIdentity({ book }: { book: DiscoveryBook }) {
  return <div className="flex gap-4">
    {book.cover_url ? <img src={book.cover_url} alt="" className="h-28 w-20 shrink-0 rounded-lg object-cover" /> : null}
    <div className="min-w-0"><h3 className="text-lg font-black text-stone-900">{book.title || "Untitled book"}</h3>
      {book.author ? <p className="mt-1 text-sm text-stone-600">{book.author}</p> : null}
      {book.book_type ? <p className="mt-2 text-xs font-semibold text-stone-500">{bookTypeTitleLabel(book.book_type)}</p> : null}
    </div>
  </div>;
}
function AssessmentBadges({ entry }: { entry: DiscoveryEntry }) {
  const difficulties = [...new Set(entry.assessments.map(row => row.teacher_jlpt_difficulty).filter(Boolean))] as string[];
  const suitability = [...new Set(entry.assessments.map(row => row.teaching_suitability).filter(Boolean))] as string[];
  const statuses = [...new Set(entry.assessments.map(row => row.teacher_use_status).filter(Boolean))] as string[];
  return <div className="mt-4 flex flex-wrap gap-2">
    {difficulties.map(value => <span key={value} className={badgeClass + " border-blue-200 bg-blue-50 text-blue-800"}>{value === "above_n1" ? "Above N1" : value.toUpperCase()}</span>)}
    {suitability.map(value => <span key={value} className={badgeClass + " " + (value === "excellent" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : value === "usable" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-amber-200 bg-amber-50 text-amber-800")}>{suitabilityLabel(value)}</span>)}
    {statuses.map(value => <span key={value} className={badgeClass + " " + statusTone(value)}>{ASSESSMENT_STATUSES.find(([key]) => key === value)?.[1] ?? value}</span>)}
  </div>;
}
export default function TeacherDiscoveryPage() {
  const params = useSearchParams();
  const backLink = getTeacherBackLink(params.get("from"));
  const [results, setResults] = useState<DiscoveryEntry[]>([]);
  const [queue, setQueue] = useState<DiscoveryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ query: "", difficulty: "all", suitability: "all", status: "all", format: "all" });
  const [visibleCount, setVisibleCount] = useState(24);
  const [queueCount, setQueueCount] = useState(12);
  const requestNumber = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++requestNumber.current;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Please sign in.");
      const response = await fetch("/api/teacher/teaching-discovery", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load teaching discovery.");
      if (request === requestNumber.current) { setResults(payload.results); setQueue(payload.queue); setError(""); }
    } catch (err) {
      if (request === requestNumber.current) setError(err instanceof Error ? err.message : "Could not load teaching discovery.");
    } finally { if (request === requestNumber.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "teaching-assessment-saved") return;
      try {
        const saved = JSON.parse(event.newValue || "{}");
        setQueue(current => current.filter(book => book.id !== saved.bookId));
      } catch { /* Refresh is authoritative. */ }
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => { requestNumber.current++; window.removeEventListener("focus", onFocus); window.removeEventListener("storage", onStorage); };
  }, [refresh]);
  const formats = useMemo(() => [...new Set(results.map(entry => entry.book.book_type).filter(Boolean))].sort() as string[], [results]);
  const filtered = useMemo(() => results.filter(entry => matchesTeachingDiscovery(entry, filters)), [results, filters]);
  function changeFilter(key: keyof typeof filters, value: string) { setFilters(current => ({ ...current, [key]: value })); setVisibleCount(24); }
  return <main className="mx-auto max-w-6xl px-4 py-8">
    <Link href={backLink.href} className="text-sm font-semibold text-stone-500 hover:text-stone-900">{backLink.label}</Link>
    <header className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Teaching discovery</p>
      <h1 className="mt-2 text-3xl font-black text-stone-900">Find Your Next Teaching Book</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">Discover Japanese books across the MEKURU catalog using teacher-contributed assessments. Books do not need to be in your library.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={badgeClass + " border-stone-200 bg-stone-50 text-stone-600"}>{results.length} books with teaching assessments</span>
        <span className={badgeClass + " border-emerald-200 bg-emerald-50 text-emerald-800"}>{results.reduce((sum, entry) => sum + entry.assessments.length, 0)} assessments</span>
        <a href="#needs-my-assessment" className={badgeClass + " border-blue-200 bg-blue-50 text-blue-800"}>{queue.length} need my assessment</a>
      </div>
    </header>
    {error ? <div role="alert" className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{error} <button type="button" className="underline" onClick={() => void refresh()}>Retry</button></div> : null}
    <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Teaching book search">
      <label className="block text-xs font-black uppercase tracking-wide text-stone-500">Search<input className={selectClass} value={filters.query} onChange={event => changeFilter("query", event.target.value)} placeholder="Search title, author, or ISBN" /></label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-black uppercase tracking-wide text-stone-500">JLPT<select className={selectClass} value={filters.difficulty} onChange={event => changeFilter("difficulty", event.target.value)}><option value="all">All JLPT</option>{ASSESSMENT_DIFFICULTIES.map(value => <option key={value} value={value}>{value === "above_n1" ? "Above N1" : value.toUpperCase()}</option>)}</select></label>
        <label className="text-xs font-black uppercase tracking-wide text-stone-500">Teaching suitability<select className={selectClass} value={filters.suitability} onChange={event => changeFilter("suitability", event.target.value)}><option value="all">All suitability</option>{ASSESSMENT_SUITABILITIES.map(value => <option key={value} value={value}>{suitabilityLabel(value)}</option>)}</select></label>
        <label className="text-xs font-black uppercase tracking-wide text-stone-500">Status<select className={selectClass} value={filters.status} onChange={event => changeFilter("status", event.target.value)}><option value="all">All statuses</option><option value="none">No status</option>{ASSESSMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs font-black uppercase tracking-wide text-stone-500">Format<select className={selectClass} value={filters.format} onChange={event => changeFilter("format", event.target.value)}><option value="all">All formats</option>{formats.map(value => <option key={value} value={value}>{bookTypeTitleLabel(value)}</option>)}</select></label>
      </div>
    </section>
    {loading ? <p className="mt-6 text-sm text-stone-500" role="status">Loading teaching discovery…</p> : <>
      <section className="mt-6 space-y-4" aria-label="Shared teaching book results">
        <h2 className="text-xl font-black">{filtered.length} teaching book results</h2>
        <p className="text-sm text-stone-600">Badges show contributed assessments. Different teachers may report different levels or suitability.</p>
        <div className="grid gap-4 md:grid-cols-2">{filtered.slice(0, visibleCount).map(entry => <article key={entry.book.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <BookIdentity book={entry.book} /><AssessmentBadges entry={entry} />
          <p className="mt-3 text-xs text-stone-500">{entry.assessments.length} teacher assessment{entry.assessments.length === 1 ? "" : "s"}</p>
          <Link href={`/teacher/reading-experiences/${entry.book.id}#overall-teaching-assessment`} className="mt-4 inline-flex rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800 hover:bg-violet-100">My Overall Teaching Assessment</Link>
        </article>)}</div>
        {!filtered.length ? <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{results.length ? "No books match these filters." : "No teaching assessments have been contributed yet."}</p> : null}
        {filtered.length > visibleCount ? <button type="button" className="rounded-xl border px-4 py-2 text-sm" onClick={() => setVisibleCount(value => value + 24)}>Show more results</button> : null}
      </section>
      <section id="needs-my-assessment" className="mt-10 scroll-mt-6 space-y-4 rounded-3xl border border-blue-200 bg-blue-50/30 p-5">
        <h2 className="text-2xl font-black">Needs My Assessment</h2>
        <p className="text-sm text-stone-600">Japanese books in your own library awaiting your Overall Teaching Assessment. Saving an assessment removes the book from this queue, including “Not for Teaching.”</p>
        <div className="grid gap-4 md:grid-cols-2">{queue.slice(0, queueCount).map(book => <article key={book.id} className="rounded-2xl border border-stone-200 bg-white p-4">
          <BookIdentity book={book} />
          <Link href={`/teacher/reading-experiences/${book.id}#overall-teaching-assessment`} className="mt-4 inline-flex rounded-2xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">Assess</Link>
        </article>)}</div>
        {!queue.length ? <p className="text-sm text-stone-600">No books need your assessment.</p> : null}
        {queue.length > queueCount ? <button type="button" className="rounded-xl border bg-white px-4 py-2 text-sm" onClick={() => setQueueCount(value => value + 12)}>Show more books to assess</button> : null}
      </section>
    </>}
  </main>;
}
