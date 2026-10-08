"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { hasOverallTeachingAssessment } from "@/lib/teacher/teachingDiscovery";
import {
  ASSESSMENT_DIFFICULTIES,
  ASSESSMENT_STATUSES,
  ASSESSMENT_SUITABILITIES,
  EMPTY_ASSESSMENT,
  validateAssessment,
  type BookAssessment,
} from "@/lib/teacher/readingExperiences";

type AssessmentPageData = {
  book: { id: string; title: string };
  userBookId: string | null;
  assessment: BookAssessment | null;
};
type SaveState = "saved" | "unsaved" | "saving" | "failed" | "new";

const inputClass = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm";
const buttonClass = "rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50";
const primaryClass = "rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

function assessmentKey(value: BookAssessment | null) {
  return JSON.stringify([
    value?.teacher_jlpt_difficulty ?? "",
    value?.teaching_suitability ?? "",
    value?.teacher_use_status ?? "",
    value?.teacher_use_note ?? "",
  ]);
}

function SaveBadge({ state }: { state: SaveState }) {
  const labels = { saved: "✓ Saved", unsaved: "Unsaved changes", saving: "Saving…", failed: "Save failed", new: "Not saved yet" };
  const tone = state === "saved" ? "border-emerald-200 bg-emerald-100 text-emerald-900"
    : state === "failed" ? "border-red-200 bg-red-50 text-red-800"
    : state === "saving" ? "border-violet-200 bg-violet-100 text-violet-900"
    : "border-amber-200 bg-amber-50 text-amber-900";
  return <span role="status" aria-live="polite" className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>{labels[state]}</span>;
}

async function requestApi(bookId: string, options?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Please sign in.");
  const response = await fetch(`/api/teacher/reading-experiences?bookId=${encodeURIComponent(bookId)}`, {
    ...options,
    headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not complete this request.");
  return result;
}

export default function TeachingAssessmentPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [data, setData] = useState<AssessmentPageData | null>(null);
  const [assessment, setAssessment] = useState<BookAssessment>({ ...EMPTY_ASSESSMENT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    async function load() {
      try {
        const result = await requestApi(bookId) as AssessmentPageData;
        if (cancelled) return;
        setData(result);
        setAssessment(result.assessment ?? { ...EMPTY_ASSESSMENT });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Teaching Assessment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [bookId, reload]);

  async function saveAssessment() {
    if (saving) return;
    const invalid = validateAssessment(assessment);
    if (invalid) {
      setSaveFailed(true);
      setMessage(invalid);
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    setMessage("");
    try {
      const result = await requestApi(bookId, {
        method: "POST",
        body: JSON.stringify({ kind: "assessment", bookId, assessment }),
      });
      setAssessment(result.assessment);
      setData(current => current ? { ...current, assessment: result.assessment } : current);
      setMessage("Teaching Assessment saved.");
      try {
        window.localStorage.setItem("teaching-assessment-saved", JSON.stringify({ bookId, savedAt: Date.now() }));
      } catch { /* The assessment remains saved; discovery refreshes when reopened. */ }
    } catch (err) {
      setSaveFailed(true);
      setMessage(`Assessment not saved. ${err instanceof Error ? err.message : "Please try again."} Your changes are still here.`);
    } finally {
      setSaving(false);
    }
  }

  const dirty = assessmentKey(assessment) !== assessmentKey(data?.assessment ?? null);
  const hasSavedAssessment = hasOverallTeachingAssessment(data?.assessment);
  const saveState: SaveState = saving ? "saving" : saveFailed ? "failed" : dirty ? "unsaved" : hasSavedAssessment ? "saved" : "new";

  if (loading) return <main className="mx-auto max-w-4xl p-6"><p role="status">Loading Teaching Assessment…</p></main>;
  if (!data) return <main className="mx-auto max-w-4xl p-6"><p role="alert">{error}</p><button className={buttonClass} onClick={() => setReload(value => value + 1)}>Try again</button></main>;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <nav className="flex flex-wrap gap-4 text-sm font-semibold text-stone-600">
        <Link href={data.userBookId ? `/books/${data.userBookId}` : "/teacher/library"}>← {data.userBookId ? "Back to Book Hub" : "Back to Teaching Library"}</Link>
        <Link href={`/teacher/reading-experiences/${bookId}`}>Reading Experiences</Link>
        <Link href="/teacher/library">Find Your Next Teaching Book</Link>
      </nav>
      <header>
        <p className="text-sm font-semibold text-violet-700">{data.book.title}</p>
        <h1 className="mt-1 text-3xl font-black">Teaching Assessment</h1>
        <p className="mt-2 text-sm text-stone-600">Your overall judgment of this book as teaching material.</p>
      </header>

      <section className="rounded-3xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Your assessment</h2>
          <SaveBadge state={saveState} />
        </div>
        <form aria-busy={saving} className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); void saveAssessment(); }}>
          <fieldset disabled={saving} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-semibold">JLPT Difficulty
                <select className={inputClass} value={assessment.teacher_jlpt_difficulty ?? ""} onChange={event => setAssessment({ ...assessment, teacher_jlpt_difficulty: event.target.value || null })}>
                  <option value="">Not assessed</option>
                  {ASSESSMENT_DIFFICULTIES.map(value => <option key={value} value={value}>{value === "above_n1" ? "Above N1" : value.toUpperCase()}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Teaching Suitability
                <select className={inputClass} value={assessment.teaching_suitability ?? ""} onChange={event => setAssessment({ ...assessment, teaching_suitability: event.target.value || null })}>
                  <option value="">Not assessed</option>
                  {ASSESSMENT_SUITABILITIES.map(value => <option key={value} value={value}>{value === "poor_fit" ? "Poor Fit" : value === "excellent" ? "Excellent" : "Usable"}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Would I use this book?
                <select className={inputClass} value={assessment.teacher_use_status ?? ""} onChange={event => setAssessment({ ...assessment, teacher_use_status: event.target.value || null })}>
                  <option value="">Not set</option>
                  {ASSESSMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm font-semibold">Private Teacher Note
              <textarea className={inputClass} rows={4} value={assessment.teacher_use_note ?? ""} onChange={event => setAssessment({ ...assessment, teacher_use_note: event.target.value })} placeholder="Level fit, content warning, why it works, or why to avoid it…" />
            </label>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <button className={primaryClass} type="submit" disabled={saving || (!dirty && hasSavedAssessment && !saveFailed)}>
                {saving ? "Saving assessment…" : saveState === "saved" ? "✓ Assessment saved" : saveFailed ? "Retry save assessment" : "Save assessment"}
              </button>
              <p className="text-sm text-stone-600">This is your book-level judgment, separate from individual reading experiences.</p>
            </div>
          </fieldset>
          {message ? <p role={saveFailed ? "alert" : "status"} className={`rounded-xl border p-3 text-sm font-semibold ${saveFailed ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</p> : null}
          {assessment.assessed_at ? <p className="text-xs text-stone-500">Last assessed {new Date(assessment.assessed_at).toLocaleDateString()}</p> : null}
        </form>
      </section>
    </main>
  );
}
