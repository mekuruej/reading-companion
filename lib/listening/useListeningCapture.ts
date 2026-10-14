"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { readPersistedTimedSession, hasUnfinishedTimedSession, writePersistedTimedSession } from "@/app/(protected)/books/[userBookId]/_shared/timed-session/timedSessionPersistence";
export type ListeningWord = {
    id: string;
    surface: string;
    reading: string;
    meaning: string;
    alternative_surface: string;
};
type Identity = {
    id: string;
    owner: string;
    startedAt: number;
};
type Pending = {
    id: string;
    word: Omit<ListeningWord, "id">;
};
export function useListeningCapture(book: string, enabled: boolean) {
    const [initializationAttempt, setInitializationAttempt] = useState(0);
    const recoveryBlocked = useRef(false);
    const [owner, setOwner] = useState("");
    const [identity, setIdentity] = useState<Identity | null>(null);
    const identityRef = useRef<Identity | null>(null);
    const [words, setWords] = useState<ListeningWord[]>([]);
    const [completed, setCompleted] = useState(false);
    const [ready, setReady] = useState(!enabled);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const saving = useRef<Promise<void> | null>(null);
    const finalizing = useRef(false);
    const pending = useRef<Pending | null>(null);
    const pendingKey = (s: Identity) => `listening-pending:${s.owner}:${book}:${s.id}`;
    const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
    async function ensure(s: Identity) {
        const { data, error } = await supabase.rpc("start_listening_capture", { p_id: s.id, p_book: book, p_started_at: new Date(s.startedAt).toISOString() });
        if (error) {
            const migrationHint = /PGRST202|PGRST205|42883|42P01|schema cache|does not exist/i.test(`${error.code ?? ""} ${error.message}`)
                ? " The listening-capture migration may be missing from this database."
                : "";
            const failure = new Error(`Could not initialize listening capture.${migrationHint} ${error.message}`);
            setError(failure.message);
            throw failure;
        }
        return data;
    }
    useEffect(() => {
        if (!enabled)
            return;
        let cancelled = false;
        void (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user)
                    throw new Error("Sign in to capture listening words.");
                if (cancelled)
                    return;
                setOwner(user.id);
                let saved = readPersistedTimedSession("listening", book);
                recoveryBlocked.current = Boolean(saved && hasUnfinishedTimedSession(saved));
                // Upgrade only an already-started legacy timer, never create untimed capture.
                if (saved && !saved.captureSessionId && hasUnfinishedTimedSession(saved)) {
                    const legacy = { id: crypto.randomUUID(), owner: user.id, startedAt: saved.startedAt ?? Date.now() - saved.accumulatedElapsedMs };
                    await ensure(legacy); // Verifies book ownership before adopting local state.
                    saved = { ...saved, captureSessionId: legacy.id, captureOwnerId: legacy.owner, captureStartedAt: legacy.startedAt };
                    if (!writePersistedTimedSession(saved)) throw new Error("Could not preserve the recovered timer. Allow local storage and reload.");
                }
                if (saved?.captureSessionId && saved.captureOwnerId && saved.captureOwnerId !== user.id && hasUnfinishedTimedSession(saved)) {
                    throw new Error("An unfinished listening session belongs to another account. Sign in as its owner to recover it.");
                }
                if (saved?.captureSessionId && saved.captureOwnerId === user.id && saved.captureStartedAt) {
                    const s = { id: saved.captureSessionId, owner: user.id, startedAt: saved.captureStartedAt };
                    identityRef.current = s;
                    setIdentity(s);
                    const raw = localStorage.getItem(pendingKey(s));
                    if (raw)
                        pending.current = JSON.parse(raw);
                    const session = await ensure(s);
                    const { data, error } = await supabase.from("listening_session_words").select("id,surface,reading,meaning,alternative_surface").eq("capture_session_id", s.id).order("created_at").order("id");
                    if (error)
                        throw new Error(error.message);
                    if (cancelled)
                        return;
                    recoveryBlocked.current = false;
                    setWords(data ?? []);
                    setCompleted(Boolean(session.completed_at));
                    if (pending.current) {
                        const exists = data?.some(w => w.id === pending.current?.id);
                        if (exists) {
                            pending.current = null;
                            localStorage.removeItem(pendingKey(s));
                        }
                        else
                            setError("A word save was interrupted. Retry recovery or save the session to retry it.");
                    }
                }
            }
            catch (e) {
                if (!cancelled)
                    fail(e);
            }
            finally {
                if (!cancelled)
                    setReady(true);
            }
        })();
        return () => { cancelled = true; };
    }, [book, enabled, initializationAttempt]);
    function start(persist: (identity: Identity) => boolean) {
        if (!owner || !ready || recoveryBlocked.current || saving.current || finalizing.current)
            return null;
        const s = { id: crypto.randomUUID(), owner, startedAt: Date.now() };
        if (!persist(s)) {
            setError("Allow local storage before starting so your listening session can be recovered.");
            return null;
        }
        identityRef.current = s;
        setIdentity(s);
        setWords([]);
        setCompleted(false);
        setError("");
        pending.current = null;
        // Identity is persisted with the timer synchronously by the caller before network I/O.
        return s;
    }
    async function writePending(s: Identity) {
        if (!pending.current)
            return;
        await ensure(s);
        const { data, error } = await supabase.rpc("save_listening_word", { p_session: s.id, p_id: pending.current.id, p_word: pending.current.word });
        if (error)
            throw new Error(error.message);
        setWords(old => old.some(w => w.id === data.id) ? old : [...old, data]);
        localStorage.removeItem(pendingKey(s));
        pending.current = null;
    }
    async function save(word: Omit<ListeningWord, "id">) {
        if (saving.current || finalizing.current)
            return false;
        const s = identityRef.current;
        if (!s || completed)
            return false;
        if (!word.surface.trim() || word.surface.length > 1000 || word.reading.length > 1000 || word.alternative_surface.length > 1000 || word.meaning.length > 10000) {
            setError("Enter a word up to 1,000 characters and a meaning up to 10,000 characters.");
            return false;
        }
        setBusy(true);
        setError("");
        try {
            // Retain the exact request and ID across ambiguous responses and refreshes.
            if (!pending.current)
                pending.current = { id: crypto.randomUUID(), word };
            localStorage.setItem(pendingKey(s), JSON.stringify(pending.current));
            const task = writePending(s);
            saving.current = task;
            await task;
            return true;
        }
        catch (e) {
            fail(e);
            return false;
        }
        finally {
            saving.current = null;
            setBusy(false);
        }
    }
    async function finish(history: Record<string, unknown>) {
        if (finalizing.current)
            return false;
        const s = identityRef.current;
        if (!s) {
            setError("Start the listening timer before saving a session.");
            return false;
        }
        finalizing.current = true;
        setIsFinalizing(true);
        setBusy(true);
        setError("");
        try {
            if (saving.current)
                await saving.current;
            await writePending(s);
            await ensure(s);
            const { error } = await supabase.rpc("finish_listening_capture", { p_session: s.id, p_history: history });
            if (error)
                throw new Error(error.message);
            setCompleted(true);
            return true;
        }
        catch (e) {
            fail(e);
            return false;
        }
        finally {
            finalizing.current = false;
            setIsFinalizing(false);
            setBusy(false);
        }
    }
    async function recover() {
        const s = identityRef.current;
        if (saving.current || finalizing.current) return;
        if (!s) {setReady(false);setError("");setInitializationAttempt(n => n + 1);return;}
        finalizing.current = true;
        setIsFinalizing(true);
        setBusy(true);
        setError("");
        try {
            const session = await ensure(s);
            await writePending(s);
            const { data, error } = await supabase.from("listening_session_words").select("id,surface,reading,meaning,alternative_surface").eq("capture_session_id", s.id).order("created_at").order("id");
            if (error)
                throw new Error(error.message);
            recoveryBlocked.current = false;
            setWords(data ?? []);
            setCompleted(Boolean(session.completed_at));
        }
        catch (e) {
            fail(e);
        }
        finally {
            finalizing.current = false;
            setIsFinalizing(false);
            setBusy(false);
        }
    }
    return { owner, identity, words, completed, ready, busy, isFinalizing, error, start, save, finish, ensure, recover };
}
