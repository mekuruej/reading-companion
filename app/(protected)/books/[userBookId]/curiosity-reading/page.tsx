// Curiosity Reading Page
//
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEnglishNativeTrackerBookMode } from "@/lib/books/englishNativeTracker";
import { supabase } from "@/lib/supabaseClient";
import { CuriosityReadingExperience } from "./WordTimerExperience";

export default function CuriosityReadingPage() {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkTrackerMode() {
      const mode = await getEnglishNativeTrackerBookMode({ supabase, userBookId });
      if (cancelled) return;

      if (mode.isEnglishNativeTrackerBook) {
        setBlocked(true);
        router.replace(`/books/${userBookId}`);
        return;
      }

      setChecking(false);
    }

    void checkTrackerMode();

    return () => {
      cancelled = true;
    };
  }, [router, userBookId]);

  if (checking || blocked) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 text-sm font-semibold text-stone-600 shadow-sm">
          Opening Book Hub...
        </div>
      </main>
    );
  }

  return <CuriosityReadingExperience experienceMode="curiosity" />;
}
