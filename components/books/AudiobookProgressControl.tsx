"use client";

import { useState } from "react";
import AudioTimeInput from "./AudioTimeInput";
import { useBookProgress } from "./BookProgressProvider";
import { parseProgressRange } from "@/lib/books/readingProgress";
import { supabase } from "@/lib/supabaseClient";
import { todayYmdAppTimeZone } from "@/lib/timeZone";

export default function AudiobookProgressControl({ userBookId, position, onSaved, onRequestLength, canEditLength = false }: {
  userBookId: string; position: number | null; onSaved: () => Promise<void>; onRequestLength: () => void; canEditLength?: boolean;
}) {
  const tracking = useBookProgress();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (tracking.method !== "audiobook_time" || !tracking.canChoose) return null;
  async function save() {
    if (saving) return;
    const parsed = parseProgressRange("", value, "audiobook_time", tracking.totals.audiobook_duration_minutes ?? null);
    if (parsed.error || parsed.payload.end_position == null) { setError(parsed.error ?? "Enter your current position."); return; }
    setSaving(true); setError(null);
    try {
      const { error: saveError } = await supabase.from("user_book_reading_sessions").insert({
        user_book_id: userBookId, read_on: todayYmdAppTimeZone(), ...parsed.payload,
        session_mode: "listening", minutes_read: null,
      });
      if (saveError) throw saveError;
      await onSaved(); setEditing(false);
    } catch { setError("Could not save your audiobook position. Please try again."); }
    finally { setSaving(false); }
  }
  return <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
    {editing ? <>
      <AudioTimeInput label="Current audiobook position" value={value} onChange={setValue} disabled={saving} />
      <p className="mt-2 text-xs text-stone-500">This records a position update in Reading History. It does not add listening minutes.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-stone-900 px-3 py-2 text-white disabled:opacity-50">{saving ? "Saving…" : "Save position"}</button>
        <button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-xl border px-3 py-2">Cancel</button>
      </div>
    </> : <button type="button" onClick={() => { setValue(position == null ? "" : String(position)); setError(null); setEditing(true); }} className="font-semibold underline">Update audiobook position</button>}
    {!tracking.totals.audiobook_duration_minutes ? <p className="mt-2 text-xs text-stone-600">Total length is unknown, so percentage progress is unavailable. <button type="button" onClick={onRequestLength} className="font-semibold underline">{canEditLength ? "Add audiobook length" : "Request audiobook length"}</button></p> : null}
    {error ? <p role="alert" className="mt-2 text-red-700">{error}</p> : null}
  </div>;
}
