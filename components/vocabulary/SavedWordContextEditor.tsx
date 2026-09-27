"use client";
import { useState } from "react";
import WordContextFields from "./WordContextFields";
import { wordContextPayload, type WordContext } from "@/lib/vocabulary/wordContext";

export default function SavedWordContextEditor({ value, alternativeSurface, onSave }: {
  value: WordContext; alternativeSurface?: string | null;
  onSave: (value: WordContext & { alternative_surface: string | null }) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [alternative, setAlternative] = useState(alternativeSurface ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  return <details className="mt-2">
    <summary className="cursor-pointer text-xs font-semibold text-stone-600">Word context</summary>
    <div className="mt-2 space-y-2">
      <label className="block text-xs text-stone-600">Alternative spelling / kanji
        <input className="w-full rounded-lg border px-2 py-1.5 text-sm" value={alternative} onChange={e => setAlternative(e.target.value)} />
      </label>
      <WordContextFields teacher value={draft} onChange={setDraft} />
      <button type="button" disabled={saving} className="rounded-lg border bg-white px-2 py-1 text-xs font-semibold" onClick={async () => {
        setSaving(true); setMessage("");
        try { await onSave({ ...wordContextPayload(draft), alternative_surface: alternative.trim() || null }); setMessage("Saved"); }
        catch (error) { setMessage(error instanceof Error ? error.message : "Could not save"); }
        finally { setSaving(false); }
      }}>{saving ? "Saving..." : "Save context"}</button>
      {message ? <p role="status" className="text-xs text-stone-600">{message}</p> : null}
    </div>
  </details>;
}
