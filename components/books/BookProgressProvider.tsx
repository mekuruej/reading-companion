"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { progressMethod, shouldPromptProgress, progressLabels, matchingTotal, type ProgressTrackingMethod, type ProgressTotals } from "@/lib/books/readingProgress";
import type { PersonalTrackingStatus } from "@/lib/personalTracking";

type ContextValue = {
  method: ProgressTrackingMethod | null;
  totals: ProgressTotals;
  loaded: boolean;
  canChoose: boolean;
  editorOpen: boolean;
  choice: ProgressTrackingMethod | null;
  saving: boolean;
  error: string | null;
  choose: (method: ProgressTrackingMethod) => void;
  saveMethod: () => Promise<void>;
  closeEditor: () => void;
  requireMethod: () => boolean;
  changeMethod: () => void;
  refresh: () => Promise<void>;
};
const Context = createContext<ContextValue>({
  method: null, totals: {}, loaded: false, canChoose: false, editorOpen: false,
  choice: null, saving: false, error: null, choose: () => {}, saveMethod: async () => {},
  closeEditor: () => {}, requireMethod: () => false, changeMethod: () => {}, refresh: async () => {},
});
export const useBookProgress = () => useContext(Context);

function suggestedMethod(totals: ProgressTotals) {
  const pages = matchingTotal("page", totals);
  const locations = matchingTotal("kindle_location", totals);
  return locations && !pages ? "kindle_location" : pages && !locations ? "page" : null;
}

