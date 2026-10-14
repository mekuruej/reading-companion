"use client";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { VisibilityFeature } from "@/lib/vocabulary/personalVisibility";

type Change = { wordId: string; bookId: string; feature: VisibilityFeature; hidden: boolean };
// Commit before removing the card. A failed request leaves the card and Undo available.
export function usePersonalVisibility(onSaved: (change: Change) => void) {
  const locked = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<Change | null>(null);
  async function save(change: Change) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.rpc("set_book_word_visibility", {
        p_word: change.wordId, p_book: change.bookId, p_feature: change.feature, p_hidden: change.hidden,
      });
      if (error) throw error;
      onSavedRef.current(change);
      setUndo(change.hidden ? { ...change, hidden: false } : null);
    } catch (error) {
      setError(`Could not save visibility. Please retry. ${error instanceof Error ? error.message : ""}`);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const notice = (error || undo) ? (
    <div className="fixed bottom-4 left-1/2 z-50 w-max max-w-[90vw] -translate-x-1/2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 shadow-lg"
      onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      {error ? <p role="alert">{error}</p> : null}
      {undo ? <div role="status">Hidden · <button type="button" className="font-semibold underline" disabled={busy}
        onClick={() => void save(undo)}>Undo</button></div> : null}
    </div>
  ) : null;
  return { save, busy, notice, isSaving: () => locked.current };
}
