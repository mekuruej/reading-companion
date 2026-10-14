"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { sessionProgressLabel, sessionEnd } from "@/lib/books/readingProgress";
export function ListeningStoppingPoint({ userBookId, refreshKey }: {
    userBookId: string;
    refreshKey?: unknown;
}) {
    const [point, setPoint] = useState<{
        position: string;
        phrase: string;
    } | null>(null);
    useEffect(() => {
        let cancelled = false;
        void supabase.from("user_book_reading_sessions")
            .select("ending_phrase,end_page,end_position,tracking_unit").eq("user_book_id", userBookId).eq("session_mode", "listening")
            .order("read_on", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data, error }) => {
            if (cancelled || error)
                return;
            const end = data ? sessionEnd(data) : null;
            setPoint(data ? { position: end != null ? sessionProgressLabel(data) : "", phrase: data.ending_phrase ?? "" } : null);
        });
        return () => { cancelled = true; };
    }, [userBookId, refreshKey]);
    return point && (point.position || point.phrase) ? <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600"><div className="font-medium">Last saved stopping point</div>{point.position && <p>{point.position}</p>}{point.phrase && <p className="whitespace-pre-wrap break-words">「{point.phrase}」</p>}</div> : null;
}
