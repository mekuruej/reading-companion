"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const initialReadingSessionHref = "https://scheduler.zoom.us/mekuru/initial-japanese";

export default function GuidedTrialSchedulingAction() {
  const [state, setState] = useState<"loading" | "approved" | "signed-out" | "unapproved" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    async function checkApproval() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) {
          if (!cancelled) setState("signed-out");
          return;
        }
        const response = await fetch("/api/japanese-learning/request", {
          headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not check approval.");
        const result = await response.json();
        if (!cancelled) setState(result.request?.status === "approved" ? "approved" : "unapproved");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void checkApproval();
    return () => { cancelled = true; };
  }, []);

  if (state === "loading") return <p role="status" className="text-sm text-stone-600">Checking guided-trial approval…</p>;
  if (state === "approved") return (
    <a href={initialReadingSessionHref} target="_blank" rel="noreferrer"
      className="inline-flex rounded-full bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2">
      Schedule your initial reading session
    </a>
  );
  if (state === "signed-out") return (
    <p className="text-sm text-stone-600">
      <Link href="/login" className="font-semibold underline">Sign in</Link> with your approved tester account, then return to this page to schedule.
    </p>
  );
  return <p role="status" className="text-sm text-stone-600">
    {state === "error" ? "We couldn’t check your approval. Please reload this page to try again." : "Scheduling is available to approved guided-trial participants. Please contact the person who shared this link if you expected approval."}
  </p>;
}
