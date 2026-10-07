"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { resolveTeacherBookHubUserBookId } from "@/lib/teacher/resolveTeacherBookHub";
import {
  getLegacyTeacherBookDestination,
  isTeacherAssessmentProfile,
  type TeacherAssessmentProfile,
} from "@/lib/teacher/legacyTeacherBookAssessment";
import { supabase } from "@/lib/supabaseClient";

type TeacherBookOwner = { id: string; teacher_id: string };

export default function LegacyTeachingBookRoute() {
  const params = useParams<{ teacherBookId: string }>();
  const router = useRouter();
  const teacherBookId = params.teacherBookId ?? "";
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void resolveDestination();
  }, [teacherBookId]);

  async function resolveDestination() {
    setLoading(true);
    setRedirecting(false);
    setMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;
      if (authError || !user) throw new Error("Please sign in.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!isTeacherAssessmentProfile(profile as TeacherAssessmentProfile)) {
        throw new Error("Teacher access is required.");
      }

      const { data, error } = await supabase
        .from("teacher_books")
        .select("id, teacher_id")
        .eq("id", teacherBookId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This Teacher Book could not be found.");
      const teacherBook = data as TeacherBookOwner;

      const destination = getLegacyTeacherBookDestination({
        actorId: user.id,
        ownerId: teacherBook.teacher_id,
        profile: profile as TeacherAssessmentProfile,
      });

      if (destination === "owner_book_hub") {
        const userBookId = await resolveTeacherBookHubUserBookId(supabase, teacherBook.id);
        setRedirecting(true);
        router.replace(`/books/${encodeURIComponent(userBookId)}`);
        return;
      }

      if (destination !== "cross_owner_assessment") {
        throw new Error("You do not have access to this Teacher Book.");
      }

      setRedirecting(true);
      router.replace(`/teacher/library/${encodeURIComponent(teacherBook.id)}/assessment`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not open this book.");
    } finally {
      setLoading(false);
    }
  }

  if (loading || redirecting) {
    return <main className="mx-auto max-w-3xl p-6"><p role="status">{redirecting ? "Opening the requested page…" : "Checking book access…"}</p></main>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <Link href="/teacher/library" className="text-sm font-semibold text-stone-500 hover:text-stone-900">← Teacher Books</Link>
      <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {message || "You do not have access to this Teacher Book."}
      </p>
    </main>
  );
}
