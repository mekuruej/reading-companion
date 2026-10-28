"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ResumeBookmark, ResumeBookmarkKind } from "@/lib/books/resumeBookmark.mjs";
import { parseProgressPosition } from "@/lib/books/readingProgress";

type BookmarkResponse = { available?: boolean; eligible?: boolean; pageCount?: number | null; bookmark?: ResumeBookmark | null; error?: string };
type Draft = { kind: ResumeBookmarkKind | null; phrase: string; endingPage?: string; error?: string };
const emptyDraft: Draft = { kind: null, phrase: "" };
const emptyState = { available: false, eligible: false, pageCount: null as number | null, bookmark: null as ResumeBookmark | null };

// Each request rechecks the authenticated owner. Never reuse a previous owner's token.
async function requestBookmark(userBookId: string, owner: string, method: "GET" | "PUT", payload?: unknown): Promise<BookmarkResponse> {
  const { data, error } = await supabase.auth.getSession();
  const session = data.session;
  if (error || !session?.access_token || session.user.id !== owner) throw new Error("Please sign in to manage this resume bookmark.");
  const response = await fetch(`/api/books/${encodeURIComponent(userBookId)}/resume-bookmark`, {
    method,
    headers: { authorization: `Bearer ${session.access_token}`, ...(payload ? { "content-type": "application/json" } : {}) },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.available === false && method === "PUT") throw new Error(result.error || "Could not save the resume bookmark.");
  return result;
}

export function useResumeBookmark(userBookId: string, enabled: boolean) {
  const [owner, setOwner] = useState<string | null>(null);
  const scope = `${owner ?? ""}:${userBookId}:${enabled}`;
  const active = useRef(scope);
  active.current = scope; // Mask old state immediately, before effects run for a new book.
  const mounted = useRef(false);
  const requestVersion = useRef(0);
  const saving = useRef(false);
  const [state, setState] = useState({ scope: "", ...emptyState, loading: false, error: null as string | null });
  const [draftState, setDraftState] = useState({ scope: "", ...emptyDraft });
  const draft = draftState.scope === scope ? draftState : emptyDraft;
  const current = state.scope === scope ? state : { ...emptyState, loading: enabled && !!userBookId, error: null };

  useEffect(() => {
    mounted.current = true;
    let live = true;
    let authVersion = 0;
    let lastOwner: string | null = null;
    const accept = (id: string | null) => {
      if (!live) return;
      if (id !== lastOwner) {
        active.current = "";
        requestVersion.current++;
        setDraftState({ scope: "", ...emptyDraft });
        setState({ scope: "", ...emptyState, loading: false, error: null });
        lastOwner = id;
      }
      setOwner(id);
    };
    const initial = authVersion;
    void supabase.auth.getSession().then(({ data }) => { if (initial === authVersion) accept(data.session?.user.id ?? null); }).catch(() => { if (initial === authVersion) accept(null); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { authVersion++; accept(session?.user.id ?? null); });
    return () => { live = false; mounted.current = false; active.current = ""; requestVersion.current++; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { setDraftState({ scope, ...emptyDraft }); }, [scope]);

  const refresh = useCallback(async () => {
    if (!enabled || !userBookId || !owner || saving.current) return;
    const version = ++requestVersion.current;
    setState(previous => ({ ...(previous.scope === scope ? previous : { ...emptyState, scope }), loading: true, error: null }));
    try {
      const result = await requestBookmark(userBookId, owner, "GET");
      if (!mounted.current || active.current !== scope || version !== requestVersion.current) return;
      setState({ scope, available: result.available === true, eligible: result.eligible === true, pageCount: result.pageCount ?? null, bookmark: result.bookmark ?? null, loading: false, error: null });
    } catch (error) {
      if (!mounted.current || active.current !== scope || version !== requestVersion.current) return;
      setState({ scope, ...emptyState, loading: false, error: error instanceof Error ? error.message : "Could not load the resume bookmark." });
    }
  }, [enabled, owner, scope, userBookId]);

  useEffect(() => { void refresh(); return () => { requestVersion.current++; }; }, [refresh]);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ userBookId: string; owner: string }>).detail;
      if (detail?.userBookId === userBookId && detail.owner === owner) void refresh();
    };
    window.addEventListener("resume-bookmark-updated", update);
    return () => window.removeEventListener("resume-bookmark-updated", update);
  }, [refresh, userBookId, owner]);

  const save = useCallback(async (endingPageText: string) => {
    if (!draft.kind || !current.available || !current.eligible || !owner) return { saved: false, skipped: true };
    if (saving.current) return { saved: false, skipped: false, error: "A bookmark save is already in progress." };
    const page = parseProgressPosition(endingPageText, "page", current.pageCount);
    const validation = page.error || (page.value == null ? "Enter a valid ending page." : null);
    setDraftState({ scope, ...draft, endingPage: endingPageText });
    const fail = (message: string) => {
      if (mounted.current && active.current === scope) setDraftState(previous => ({ ...previous, scope, error: message }));
      return { saved: false, skipped: false, error: message };
    };
    if (validation) return fail(validation);
    saving.current = true;
    const version = ++requestVersion.current; // Invalidate older GETs before writing.
    try {
      const result = await requestBookmark(userBookId, owner, "PUT", { kind: draft.kind, endingPage: page.value, phrase: draft.phrase });
      if (!mounted.current || active.current !== scope || version !== requestVersion.current) return { saved: false, skipped: true };
      setState(previous => ({ ...previous, bookmark: result.bookmark ?? null, pageCount: result.pageCount ?? null, error: null, loading: false }));
      setDraftState({ scope, ...emptyDraft });
      window.dispatchEvent(new CustomEvent("resume-bookmark-updated", { detail: { userBookId, owner } }));
      return { saved: true, skipped: false };
    } catch (error) {
      if (!mounted.current || active.current !== scope || version !== requestVersion.current) return { saved: false, skipped: true };
      return fail(error instanceof Error ? error.message : "Could not save the resume bookmark.");
    } finally { saving.current = false; }
  }, [current.available, current.eligible, current.pageCount, draft, owner, scope, userBookId]);

  return {
    ...current, error: draft.error ?? current.error, refresh, save, choice: draft.kind, phrase: draft.phrase,
    retry: () => save(draft.endingPage ?? ""),
    retryEndingPage: draft.endingPage === undefined ? null : parseProgressPosition(draft.endingPage, "page", current.pageCount).value,
    canRetry: !!draft.error && !!draft.kind && draft.endingPage !== undefined,
    setChoice: (kind: ResumeBookmarkKind | null) => setDraftState(previous => ({ scope, ...(previous.scope === scope ? previous : emptyDraft), kind })),
    setPhrase: (phrase: string) => setDraftState(previous => ({ scope, ...(previous.scope === scope ? previous : emptyDraft), phrase })),
    skip: () => { setDraftState({ scope, ...emptyDraft }); setState(previous => ({ ...previous, error: null })); },
  };
}
