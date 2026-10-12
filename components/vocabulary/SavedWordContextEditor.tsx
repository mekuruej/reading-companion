"use client";
import WordFieldGuide from "@/components/vocabulary/WordFieldGuide";

import AlternativeSpellingField from "./AlternativeSpellingField";
import { useState } from "react";
import WordContextFields from "./WordContextFields";
import { wordContextPayload, type WordContext } from "@/lib/vocabulary/wordContext";

export default function SavedWordContextEditor({ value, alternativeSurface, onSave }: {
  value: WordContext & { surface?: string | null }; alternativeSurface?: string | null;
  onSave: (value: WordContext & { surface: string; alternative_surface: string | null }) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [main, setMain] = useState(value.surface ?? "");
  const [alternative, setAlternative] = useState(alternativeSurface ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  return <details className="mt-2">
    <summary className="cursor-pointer text-xs font-semibold text-stone-600">Word context</summary>
    <div className="mt-2 space-y-2">
      <label className="block text-xs">Main word<input className="w-full rounded border p-2" value={main} onChange={e => setMain(e.target.value)} /><WordFieldGuide field="word" /></label>
      <AlternativeSpellingField main={main} value={alternative} onChange={setAlternative} onPromote={() => { setMain(alternative.trim()); setAlternative(main); }} />
      <WordContextFields teacher value={draft} onChange={setDraft} />
      <button type="button" disabled={saving || !main.trim()} className="rounded-lg border bg-white px-2 py-1 text-xs font-semibold" onClick={async () => {
        setSaving(true); setMessage("");
        try { await onSave({ ...wordContextPayload(draft), surface: main.trim(), alternative_surface: alternative.trim() || null }); setMessage("Saved"); }
        catch (error) { setMessage(error instanceof Error ? error.message : "Could not save"); }
        finally { setSaving(false); }
      }}>{saving ? "Saving..." : "Save context"}</button>
      {message ? <p role="status" className="text-xs text-stone-600">{message}</p> : null}
    </div>
  </details>;
}
