"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Match = { id: string; title: string | null; author: string | null; isbn13: string | null; asin: string | null };

export function TeacherBookTitleSearch({ title, sourceQuerySuffix }: { title: string; sourceQuerySuffix: string }) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  useEffect(() => {
    version.current += 1;
    setMatches(null);
    setError("");
    setLoading(false);
    return () => { version.current += 1; };
  }, [title]);

  async function search() {
    const query = title.trim();
    if (!query) return;
    const request = ++version.current;
    setLoading(true);
    setMatches(null);
    setError("");
    try {
      const literal = query.replace(/[\\%_]/g, "\\$&");
      const { data, error } = await supabase.from("books")
        .select("id, title, author, isbn13, asin")
        .ilike("title", `%${literal}%`).order("title").limit(25);
      if (request !== version.current) return;
      if (error) throw error;
      setMatches(data ?? []);
    } catch {
      if (request === version.current) setError("Could not search the catalog. Please try again.");
    } finally {
      if (request === version.current) setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <button type="button" onClick={() => void search()} disabled={loading || !title.trim()}
        className="rounded-2xl bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800 disabled:opacity-50">
        {loading ? "Searching catalog..." : "Find by title to edit"}
      </button>
      <div aria-live="polite">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {matches?.length === 0 ? <p className="text-sm text-stone-600">No matching catalog books. Try a shorter part of the title, or create a new entry below.</p> : null}
        {matches && matches.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-stone-600">Choose the edition to edit.{matches.length === 25 ? " Showing the first 25 matches; narrow the title if needed." : ""}</p>
            {matches.map(book => (
              <div key={book.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3">
                <div className="min-w-0 flex-1 break-words">
                  <p className="font-semibold">{book.title || "Untitled book"}</p>
                  <p className="text-sm text-stone-600">{book.author || "Author not listed"}</p>
                  <p className="text-xs text-stone-500">{book.isbn13 ? `ISBN: ${book.isbn13}` : book.asin ? `ASIN: ${book.asin}` : "No ISBN or ASIN"}</p>
                </div>
                <Link href={`/teacher/books/add?bookId=${encodeURIComponent(book.id)}${sourceQuerySuffix}`}
                  aria-label={`Edit ${book.title || "untitled book"}`}
                  className="rounded-xl border border-sky-300 px-4 py-2 font-semibold text-sky-800 hover:bg-sky-50">Edit</Link>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
