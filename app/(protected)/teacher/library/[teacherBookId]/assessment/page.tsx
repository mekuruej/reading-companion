"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isJapaneseLearningBook } from "@/lib/access/readingCompanion";
import {
  buildCrossOwnerAssessmentPatch,
  buildRemoveFromTeacherLibraryPatch,
  getLegacyTeacherBookDestination,
  isTeacherAssessmentProfile,
  type TeacherAssessmentProfile,
} from "@/lib/teacher/legacyTeacherBookAssessment";
import { resolveTeacherBookHubUserBookId } from "@/lib/teacher/resolveTeacherBookHub";
import { supabase } from "@/lib/supabaseClient";

type TeacherUseStatus =
  | "want_to_test"
  | "testing"
  | "currently_using"
  | "approved_for_lesson"
  | "usable"
  | "use_with_caution"
  | "do_not_use";
type TeachingDifficulty = "n5" | "n4" | "n3" | "n2" | "n1" | "above_n1";
type TeachingSuitability = "excellent" | "usable" | "poor_fit";
type BookMeta = {
  title: string | null;
  author: string | null;
  language_code: string | null;
};
type TeacherBookRow = {
  id: string;
  teacher_id: string;
  book_id: string;
  teacher_use_status: TeacherUseStatus | null;
  teacher_use_note: string | null;
  teacher_jlpt_difficulty: TeachingDifficulty | null;
  teaching_suitability: TeachingSuitability | null;
  books: BookMeta | BookMeta[] | null;
};

const statusOptions: Array<[TeacherUseStatus, string]> = [
  ["approved_for_lesson", "Perfect for Lesson"],
  ["usable", "Usable"],
  ["do_not_use", "Not for Teaching"],
  ["want_to_test", "Potential"],
  ["testing", "Testing"],
  ["currently_using", "Currently Using"],
  ["use_with_caution", "Use with Caution"],
];
const difficultyOptions: Array<[TeachingDifficulty, string]> = [
  ["n5", "N5"], ["n4", "N4"], ["n3", "N3"], ["n2", "N2"], ["n1", "N1"], ["above_n1", "Above N1"],
];
const suitabilityOptions: Array<[TeachingSuitability, string]> = [
  ["excellent", "Excellent"], ["usable", "Usable"], ["poor_fit", "Poor Fit"],
];
const fieldClass = "mt-1 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900 disabled:bg-stone-100";

