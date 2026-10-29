"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { READER_FORMAT_OPTIONS, READER_LANGUAGE_OPTIONS, parseReaderSearch, readerLanguage } from "@/lib/books/readerAddBook";
import AddBookCatalogResult from "./AddBookCatalogResult";

type Match = { id: string; title: string | null; author: string | null; cover_url: string | null; book_type: string | null; isbn13: string | null; asin: string | null; language_code?: string | null; edition_format?: string | null; edition_note?: string | null };
const asMatch = (book: any): Match => ({ ...book, book_type: book.book_type ?? null, isbn13: book.isbn13 ?? null, asin: book.asin ?? null });
const panel = "rounded-2xl border border-[var(--appearance-border)] bg-[var(--appearance-surface)] p-5 sm:p-6";
const field = "w-full min-w-0 rounded-xl border border-[var(--appearance-border)] bg-[var(--appearance-surface)] px-3 py-3 text-base text-[var(--appearance-text)]";
const primary = "rounded-xl bg-[var(--appearance-accent)] px-5 py-3 font-semibold text-white disabled:opacity-50";

export default function ReaderAddBook({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Match[]>([]);
  const [searched, setSearched] = useState(false);
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState("");
  const [languageChoice, setLanguageChoice] = useState("");
  const [otherLanguage, setOtherLanguage] = useState("");
  const [format, setFormat] = useState("");
  const [identifier, setIdentifier] = useState<{ isbn13?: string; asin?: string }>({});
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [possibleMatches, setPossibleMatches] = useState<Match[]>([]);
  const [retryBookId, setRetryBookId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [accountChanged, setAccountChanged] = useState(false);
  const version = useRef(0);
  const mounted = useRef(true);
  const locked = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id !== ownerId) {
        version.current++;
        setResults([]); setPossibleMatches([]); setManual(false); setRetryBookId(null);
        setMetadata({}); setIdentifier({}); setTitle(""); setQuery("");
        setAccountChanged(true); setBusy(false);
      }
    });
    return () => { mounted.current = false; version.current++; subscription.unsubscribe(); };
  }, [ownerId]);
  const current = (id: number) => mounted.current && version.current === id;
  async function token() {
    const { data, error } = await supabase.auth.getSession();
    if (error || data.session?.user.id !== ownerId || !data.session.access_token) throw new Error("Your session changed. Return to your Library and try again.");
    return data.session.access_token;
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    if (locked.current || accountChanged) return;
    const parsed = parseReaderSearch(query);
    const id = ++version.current;
    setResults([]); setPossibleMatches([]); setRetryBookId(null); setMetadata({}); setIdentifier({});
    setManual(false); setTitle(""); setLanguageChoice(""); setOtherLanguage(""); setFormat(""); setMessage("");
    setSearched(true);
    if (parsed.kind === "invalid") { setMessage(parsed.message); return; }
    locked.current = true; setBusy(true);
    try {
      const access = await token();
      if (!current(id)) return;
      if (parsed.kind === "title") {
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(parsed.title)}&preserveEditions=1`, { headers: { Authorization: `Bearer ${access}` } });
        const data = await response.json();
        if (!current(id)) return;
        if (!response.ok) throw new Error("Search could not finish. Please retry, or add the book below.");
        setResults((data.books ?? []).map(asMatch)); setTitle(parsed.title);
        if (!data.books?.length) setManual(true);
      } else if (parsed.kind === "asin") {
        const { data, error } = await supabase.from("books").select("id,title,author,cover_url,language_code,edition_format,edition_note,asin").ilike("asin", parsed.asin).limit(1).maybeSingle();
        if (!current(id)) return;
        if (error) throw new Error("Search could not finish. Please retry.");
        if (data) setResults([asMatch(data)]);
        else { setIdentifier({ asin: parsed.asin }); setManual(true); }
      } else {
        setIdentifier({ isbn13: parsed.isbn13 });
        const response = await fetch(`/api/books/lookup-isbn?isbn=${parsed.isbn13}`, { headers: { Authorization: `Bearer ${access}` } });
        const data = await response.json();
        if (!current(id)) return;
        if (!response.ok && response.status !== 404) throw new Error("ISBN lookup could not finish. You can retry or add the book below.");
        const book = data.book;
        if (book?.existing_book_id) setResults([asMatch({ ...book, id: book.existing_book_id, author: book.author_display })]);
        else {
          setManual(true); setTitle(book?.title ?? "");
          const code = readerLanguage(book?.language_code);
          setLanguageChoice(code === "ja" || code === "en" ? code : code ? "another" : "");
          setOtherLanguage(code && !["ja", "en"].includes(code) ? code : "");
          setMetadata({ author: book?.author_display, coverUrl: book?.cover_url, publisher: book?.publisher, publishedDate: book?.published_date, pageCount: book?.page_count });
        }
      }
    } catch (error: any) { if (current(id)) setMessage(error.message ?? "Search could not finish. Please retry."); }
    finally { locked.current = false; if (current(id)) setBusy(false); }
  }
  async function add(existingId?: string, confirmDifferentEdition = false) {
    if (locked.current || accountChanged) return;
    locked.current = true; const id = ++version.current; setBusy(true); setMessage("");
    try {
      const access = await token();
      if (!current(id)) return;
      const bookId = existingId ?? retryBookId;
      const response = await fetch(bookId ? "/api/books/add-existing" : "/api/books/reader", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
        body: JSON.stringify(bookId ? { bookId } : { title, languageCode: languageChoice === "another" ? otherLanguage : languageChoice, editionFormat: format, ...identifier, metadata, confirmDifferentEdition }),
      });
      const data = await response.json();
      if (!current(id)) return;
      if (response.status === 409 && data.requiresConfirmation) { setPossibleMatches(data.possibleMatches.map(asMatch)); setMessage(data.error); return; }
      if (!response.ok) {
        if (data.createdBookId) setRetryBookId(data.createdBookId);
        throw new Error(data.error ?? "Could not add this book. Please retry.");
      }
      if (!data.userBookId) throw new Error("Could not open the Library entry. Please retry.");
      await token(); // Account may have changed while persistence completed.
      if (current(id)) router.push(`/books/${encodeURIComponent(data.userBookId)}`);
    } catch (error: any) { if (current(id)) setMessage(error.message ?? "Could not add this book. Please retry."); }
    finally { locked.current = false; if (current(id)) setBusy(false); }
  }
  function openManual() {
    setManual(true); setPossibleMatches([]);
    const parsed = parseReaderSearch(query);
    if (parsed.kind === "title") setTitle(parsed.title);
  }
  if (accountChanged) return <main className="mx-auto max-w-3xl px-4 py-8"><p role="alert">Your session changed. Return to your Library to add a book.</p><Link href="/books" className="underline">My Library</Link></main>;
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 text-[var(--appearance-text)]">
    <Link href="/books" className="text-sm underline">← My Library</Link>
    <header><h1 className="text-3xl font-bold">Add a Book</h1><p className="mt-2 text-[var(--appearance-muted-text)]">Find your book, or add the details you know and start reading.</p></header>
    <form onSubmit={search} className={panel}>
      <label htmlFor="reader-book-search" className="mb-2 block font-semibold">Title, ISBN, or book URL</label>
      <div className="flex flex-col gap-3 sm:flex-row"><input id="reader-book-search" type="search" value={query} onChange={event => setQuery(event.target.value)} disabled={busy} required className={field} placeholder="Search for a book" /><button className={primary} disabled={busy}>Search</button></div>
      <p className="mt-3 text-sm text-[var(--appearance-muted-text)]">Book links from Amazon, Open Library, or Google Books with an ISBN are supported. You can always add a book by title.</p>
    </form>
    {busy && <p role="status">Please wait…</p>}
    {message && <p role="alert" className={panel}>{message}</p>}
    {results.length > 0 && <section aria-label="Catalog matches" className="space-y-3">{results.map(book => <AddBookCatalogResult key={book.id} result={book} missingFields={[]} adding={false} disabled={busy} requestLoading={false} addLabel="Add to My Library" onAdd={() => void add(book.id)} onRequestReview={() => {}} />)}</section>}
    {searched && !manual && <button type="button" disabled={busy} onClick={openManual} className="rounded-xl border border-[var(--appearance-border)] px-4 py-3 font-semibold">Not your book? Add a new book</button>}
    {manual && <form onSubmit={event => { event.preventDefault(); void add(); }} className={panel}>
      <h2 className="text-xl font-bold">Add your book</h2><p className="mt-2 text-sm text-[var(--appearance-muted-text)]">Just these details are enough to get started. A cover, author, ISBN, and page count can be added later.</p>
      <fieldset disabled={busy || !!retryBookId} className="mt-5 space-y-4">
        <label className="block">Title<input value={title} onChange={event => { setTitle(event.target.value); setPossibleMatches([]); }} required maxLength={1000} className={`mt-2 ${field}`} /></label>
        <label className="block">Book language<select value={languageChoice} onChange={event => { setLanguageChoice(event.target.value); setPossibleMatches([]); }} required className={`mt-2 ${field}`}><option value="">Choose language</option><option value="ja">Japanese</option><option value="en">English</option><option value="another">Another language</option></select></label>
        {languageChoice === "another" && <label className="block">Other supported language<select value={otherLanguage} onChange={event => { setOtherLanguage(event.target.value); setPossibleMatches([]); }} required className={`mt-2 ${field}`}><option value="">Choose language</option>{READER_LANGUAGE_OPTIONS.filter(option => !["ja", "en"].includes(option.code)).map(option => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>}
        <label className="block">Format<select value={format} onChange={event => { setFormat(event.target.value); setPossibleMatches([]); }} required className={`mt-2 ${field}`}><option value="">Choose format</option>{READER_FORMAT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </fieldset>
      <button disabled={busy} className={`mt-5 ${primary}`}>{retryBookId ? "Retry adding to My Library" : "Add to My Library"}</button>
      {possibleMatches.length > 0 && <section aria-label="Possible existing editions" className="mt-5 space-y-3"><p>Choose a matching edition, or confirm that yours is different.</p>{possibleMatches.map(book => <AddBookCatalogResult key={book.id} result={book} missingFields={[]} adding={false} disabled={busy} requestLoading={false} addLabel="Add this edition" onAdd={() => void add(book.id)} onRequestReview={() => {}} />)}<button type="button" disabled={busy} onClick={() => void add(undefined, true)} className="rounded-xl border border-[var(--appearance-border)] px-4 py-3 font-semibold">Mine is a different edition — add it</button></section>}
    </form>}
  </main>;
}
