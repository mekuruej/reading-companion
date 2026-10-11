"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { progressLabels, type ProgressTrackingMethod } from "@/lib/books/readingProgress";
import { suggestCapturePosition, type CapturePosition } from "@/lib/books/vocabularyProgress";
import AudioTimeInput from "./AudioTimeInput";

type Props = { userBookId: string; studentId?: string; sourceUserBookId?: string; positions: CapturePosition[]; autoOpen?: boolean; actionLabel?: string };
type Target = { studentName: string | null; method: ProgressTrackingMethod | null; total: number | null; current: number | null };
export default function VocabularyProgressPrompt(props: Props) {
  return <Prompt key={`${props.userBookId}:${props.studentId ?? ""}:${props.sourceUserBookId ?? ""}`} {...props} />;
}
function Prompt({ userBookId, studentId, sourceUserBookId, positions, autoOpen = false, actionLabel = "Finish adding" }: Props) {
  const [open, setOpen] = useState(autoOpen);
  const [done, setDone] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const context = { ...(studentId !== undefined ? { studentId } : {}), ...(sourceUserBookId ? { sourceUserBookId } : {}) };
  const url = `/api/books/${encodeURIComponent(userBookId)}/vocabulary-progress`;
  async function request(body?: object) {
    const { data } = await supabase.auth.getSession();
    const response = await fetch(body ? url : `${url}?${new URLSearchParams(context)}`, {
      method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify({ ...context, ...body }) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void request().then((next: Target) => {
      if (cancelled) return;
      setTarget(next); setValue(suggestCapturePosition(positions, next.method));
    }).catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
    // Snapshot only this completed batch when opened; never reset a value the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  async function save() {
    if (!target?.method || saving) return;
    setSaving(true); setError("");
    try {
      await request({ confirmed: true, value, method: target.method });
      window.dispatchEvent(new Event("book-progress-changed"));
      setDone(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update progress."); }
    finally { setSaving(false); }
  }
  if (done) return null;
  if (!open) return <button type="button" className="my-3 text-sm font-semibold underline" onClick={() => setOpen(true)}>{actionLabel}</button>;
  return <section className="my-3 rounded-xl border border-stone-200 bg-white p-3 text-sm">
    <h3 className="font-semibold">{target?.studentName ? `Where did ${target.studentName} stop?` : target ? "Update your reading progress?" : "Loading reading progress…"}</h3>
    <p className="my-2 text-xs text-stone-500">Optional. Saved word locations are only suggestions. Your words are already saved.</p>
    {target?.method === "audiobook_time" ? <AudioTimeInput label="Audio position" value={value} onChange={setValue} disabled={saving} /> : target?.method ? <label className="block">{progressLabels(target.method).unit}{target.method === "percent" ? " (%)" : ""}<input className="ml-2 w-28 rounded border px-2 py-1" value={value} onChange={event => setValue(event.target.value)} disabled={saving} inputMode="decimal" /></label> : target ? <p>Choose this copy’s tracking method in the Book Hub first.</p> : null}
    {target?.current != null ? <p className="mt-2 text-xs text-stone-500">Current progress: {target.current}{target.method === "percent" ? "%" : ""}</p> : null}
    {error ? <p role="alert" className="mt-2 text-red-700">{error}</p> : null}
    <div className="mt-3 flex gap-3"><button type="button" disabled={saving || !target?.method || !value.trim()} className="rounded bg-stone-900 px-3 py-1.5 text-white disabled:opacity-50" onClick={() => void save()}>{saving ? "Saving…" : "Confirm progress"}</button><button type="button" disabled={saving} onClick={() => setDone(true)}>Not now</button></div>
  </section>;
}
