"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { TeacherAttention } from "./attention";

const empty: TeacherAttention = { total: 0, byStudent: {} };
const inFlight = new Map<string, Promise<TeacherAttention>>();
// Concurrent header, hub and index readers share a request, never a persistent counter.
async function readAttention() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return empty;
  const token = session.access_token;
  let pending = inFlight.get(token);
  if (!pending) {
    pending = fetch("/api/teacher/attention", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async response => response.ok ? await response.json() as TeacherAttention : empty)
      .finally(() => { if (inFlight.get(token) === pending) inFlight.delete(token); });
    inFlight.set(token, pending);
  }
  return pending;
}
export function refreshTeacherAttention() {
  inFlight.clear();
  window.dispatchEvent(new Event("teacher-attention-changed"));
}
export function useTeacherAttention(enabled = true) {
  const [attention, setAttention] = useState(empty);
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    let generation = 0;
    setAttention(empty);
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      const current = ++generation;
      void readAttention().then(value => { if (active && current === generation) setAttention(value); })
        .catch(() => { if (active && current === generation) setAttention(empty); });
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("teacher-attention-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { generation += 1; setAttention(empty); refresh(); });
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("teacher-attention-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
      subscription.unsubscribe();
    };
  }, [enabled, pathname]);
  return attention;
}
