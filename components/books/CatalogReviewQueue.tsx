"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { missingCatalogEnrichment } from "@/lib/books/catalogReview";

type Result = { books?: Array<Record<string, any>>; count: number; page: number; pageSize: number };
export default function CatalogReviewQueue({countOnly=false}:{countOnly?:boolean}) {
  const generation=useRef(0);
  const [page,setPage]=useState(0),[reload,setReload]=useState(0);
  const [result,setResult]=useState<Result|null>(null),[error,setError]=useState("");
  const [busy,setBusy]=useState<string|null>(null);
  useEffect(()=>{
    let cancelled=false; let owner:string|undefined;
    generation.current++;
    setResult(null);setError("");
    async function load(){try{
      const {data,error}=await supabase.auth.getSession();
      const session=data.session;owner=session?.user.id;if(error||!session)throw new Error("Please sign in again.");
      const response=await fetch(`/api/books/catalog-review?page=${page}${countOnly?'&countOnly=1':''}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});
      const body=await response.json();if(!response.ok)throw new Error(body.error);
      if(!cancelled) {
        if(!countOnly && page>0 && body.books.length===0) {setPage(Math.max(0,Math.ceil(body.count/body.pageSize)-1));return;}
        setResult(body);
      }
    }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Could not load review queue.");}}
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(owner!==undefined && session?.user.id!==owner){cancelled=true;generation.current++;setResult(null);setBusy(null);setReload(n=>n+1);}});
    void load();return()=>{cancelled=true;generation.current++;subscription.unsubscribe();};
  },[page,reload,countOnly]);
  async function markReviewed(bookId:string){
    const version=generation.current;
    setBusy(bookId);setError("");
    try {
      const {data,error}=await supabase.auth.getSession();if(error||!data.session)throw new Error("Please sign in again.");
      const response=await fetch('/api/books/catalog-review',{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({bookId})});
      const body=await response.json();if(!response.ok)throw new Error(body.error);
      if(version===generation.current)setReload(n=>n+1);
    }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:"Could not mark reviewed.");}finally{if(version===generation.current)setBusy(null);}
  }
  const title=`New Books to Review — ${result ? result.count : error ? 'Count unavailable' : 'Loading…'}`;
  return <section className="my-4 rounded-2xl border border-[var(--appearance-border)] bg-[var(--appearance-surface)] p-5 text-[var(--appearance-text)]">
    {countOnly?<Link href="/teacher/books/new-review" className="text-xl font-bold underline">{title}</Link>:<h1 className="text-2xl font-bold">{title}</h1>}
    <p className="mt-2 text-sm">Reader-added catalog books remain here until explicitly marked Reviewed. Readers can already use their books.</p>
    {error&&<p role="alert" className="mt-3">{error} <button className="underline" onClick={()=>setReload(n=>n+1)}>Retry</button></p>}
    {!countOnly&&result&&<>
      {result.books?.length===0&&<p className="mt-4">No new books are awaiting review.</p>}
      {result.books?.map(book=><article key={book.id} className="mt-4 rounded-xl border border-[var(--appearance-border)] p-4">
        <h2 className="font-bold">{book.title||'Untitled book'}</h2>
        <p>{book.author||'Author not listed'} · {book.language_code} · {book.edition_format}</p>
        <p className="text-sm">ISBN: {book.isbn13||'—'} · ASIN: {book.asin||'—'}</p>
        <p className="text-sm">Added: {book.created_at ? new Date(book.created_at).toLocaleDateString(): '—'}</p>
        <p className="mt-2">{missingCatalogEnrichment(book).length?`Missing enrichment: ${missingCatalogEnrichment(book).join(', ')}.`:'Key enrichment fields are present; catalog review is still pending.'}</p>
        <div className="mt-3 flex flex-wrap gap-4"><Link className="underline" href={`/teacher/books/add?bookId=${encodeURIComponent(book.id)}`}>Open Catalog Editor</Link>
        <button disabled={busy!==null} className="rounded-lg border border-[var(--appearance-border)] px-3 py-2 disabled:opacity-50" onClick={()=>void markReviewed(book.id)}>{busy===book.id?'Saving…':'Mark Reviewed'}</button></div>
      </article>)}
      <nav className="mt-4 flex gap-4" aria-label="Review queue pages"><button disabled={page===0||busy!==null} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1}</span><button disabled={(page+1)*result.pageSize>=result.count||busy!==null} onClick={()=>setPage(p=>p+1)}>Next</button></nav>
    </>}
  </section>;
}
