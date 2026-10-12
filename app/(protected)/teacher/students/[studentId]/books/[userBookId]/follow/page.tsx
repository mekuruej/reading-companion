"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BookEditionLine from "@/components/books/BookEditionLine";
import { supabase } from "@/lib/supabaseClient";
import type { discoverTeachingSources } from "@/lib/teacher/teachingSource";
type Sources = Awaited<ReturnType<typeof discoverTeachingSources>>;
export default function ChooseTeachingSourcePage() {
  const params = useParams<{ studentId: string; userBookId: string }>();
  return <ChooseTeachingSource key={`${params.studentId}:${params.userBookId}`} studentId={params.studentId} targetUserBookId={params.userBookId} />;
}
function ChooseTeachingSource({ studentId, targetUserBookId }: { studentId: string; targetUserBookId: string }) {
  const router = useRouter();
  const query = useSearchParams();
  const sessionId = query.get("sessionId");
  const [data, setData] = useState<Sources | null>(null);
  const [error, setError] = useState("");
  function href(sourceUserBookId: string) {
    return `/books/${encodeURIComponent(sourceUserBookId)}/lesson?${new URLSearchParams({ studentId, studentUserBookId: targetUserBookId, ...(sessionId ? { sessionId } : {}) })}`;
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/teacher/teaching-sources?${new URLSearchParams({ studentId, targetUserBookId })}`, { cache: "no-store", headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!active) return;
      setData(result);
      if (result.sources.length === 1) router.replace(href(result.sources[0].sourceUserBookId));
    })().catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [studentId, targetUserBookId, sessionId, router]);
  return <main className="mx-auto max-w-3xl p-6">
    <Link className="text-sm underline" href={`/teacher/students/${encodeURIComponent(studentId)}/workspace`}>Back to Student Workspace</Link>
    {error ? <p role="alert" className="mt-4">{error}</p> : !data ? <p className="mt-4">Finding your teaching editions…</p> : <section className="mt-4 rounded-2xl border bg-white p-5">
      <p className="text-sm font-semibold">Student: {data.target.studentName} · {data.targetEdition.title}</p>
      <BookEditionLine book={data.targetEdition} />
      {data.sources.length === 0 ? <>
        <h1 className="mt-4 text-xl font-bold">You don’t have a teaching source for this work yet.</h1>
        <p className="mt-2 text-sm">Use your own copy of this exact edition, or an edition with the same explicit work link. Unlinked editions cannot be matched by title.</p>
        <Link className="mt-4 inline-block underline" href="/books/add">Add an edition to My Library</Link>
        <p className="mt-3 text-sm"><Link className="underline" href={`/teacher/students/${encodeURIComponent(studentId)}/books/${encodeURIComponent(targetUserBookId)}/lesson-add`}>Open student Quick Add without a teaching source</Link></p>
      </> : data.sources.length === 1 ? <p className="mt-4">Opening your teaching edition…</p> : <>
        <h1 className="mt-4 text-xl font-bold">Which edition are you teaching from?</h1>
        <p className="mt-2 text-sm">The student and their exact copy stay fixed.</p>
        <ul className="mt-4 space-y-3">{data.sources.map((source, index) => <li key={source.sourceUserBookId}>
          <Link className="block rounded-xl border p-3 hover:bg-stone-50" href={href(source.sourceUserBookId)}>
            <span className="font-semibold">{source.edition.title}</span><BookEditionLine book={source.edition} />
            <span className="text-xs text-stone-500">Library copy {index + 1}</span>
          </Link>
        </li>)}</ul>
      </>}
    </section>}
  </main>;
}
