"use client";

import { useEffect, useRef, useState } from "react";
import MekuruReadingLevelGuide, { MEKURU_READING_LEVEL_GROUPS } from "@/components/profile/MekuruReadingLevelGuide";
import { supabase } from "@/lib/supabaseClient";
import { REFLECTION_TEXT_LIMIT, TEACHING_DIFFICULTY_OPTIONS, validateTeachingReflection, type TeachingReflection as Reflection } from "@/lib/teacher/teachingReflection";

const fields = "book_id, teacher_id, student_level, student_difficulty, teaching_difficulty, difficulties, comments";
export default function TeachingReflection({ bookId, teacherId }: { bookId: string; teacherId: string }) {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [level, setLevel] = useState("");
  const [draft, setDraft] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const guide = useRef<HTMLDialogElement>(null);
  const selected = reflections.find(item => item.student_level === level);
  const shown = draft ?? selected;

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(false); setDraft(null); setLevel(""); setMessage("");
    async function load() {
      try {
        const { data, error } = await supabase.from("book_teaching_reflections").select(fields).eq("book_id", bookId).eq("teacher_id", teacherId);
        if (error) throw error;
        if (!cancelled) setReflections((data ?? []) as Reflection[]);
      } catch { if (!cancelled) setLoadError(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [bookId, teacherId, reload]);

  function chooseLevel(value: string) {
    setLevel(value); setMessage("");
    const existing = reflections.find(item => item.student_level === value);
    setDraft(value && !existing ? { book_id: bookId, teacher_id: teacherId, student_level: value, student_difficulty: 0, teaching_difficulty: 0, difficulties: "", comments: "" } : null);
  }
  async function save() {
    if (!draft || saving || loading || loadError) return;
    const payload = { ...draft, difficulties: draft.difficulties.trim(), comments: draft.comments.trim() };
    const validation = validateTeachingReflection(payload);
    if (validation) { setMessage(validation); return; }
    setSaving(true); setMessage("");
    try {
      const { data, error } = await supabase.from("book_teaching_reflections").upsert(payload, { onConflict: "teacher_id,book_id,student_level" }).select(fields).single();
      if (error) throw error;
      setReflections(items => [...items.filter(item => item.student_level !== payload.student_level), data as Reflection]);
      setDraft(null); setMessage("Teaching reflection saved.");
    } catch { setMessage("Could not save your teaching reflection. Your answers are still here; please try again."); }
    finally { setSaving(false); }
  }

  return <section id="teaching-reflection" className="scroll-mt-6 rounded-3xl border border-violet-300 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-amber-50 p-5 shadow-sm">
    <h2 className="text-3xl font-black text-stone-950 sm:text-4xl">Teaching Reflection</h2>
    <p className="mt-2 text-sm leading-6 text-stone-700">Help other teachers understand who this book works well for.</p>
    <p className="my-4 rounded-2xl border border-violet-200 bg-white/80 p-3 text-sm leading-6 text-stone-600">Shared contribution: these answers may be used in shared book feedback and averages. Keep student names and identifying details out of your answers. Private lesson notes belong in your Teacher Journal.</p>
    {loading ? <p role="status">Loading your reflections…</p> : loadError ? <div role="alert">Could not load your teaching reflections. <button type="button" className="underline" onClick={() => setReload(value => value + 1)}>Try again</button></div> : <div className="space-y-4 rounded-3xl border border-stone-300 bg-white p-4 shadow-sm">
      <div className="rounded-2xl bg-stone-50 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="teaching-reflection-level" className="text-sm font-semibold">What level did you read it with?</label>
          <button type="button" onClick={() => guide.current?.showModal()} className="rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-violet-700">View levels</button>
        </div>
        <select id="teaching-reflection-level" value={level} disabled={saving || !!draft} onChange={event => chooseLevel(event.target.value)} className="w-full rounded-xl border bg-white p-2 text-sm">
          <option value="">Choose a MEKURU level</option>
          {MEKURU_READING_LEVEL_GROUPS.map(group => <optgroup key={group.title} label={group.title}>{group.levels.map(item => <option key={item.value} value={item.value}>{item.value} — {item.plain}{reflections.some(saved => saved.student_level === item.value) ? " · Saved" : ""}</option>)}</optgroup>)}
        </select>
        <p className="mt-2 text-xs text-stone-500">You can save a separate reflection for each level. Save or cancel your current edits before choosing another level.</p>
      </div>
      {shown ? <>
        {([['student_difficulty', 'How well did it work for them?', 'Difficulty for students at this level.'], ['teaching_difficulty', 'How well did it work for you?', 'Difficulty of teaching this book.']] as const).map(([key, title, description]) => <div key={key} className="rounded-2xl bg-stone-50 p-4">
          <label htmlFor={`teaching-${key}`} className="text-sm font-semibold">{title}</label>
          <p className="mb-2 text-xs text-stone-500">{description}</p>
          {draft ? <select id={`teaching-${key}`} disabled={saving} value={draft[key] || ""} onChange={event => setDraft({ ...draft, [key]: Number(event.target.value) })} className="w-full rounded-xl border bg-white p-2 text-sm"><option value="">Choose difficulty</option>{TEACHING_DIFFICULTY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <p className="text-sm">{TEACHING_DIFFICULTY_OPTIONS.find(option => option.value === shown[key])?.label}</p>}
        </div>)}
        {([['difficulties', 'What was difficult?'], ['comments', 'Optional comments']] as const).map(([key, title]) => <div key={key} className="rounded-2xl bg-stone-50 p-4">
          <label htmlFor={`teaching-${key}`} className="mb-2 block text-sm font-semibold">{title}</label>
          {draft ? <><textarea id={`teaching-${key}`} disabled={saving} maxLength={REFLECTION_TEXT_LIMIT} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} className="min-h-[90px] w-full rounded-xl border bg-white p-3 text-sm" /><p className="text-right text-xs text-stone-500">{draft[key].length}/{REFLECTION_TEXT_LIMIT}</p></> : <p className="whitespace-pre-wrap text-sm text-stone-700">{shown[key] || "No comment added."}</p>}
        </div>)}
        <div className="flex justify-end gap-2">
          {draft ? <><button type="button" disabled={saving} onClick={() => { setDraft(null); if (!selected) setLevel(""); setMessage(""); }} className="rounded-xl border px-4 py-2 text-sm">Cancel</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save reflection"}</button></> : <button type="button" onClick={() => { setDraft({ ...selected! }); setMessage(""); }} className="rounded-xl border px-4 py-2 text-sm">Edit reflection</button>}
        </div>
      </> : <p className="text-sm text-stone-600">Choose the level you taught to add or review your reflection.</p>}
      {message ? <p role="status" className="text-sm text-stone-700">{message}</p> : null}
    </div>}
    <dialog ref={guide} aria-label="MEKURU reading levels" className="max-h-[85dvh] w-[min(56rem,95vw)] overflow-y-auto rounded-2xl p-4 backdrop:bg-black/40">
      <div className="mb-3 flex justify-end"><button type="button" onClick={() => guide.current?.close()} className="rounded-xl border px-4 py-2 text-sm">Close level guide</button></div>
      <MekuruReadingLevelGuide selectedLevel={level} />
    </dialog>
  </section>;
}
