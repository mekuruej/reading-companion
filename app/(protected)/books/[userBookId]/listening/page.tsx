// Listening Timer
//

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { supabase } from "@/lib/supabaseClient";
import SimpleTimedSessionPage from "../_shared/timed-session/SimpleTimedSessionPage";

export default function ListeningPage() {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function redirectFullAccessUsers() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user || !userBookId) {
        setCheckingAccess(false);
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at, trial_ends_at")
        .eq("id", user.id)
        .maybeSingle();
      let profile: any = profileResult.data;
      let profileError = profileResult.error;

      if (isMissingAppAccessColumnError(profileError)) {
        const fallbackResult = await supabase
          .from("profiles")
          .select("role, is_super_teacher")
          .eq("id", user.id)
          .maybeSingle();

        profile = fallbackResult.data;
        profileError = fallbackResult.error;
      }

      if (cancelled) return;

      if (!profileError && profile && getAppAccessStatus(profile).hasFullAccess) {
        router.replace(`/books/${encodeURIComponent(userBookId)}?tab=reading&sessionMode=listening`);
        return;
      }

      setCheckingAccess(false);
    }

    void redirectFullAccessUsers();

    return () => {
      cancelled = true;
    };
  }, [router, userBookId]);

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <SimpleTimedSessionPage
      sessionMode="listening"
      eyebrow="Listening"
      title="Listening Timer"
      subtitle="Timer-only listening"
      description="Listen to this book or audiobook without word capture. Let the timer keep you company and log your listening time."
      saveSuccessMessage="Your listening session has been saved in the Reading Tab."
      startLocationLabel="Start page optional"
      endLocationLabel="End page optional"
      sessionLocationNote="Page numbers are optional. If you leave them blank, only the time will be saved. Pace stats can only be generated with page numbers."
    />
  );
}
