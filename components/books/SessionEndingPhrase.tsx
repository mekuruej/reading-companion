"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useSessionEndingPhrase(userBookId: string, sessionMode: string) {
  const [sessionEndingPhrase, setSessionEndingPhrase] = useState("");
  const [latestEndingPhrase, setLatestEndingPhrase] = useState("");

  useEffect(() => {
    let cancelled = false;
    setSessionEndingPhrase("");
    setLatestEndingPhrase("");
    if (userBookId) {
      void supabase.from("user_book_reading_sessions")
        .select("ending_phrase")
        .eq("user_book_id", userBookId)
        .eq("session_mode", sessionMode)
        .not("ending_phrase", "is", null)
        .order("read_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!cancelled && !error) setLatestEndingPhrase(data?.ending_phrase ?? "");
        });
    }
    return () => { cancelled = true; };
  }, [userBookId, sessionMode]);

  function markPhraseSaved() {
    if (sessionEndingPhrase.trim()) setLatestEndingPhrase(sessionEndingPhrase.trim());
    setSessionEndingPhrase("");
  }

  return { sessionEndingPhrase, setSessionEndingPhrase, latestEndingPhrase, markPhraseSaved };
}

export function SessionEndingPhraseField({ value, onChange, listening = false }: {
  value: string;
  onChange: (value: string) => void;
  listening?: boolean;
}) {
  return (
    <label className="mt-3 block text-sm text-stone-600">
      {listening ? "Last phrase you heard (optional)" : "Last phrase you read (optional)"}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={500}
        rows={2}
        placeholder="A few words to help you find where you stopped"
        className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
      />
      <span className="text-xs text-stone-500">Leave blank to skip.</span>
    </label>
  );
}

export function LatestEndingPhrase({ phrase }: { phrase: string }) {
  return phrase ? (
    <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
      <div className="font-medium">Last saved stopping point</div>
      <p className="mt-1 whitespace-pre-wrap break-words">「{phrase}」</p>
    </div>
  ) : null;
}