function firstBook(value: TeacherBookRow["books"]): BookMeta | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function CrossOwnerTeachingAssessmentPage() {
  const params = useParams<{ teacherBookId: string }>();
  const router = useRouter();
  const teacherBookId = params.teacherBookId ?? "";
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState("");
  const [teacherBook, setTeacherBook] = useState<TeacherBookRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<TeacherUseStatus | "">("");
  const [difficultyDraft, setDifficultyDraft] = useState<TeachingDifficulty | "">("");
  const [suitabilityDraft, setSuitabilityDraft] = useState<TeachingSuitability | "">("");
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadAssessment();
  }, [teacherBookId]);

  async function loadAssessment() {
    setLoading(true);
    setRedirecting(false);
    setMessage("");
    setTeacherBook(null);
    setCurrentUserId(null);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;
      if (authError || !user) throw new Error("Please sign in.");
      setCurrentUserId(user.id);

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
        .select("id, teacher_id, book_id, teacher_use_status, teacher_use_note, teacher_jlpt_difficulty, teaching_suitability, books:book_id (title, author, language_code)")
        .eq("id", teacherBookId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This teaching assessment could not be found.");

      const row = data as TeacherBookRow;
      const destination = getLegacyTeacherBookDestination({
        actorId: user.id,
        ownerId: row.teacher_id,
        profile: profile as TeacherAssessmentProfile,
      });
      if (destination === "owner_book_hub") {
        const userBookId = await resolveTeacherBookHubUserBookId(supabase, row.id);
        setRedirecting(true);
        router.replace(`/books/${encodeURIComponent(userBookId)}`);
        return;
      }
      if (destination !== "cross_owner_assessment") {
        throw new Error("You do not have access to this teaching assessment.");
      }

      setTeacherBook(row);
      setStatusDraft(row.teacher_use_status ?? "");
      setDifficultyDraft(row.teacher_jlpt_difficulty ?? "");
      setSuitabilityDraft(row.teaching_suitability ?? "");
      setNoteDraft(row.teacher_use_note ?? "");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not load the teaching assessment.");
    } finally {
      setLoading(false);
    }
  }

  const canEdit = Boolean(
    teacherBook && currentUserId && teacherBook.teacher_id !== currentUserId
  );
  const book = firstBook(teacherBook?.books ?? null);
  const showJlpt = isJapaneseLearningBook(book?.language_code);

  async function saveAssessment() {
    if (!teacherBook || !canEdit || saving) return;
    if (statusDraft && !statusOptions.some(([value]) => value === statusDraft)) {
      setMessage("Choose a valid Teacher Book status.");
      return;
    }
    if (showJlpt && difficultyDraft && !difficultyOptions.some(([value]) => value === difficultyDraft)) {
      setMessage("Choose a valid JLPT difficulty.");
      return;
    }
    if (suitabilityDraft && !suitabilityOptions.some(([value]) => value === suitabilityDraft)) {
      setMessage("Choose a valid teaching suitability.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const patch = buildCrossOwnerAssessmentPatch({
        status: statusDraft || null,
        difficulty: difficultyDraft || null,
        suitability: suitabilityDraft || null,
        note: noteDraft,
        isJapaneseBook: showJlpt,
        existingDifficulty: teacherBook.teacher_jlpt_difficulty,
      });
      const { error } = await supabase
        .from("teacher_books")
        .update(patch)
        .eq("id", teacherBook.id);
      if (error) throw error;

      setTeacherBook((current) => current ? {
        ...current,
        ...patch,
      } : current);
      setMessage("Teaching assessment saved.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not save the teaching assessment.");
    } finally {
      setSaving(false);
    }
  }

  async function removeFromTeacherLibrary() {
    if (!teacherBook || !canEdit || saving) return;
    if (!window.confirm("Mark this book Not for Teaching? The Teacher Book record and reader data will remain in place.")) return;

    setSaving(true);
    setMessage("");
    const patch = buildRemoveFromTeacherLibraryPatch(noteDraft, teacherBook.teacher_use_note);
    try {
      const { error } = await supabase
        .from("teacher_books")
        .update(patch)
        .eq("id", teacherBook.id);
      if (error) throw error;
      router.push("/teacher/library");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not update this teaching assessment.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || redirecting) {
    return <main className="mx-auto max-w-3xl p-6"><p role="status">{redirecting ? "Opening Book Hub…" : "Loading teaching assessment…"}</p></main>;
  }

  if (!teacherBook || !canEdit) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <Link href="/teacher/library" className="text-sm font-semibold text-stone-500 hover:text-stone-900">← Teacher Books</Link>
        <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {message || "You do not have access to this teaching assessment."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <nav className="flex flex-wrap gap-4 text-sm font-semibold text-stone-600">
        <Link href="/teacher/library" className="hover:text-stone-900">← Teacher Books</Link>
      </nav>
      <header>
        <p className="text-sm font-semibold text-violet-700">Cross-owner assessment</p>
        <h1 className="mt-1 text-3xl font-black text-stone-950">{book?.title ?? "Teaching Assessment"}</h1>
        {book?.author ? <p className="mt-1 text-sm text-stone-600">{book.author}</p> : null}
      </header>

      <form
        className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
        onSubmit={(event) => { event.preventDefault(); void saveAssessment(); }}
      >
        <div>
          <h2 className="text-xl font-black text-stone-950">Teaching Assessment</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">Edit the teacher’s private assessment. This does not change the Teacher Book record or the owner’s reading data.</p>
        </div>
        <div className={`grid gap-3 ${showJlpt ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {showJlpt ? (
            <label className="text-sm font-semibold">JLPT Difficulty
              <select className={fieldClass} value={difficultyDraft} disabled={saving} onChange={(event) => setDifficultyDraft(event.target.value as TeachingDifficulty | "")}>
                <option value="">Not assessed</option>
                {difficultyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          ) : null}
          <label className="text-sm font-semibold">Teaching Suitability
            <select className={fieldClass} value={suitabilityDraft} disabled={saving} onChange={(event) => setSuitabilityDraft(event.target.value as TeachingSuitability | "")}>
              <option value="">Not assessed</option>
              {suitabilityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Status
            <select className={fieldClass} value={statusDraft} disabled={saving} onChange={(event) => setStatusDraft(event.target.value as TeacherUseStatus | "")}>
              <option value="">Not set</option>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm font-semibold">Private Teacher Note
          <textarea className={fieldClass} rows={4} value={noteDraft} disabled={saving} onChange={(event) => setNoteDraft(event.target.value)} />
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white hover:bg-black disabled:opacity-50">{saving ? "Saving…" : "Save Assessment"}</button>
          <button type="button" disabled={saving} onClick={() => void removeFromTeacherLibrary()} className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50">Remove from Teacher Library</button>
        </div>
        {message ? <p role="status" className="text-sm font-semibold text-stone-600">{message}</p> : null}
      </form>
    </main>
  );
}
