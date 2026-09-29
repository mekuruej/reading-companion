"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isValidStrokeCount } from "@/lib/kanji/strokeCount";

export default function KanjiStrokeCountEditor({ kanji }: { kanji: string }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase.from("kanji_radicals").select("stroke_count").eq("kanji", kanji).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        const next = data?.stroke_count == null ? "" : String(data.stroke_count);
        setValue(next); setSaved(next); setLoading(false);
        setMessage(error ? "Could not load Stroke Count." : "");
      });
    return () => { active = false; };
  }, [kanji]);

  async function save() {
    setSaving(true); setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/teacher/kanji-radicals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ kanji, stroke_count: Number(value) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save Stroke Count.");
      setSaved(value); setMessage("Stroke Count saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save Stroke Count.");
    } finally { setSaving(false); }
  }

  return <div className="rounded-xl border border-stone-200 bg-white p-3 md:col-span-full">
    <label className="text-sm font-semibold">Stroke Count — {kanji}
      <input type="number" min="1" step="1" value={value} disabled={loading || saving}
        onChange={event => setValue(event.target.value)}
        className="mx-3 w-24 rounded-lg border border-stone-300 p-2" />
    </label>
    <button type="button" onClick={() => void save()}
      disabled={loading || saving || value === saved || !isValidStrokeCount(Number(value))}
      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {saving ? "Saving…" : "Save Stroke Count"}
    </button>
    <p className="mt-1 text-xs text-stone-500">Whole kanji strokes. Shared by all quizzes; separate from word readings and component counts.</p>
    <p role="status" className="text-sm">{message || (value !== saved ? "Unsaved Stroke Count" : "")}</p>
  </div>;
}
