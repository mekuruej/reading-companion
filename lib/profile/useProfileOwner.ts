"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Local profile-page guard; same-user refreshes never replace an editing draft. */
export function useProfileOwner() {
  const [ownerId, setOwnerId] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const identity = useRef<string | null | undefined>(undefined);
  const mounted = useRef(false);
  const isCurrentOwner = useCallback((id: string) => mounted.current && identity.current === id, []);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let revision = 0;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      revision += 1;
      const next = event === "SIGNED_OUT" ? null : session?.user?.id ?? null;
      identity.current = next;
      setOwnerId(next);
      setError(false);
    });
    const initialRevision = revision;
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active || initialRevision !== revision) return;
      if (authError) { setError(true); return; }
      identity.current = data.user?.id ?? null;
      setOwnerId(identity.current);
    }).catch(() => { if (active && initialRevision === revision) setError(true); });
    return () => {
      active = false;
      mounted.current = false;
      identity.current = undefined;
      subscription.unsubscribe();
    };
  }, []);
  return { ownerId, error, isCurrentOwner };
}