export function BookProgressProvider({ userBookId, children }: { userBookId: string; children: ReactNode }) {
  const pathname = usePathname();
  const isBookHub = pathname?.replace(/\/$/, "") === `/books/${userBookId}`;
  const dialogRef = useRef<HTMLElement>(null);
  const [method, setMethod] = useState<ProgressTrackingMethod | null>(null);
  const [totals, setTotals] = useState<ProgressTotals>({});
  const [loaded, setLoaded] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<ProgressTrackingMethod | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const [{ data, error: loadError }, auth] = await Promise.all([
        supabase.from("user_books").select("user_id, progress_tracking_method, personal_tracking_status, status, started_at, finished_at, dnf_at, books(page_count,kindle_location_count)").eq("id", userBookId).single(),
        supabase.auth.getUser(),
      ]);
      if (loadError) throw loadError;
      const book = Array.isArray(data.books) ? data.books[0] : data.books;
      const next = progressMethod(data.progress_tracking_method);
      const own = auth.data.user?.id === data.user_id;
      setOwnerId(own ? data.user_id : null);
      setMethod(next);
      setTotals(book ?? {});
      setLoaded(true);
      setError(null);
      const prompt = own && shouldPromptProgress(data);
      setOpen(prompt);
      if (prompt) setChoice(suggestedMethod(book ?? {}));
    } catch {
      setError("Could not load progress tracking. Please reload to try again.");
    }
  }, [userBookId]);

  useEffect(() => { void refresh(); }, [refresh, pathname]);
  useEffect(() => {
    const update = () => { void refresh(); };
    window.addEventListener("book-progress-changed", update);
    return () => window.removeEventListener("book-progress-changed", update);
  }, [refresh]);

  // Standalone timers/history retain a chooser when no Book Status card is present.
  // On the hub, the editor is rendered only inside that card, even while it loads.
  const showDialog = open && !isBookHub;
  useEffect(() => {
    if (!showDialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, [showDialog]);

  function changeMethod() {
    if (!ownerId) return;
    setChoice(method ?? suggestedMethod(totals));
    setError(null);
    setOpen(true);
  }
  async function saveMethod() {
    if (!choice || !ownerId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { data, error: saveError } = await supabase.from("user_books")
        .update({ progress_tracking_method: choice }).eq("id", userBookId).eq("user_id", ownerId)
        .select("progress_tracking_method").single();
      if (saveError) throw saveError;
      setMethod(progressMethod(data.progress_tracking_method));
      setOpen(false);
    } catch {
      setError("Could not save the tracking method. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return <Context.Provider value={{
    method, totals, loaded, canChoose: !!ownerId, editorOpen: open, choice, saving, error,
    choose: setChoice, saveMethod, closeEditor: () => setOpen(false), refresh, changeMethod,
    requireMethod: () => {
      if (!loaded) return false;
      if (method) return true;
      changeMethod();
      return false;
    },
  }}>
    {children}
    {error && !open && !isBookHub ? <div role="alert" className="fixed bottom-4 left-4 z-50 rounded-xl border bg-white p-4 text-sm text-red-700">{error}</div> : null}
    {showDialog ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <section ref={dialogRef} tabIndex={-1} onKeyDown={(event) => {
        if (event.key === "Escape" && !saving) { setOpen(false); return; }
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first?.focus(); }
      }} role="dialog" aria-modal="true" aria-labelledby="progress-method-title" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <ProgressTrackingEditor allowDismiss />
      </section>
    </div> : null}
  </Context.Provider>;
}

function ProgressTrackingEditor({ allowDismiss = false }: { allowDismiss?: boolean }) {
  const tracking = useBookProgress();
  return <div className="min-w-0 space-y-3">
    <h3 id="progress-method-title" className="text-sm font-semibold leading-5 text-stone-900">How will you track your progress in this copy?</h3>
    <p className="text-xs leading-5 text-stone-600">Kindle Locations are the position numbers shown by Kindle, separate from printed pages.</p>
    {tracking.method ? <p className="text-xs leading-5 text-amber-800">Earlier entries keep their original units. Record your next position in the new unit when you log your reading.</p> : null}
    <fieldset disabled={tracking.saving} className="space-y-2">
      <legend className="sr-only">Progress tracking method</legend>
      {(["page", "kindle_location", "percent"] as const).map((value) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${tracking.choice === value ? "border-violet-400 bg-violet-50" : "border-violet-100 bg-white"}`}>
        <input type="radio" name="progress-method" checked={tracking.choice === value} onChange={() => tracking.choose(value)} className="shrink-0 accent-violet-700" />
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-2 text-sm text-stone-800">
          <span>{progressLabels(value).name}</span>
          {value !== "percent" && matchingTotal(value, tracking.totals) ? <span className="text-xs text-stone-500">Total {matchingTotal(value, tracking.totals)}</span> : null}
        </span>
      </label>)}
    </fieldset>
    {tracking.error ? <p role="alert" className="text-xs text-red-700">{tracking.error}</p> : null}
    <div className="flex flex-wrap justify-end gap-2">
      {tracking.method || allowDismiss ? <button type="button" disabled={tracking.saving} onClick={tracking.closeEditor} className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-stone-700">{tracking.method ? "Cancel" : "Later"}</button> : null}
      <button type="button" disabled={!tracking.choice || tracking.saving} onClick={() => void tracking.saveMethod()} className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">{tracking.saving ? "Saving…" : "Save method"}</button>
    </div>
  </div>;
}

export function ProgressTrackingSettings({ readingStatus }: { readingStatus: PersonalTrackingStatus }) {
  const tracking = useBookProgress();
  if (tracking.error && !tracking.loaded) return <p role="alert" className="text-xs text-red-700">{tracking.error}</p>;
  if (!tracking.canChoose) return null;
  if (!tracking.method && readingStatus !== "reading" && !tracking.editorOpen) return null;
  const expanded = tracking.editorOpen || (!tracking.method && readingStatus === "reading");
  return <div className="min-w-0 py-2">
    {expanded ? <div className="rounded-xl border border-violet-200 bg-white/80 p-3"><ProgressTrackingEditor /></div> : <>
      <button type="button" onClick={tracking.changeMethod} aria-expanded={false} className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-left text-sm font-semibold text-stone-800 shadow-sm hover:border-violet-400 hover:bg-violet-50">
        Progress tracking{tracking.method ? `: ${progressLabels(tracking.method).name}` : " — choose method"}
      </button>
      {tracking.error ? <p role="alert" className="mt-1 text-xs text-red-700">{tracking.error}</p> : null}
    </>}
  </div>;
}
