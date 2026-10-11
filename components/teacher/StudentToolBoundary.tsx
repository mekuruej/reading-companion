"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function StudentToolBoundary({ children }: { children: ReactNode }) {
  const params = useParams<{ userBookId: string }>();
  const query = useSearchParams();
  const studentId = query.get("studentId") ?? "";
  const sourceUserBookId = query.get("sourceUserBookId") ?? "";
  const contextual = query.has("studentId") || query.has("sourceUserBookId");
  const key = `${studentId}:${params.userBookId}:${sourceUserBookId}`;
  const [result, setResult] = useState<{ key: string; name?: string; error?: string } | null>(null);
  useEffect(() => {
    if (!contextual) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const response = await fetch(`/api/teacher/student-context?${new URLSearchParams({ studentId, userBookId: params.userBookId, sourceUserBookId })}`,
          { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (!cancelled) setResult({ key, name: body.studentName });
      } catch (error) { if (!cancelled) setResult({ key, error: error instanceof Error ? error.message : "Invalid student context." }); }
    })();
    return () => { cancelled = true; };
  }, [contextual, key, studentId, params.userBookId, sourceUserBookId]);
  if (!contextual) return children;
  if (result?.key !== key) return <p role="status" className="p-6">Loading student context…</p>;
  if (result.error) return <p role="alert" className="p-6">{result.error}</p>;
  return <div key={key}><p className="px-6 pt-4 text-sm font-bold">Working with: {result.name}</p>{children}</div>;
}
