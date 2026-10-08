"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { todayYmdAppTimeZone } from "@/lib/timeZone";
import { MEKURU_READING_LEVEL_GROUPS } from "@/components/profile/MekuruReadingLevelGuide";
import {
  EXPERIENCE_CONTEXTS, EXPERIENCE_NOTE_LIMIT, EXPERIENCE_LEVEL_FITS, validateExperience,
  type ExperiencePerson, type ReadingExperience,
} from "@/lib/teacher/readingExperiences";

type PageData = {
  book: { id: string; title: string }; teacherId: string; userBookId: string | null;
  experiences: ReadingExperience[]; experienceError: string | null; hasMore: boolean;
};
type Draft = { id?: string; person: ExperiencePerson | null; experienced_on: string; context: string; notes: string; reader_level: string; level_fit: string };
const inputClass = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm";
const buttonClass = "rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50";
const primaryClass = "rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
type SaveState = "saved" | "unsaved" | "saving" | "failed" | "new";
function SaveBadge({ state }: { state: SaveState }) {
  const labels = { saved: "✓ Saved", unsaved: "Unsaved changes", saving: "Saving…", failed: "Save failed", new: "Not saved yet" };
  const tone = state === "saved" ? "border-emerald-200 bg-emerald-100 text-emerald-900"
    : state === "failed" ? "border-red-200 bg-red-50 text-red-800"
    : state === "saving" ? "border-violet-200 bg-violet-100 text-violet-900"
    : "border-amber-200 bg-amber-50 text-amber-900";
  return <span role="status" aria-live="polite" className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>{labels[state]}</span>;
}
function experienceKey(value: { person?: ExperiencePerson | null; experienced_on: string; context: string | null; notes: string; reader_level: string | null; level_fit: string | null }) {
  return JSON.stringify([value.person?.id ?? "", value.experienced_on, value.context ?? "", value.notes, value.reader_level ?? "", value.level_fit ?? ""]);
}
function personLabel(person: ExperiencePerson | null) {
  return person ? [person.display_name, person.username ? `@${person.username}` : null].filter(Boolean).join(" · ") || "MEKURU user" : "User no longer available";
}
async function requestApi(bookId: string, options?: RequestInit, query = "") {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Please sign in.");
  const response = await fetch(`/api/teacher/reading-experiences?bookId=${encodeURIComponent(bookId)}${query}`, {
    ...options, headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not complete this request.");
  return result;
}
export default function ReadingExperiencesPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const searchParams = useSearchParams();
  const initialPersonId = searchParams.get("person");
  const [data, setData] = useState<PageData | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [experienceMessage, setExperienceMessage] = useState("");
  const [experienceSaveFailed, setExperienceSaveFailed] = useState(false);
  const [experienceNoticeError, setExperienceNoticeError] = useState(false);
  const [lastSavedExperienceId, setLastSavedExperienceId] = useState<string | null>(null);
  const [savingExperience, setSavingExperience] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reload, setReload] = useState(0);
  function newDraft(person: ExperiencePerson | null = null): Draft {
    return { person, experienced_on: todayYmdAppTimeZone(), context: "", notes: "", reader_level: "", level_fit: "" };
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setData(null); setDraft(null);
    setExperienceMessage(""); setExperienceSaveFailed(false); setExperienceNoticeError(false); setLastSavedExperienceId(null);
    async function load() {
      try {
        const result = await requestApi(bookId) as PageData;
        if (cancelled) return;
        setData(result);
        if (initialPersonId) {
          setDraft(newDraft());
          try {
            const { person } = await requestApi(bookId, undefined, `&personId=${encodeURIComponent(initialPersonId)}`);
            if (!cancelled) setDraft(newDraft(person));
          } catch (err) {
            if (!cancelled) { setExperienceNoticeError(true); setExperienceMessage(err instanceof Error ? err.message : "Choose a person to continue."); }
          }
        }
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Reading Experiences."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [bookId, initialPersonId, reload]);

  async function findPerson() {
    if (!draft || lookingUp) return;
    setLookingUp(true); setExperienceMessage("");
    try {
      const { person } = await requestApi(bookId, undefined, `&username=${encodeURIComponent(username)}`);
      setDraft(current => current ? { ...current, person } : current);
    } catch (err) { setExperienceNoticeError(true); setExperienceMessage(err instanceof Error ? err.message : "Could not find this person."); }
    finally { setLookingUp(false); }
  }
  async function saveExperience() {
    if (!draft || savingExperience) return;
    const payload = { kind: "experience", bookId, id: draft.id, person_id: draft.person?.id, experienced_on: draft.experienced_on, context: draft.context || null, reader_level: draft.reader_level || null, level_fit: draft.level_fit || null, notes: draft.notes };
    const invalid = validateExperience(payload);
    if (invalid) { setExperienceNoticeError(true); setExperienceMessage(invalid); return; }
    setSavingExperience(true); setExperienceSaveFailed(false); setExperienceNoticeError(false); setExperienceMessage("");
    try {
      const { experience } = await requestApi(bookId, { method: draft.id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setData(current => current ? {
        ...current, experiences: [experience, ...current.experiences.filter(item => item.id !== experience.id)]
          .sort((a, b) => b.experienced_on.localeCompare(a.experienced_on) || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)),
      } : current);
      setLastSavedExperienceId(experience.id); setDraft(null); setUsername(""); setExperienceMessage("✓ Reading experience saved.");
    } catch (err) { setExperienceSaveFailed(true); setExperienceNoticeError(true); setExperienceMessage(`Experience not saved. ${err instanceof Error ? err.message : "Please try again."} Your changes are still here.`); }
    finally { setSavingExperience(false); }
  }
  async function loadMore() {
    if (!data || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await requestApi(bookId, undefined, `&offset=${data.experiences.length}`) as PageData;
      if (result.experienceError) throw new Error(result.experienceError);
      setData(current => current ? { ...current, hasMore: result.hasMore, experiences: [...current.experiences, ...result.experiences.filter(item => !current.experiences.some(saved => saved.id === item.id))] } : current);
    } catch (err) { setExperienceNoticeError(true); setExperienceMessage(err instanceof Error ? err.message : "Could not load more experiences."); }
    finally { setLoadingMore(false); }
  }

  const originalExperience = data?.experiences.find(item => item.id === draft?.id);
  const experienceDirty = !!draft && (!originalExperience || experienceKey(draft) !== experienceKey(originalExperience));
  const experienceState: SaveState = savingExperience ? "saving" : experienceSaveFailed ? "failed" : experienceDirty ? (draft?.id ? "unsaved" : "new") : "saved";

  if (loading) return <main className="mx-auto max-w-4xl p-6"><p role="status">Loading Reading Experiences…</p></main>;
  if (!data) return <main className="mx-auto max-w-4xl p-6"><p role="alert">{error}</p><button className={buttonClass} onClick={() => setReload(value => value + 1)}>Try again</button></main>;
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <nav className="flex flex-wrap gap-4 text-sm font-semibold text-stone-600">
        <Link href={data.userBookId ? `/books/${data.userBookId}` : "/teacher/library"}>← {data.userBookId ? "Back to Book Hub" : "Back to Find Your Next Teaching Book"}</Link>
        <Link href={`/teacher/teaching-assessment/${bookId}`}>Teaching Assessment</Link>
        {data.userBookId ? <Link href={`/books/${data.userBookId}/lesson?view=journal`}>Teacher Journal</Link> : null}
        <Link href="/teacher/library">Find Your Next Teaching Book</Link>
      </nav>
      <header><p className="text-sm font-semibold text-violet-700">{data.book.title}</p><h1 className="mt-1 text-3xl font-black">Reading Experiences</h1><p className="mt-2 text-sm text-stone-600">Records of reading this book with specific people.</p></header>

      <section className="space-y-4 rounded-3xl border border-violet-200 bg-violet-50/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Reading Experiences</h2><button className={primaryClass} disabled={!!draft || !!data.experienceError} onClick={() => { setDraft(newDraft()); setExperienceMessage(""); setUsername(""); setExperienceSaveFailed(false); setExperienceNoticeError(false); }}>+ Add Reading Experience</button></div>
        <p className="text-sm text-stone-600">Private reflections from reading with another person. You can add as many experiences as you need, including with people who are not your students.</p>
        {data.experienceError ? <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">{data.experienceError} <button className="underline" onClick={() => setReload(value => value + 1)}>Retry</button></div> : null}
        {draft ? <form aria-busy={savingExperience} className="space-y-4 rounded-2xl border border-violet-200 bg-white p-4" onSubmit={event => { event.preventDefault(); void saveExperience(); }}>
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{draft.id ? "Edit experience" : "New reading experience"}</h3><SaveBadge state={experienceState} /></div>
          <fieldset disabled={savingExperience || lookingUp || !!data.experienceError} className="space-y-4">
            <div>
              {draft.person ? <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-semibold">{personLabel(draft.person)}</span><button type="button" className="text-sm underline" onClick={() => { setDraft({ ...draft, person: null }); setUsername(""); }}>Change person</button></div> : <><label className="block text-sm font-semibold">MEKURU username<input className={inputClass} value={username} onChange={event => setUsername(event.target.value)} placeholder="@username" maxLength={120} /></label><button type="button" disabled={!username.trim()} className={buttonClass + " mt-2"} onClick={() => void findPerson()}>{lookingUp ? "Finding…" : "Find person"}</button></>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">Date<input type="date" required className={inputClass} value={draft.experienced_on} onChange={event => setDraft({ ...draft, experienced_on: event.target.value })} /></label>
              <label className="text-sm font-semibold">Context (optional)<select className={inputClass} value={draft.context} onChange={event => setDraft({ ...draft, context: event.target.value })}><option value="">Not specified</option>{EXPERIENCE_CONTEXTS.map(value => <option key={value}>{value}</option>)}</select></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Reader’s MEKURU level at the time (optional)
                <select id="experience-reader-level" className={inputClass} value={draft.reader_level} onChange={event => setDraft({ ...draft, reader_level: event.target.value })}>
                  <option value="">Not recorded</option>
                  {MEKURU_READING_LEVEL_GROUPS.map(group => <optgroup key={group.title} label={group.title}>{group.levels.map(level => <option key={level.value} value={level.value}>{level.value} — {level.plain}</option>)}</optgroup>)}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Fit for this reader (optional)
                <select id="experience-level-fit" className={inputClass} value={draft.level_fit} onChange={event => setDraft({ ...draft, level_fit: event.target.value })}>
                  <option value="">Not recorded</option>
                  {EXPERIENCE_LEVEL_FITS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs text-stone-500">Record their level for this experience; it stays the same as their reading develops.</p>
            <label className="block text-sm font-semibold">Reflection / notes<textarea required className={inputClass} rows={5} maxLength={EXPERIENCE_NOTE_LIMIT} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} placeholder="What happened, what worked, or what you want to remember for next time…" /></label>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3"><button type="submit" className={primaryClass} disabled={!draft.person || savingExperience || (!experienceDirty && !experienceSaveFailed)}>{savingExperience ? "Saving experience…" : experienceSaveFailed ? "Retry save experience" : "Save experience"}</button><button type="button" className={buttonClass} onClick={() => { setDraft(null); setExperienceMessage(""); setExperienceSaveFailed(false); setExperienceNoticeError(false); }}>Cancel</button></div>
          </fieldset>
        </form> : null}
        {experienceMessage ? <p role={experienceNoticeError ? "alert" : "status"} className={`rounded-xl border p-3 text-sm font-semibold ${experienceNoticeError ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{experienceMessage}</p> : null}
        {!data.experienceError && !data.experiences.length ? <p className="text-sm text-stone-600">No reading experiences yet.</p> : null}
        {data.experiences.map(experience => <article key={experience.id} className={`rounded-2xl border p-4 ${lastSavedExperienceId === experience.id ? "border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200" : "border-stone-200 bg-white"}`}>
          <div className="mb-2"><SaveBadge state="saved" /></div>
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{personLabel(experience.person)}</h3><p className="mt-1 text-sm text-stone-500">{experience.experienced_on}{experience.context ? ` · ${experience.context}` : ""}</p></div><button className={buttonClass} disabled={!!draft} onClick={() => { setDraft({ id: experience.id, person: experience.person, experienced_on: experience.experienced_on, context: experience.context ?? "", reader_level: experience.reader_level ?? "", level_fit: experience.level_fit ?? "", notes: experience.notes }); setExperienceMessage(""); setExperienceSaveFailed(false); setExperienceNoticeError(false); }}>Edit</button></div>
          {experience.reader_level || experience.level_fit ? <p className="mt-2 text-sm text-stone-600">
            {experience.reader_level ? `Reader level at the time: ${experience.reader_level}` : ""}
            {experience.reader_level && experience.level_fit ? " · " : ""}
            {experience.level_fit ? `Fit: ${EXPERIENCE_LEVEL_FITS.find(([key]) => key === experience.level_fit)?.[1] ?? experience.level_fit}` : ""}
          </p> : null}
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{experience.notes}</p>
        </article>)}
        {data.hasMore ? <button className={buttonClass} disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more experiences"}</button> : null}
      </section>
    </main>
  );
}
