"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ListeningWord } from "@/lib/listening/useListeningCapture";
export function ListeningSessionWords({ words }: {
    words: ListeningWord[];
}) {
    return <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4" aria-label="Listening session words" aria-live="polite">
  <h3 className="text-sm font-semibold text-stone-800">Words from this listening session</h3>
  {words.length ? <ul className="mt-3 space-y-3">{words.map(w => <li key={w.id} className="border-b border-stone-100 pb-2 last:border-0"><span className="font-medium">{w.surface}</span>{w.reading && <span className="ml-2 text-sm text-stone-500">{w.reading}</span>}<p className="whitespace-pre-wrap break-words text-sm text-stone-700">{w.meaning}</p></li>)}</ul> : <p className="mt-2 text-sm text-stone-500">Words you save will appear here.</p>}
 </section>;
}
export function ListeningHistoryWords({ sessionId }: {
    sessionId: string;
}) {
    const [words, setWords] = useState<ListeningWord[] | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function load() {
        if (loading || words)
            return;
        setLoading(true);
        setError("");
        try {
            const { data: session, error: sessionError } = await supabase.from("listening_capture_sessions").select("id").eq("reading_session_id", sessionId).maybeSingle();
            if (sessionError)
                throw sessionError;
            if (!session) {
                setWords([]);
                return;
            }
            const { data, error } = await supabase.from("listening_session_words").select("id,surface,reading,meaning,alternative_surface").eq("capture_session_id", session.id).order("created_at").order("id");
            if (error)
                throw error;
            setWords(data ?? []);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setLoading(false);
        }
    }
    return <details className="mt-2" onToggle={e => { if (e.currentTarget.open)
        void load(); }}><summary className="cursor-pointer text-sm text-stone-600">Captured listening words</summary>{words && <ListeningSessionWords words={words}/>} {loading && <p>Loading…</p>}{error && <button type="button" onClick={() => void load()}>Could not load words. Retry</button>}</details>;
}
