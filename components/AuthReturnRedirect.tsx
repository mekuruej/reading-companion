"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthReturnRedirect() {
  const router = useRouter();

  useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    const looksLikeAuthReturn =
      search.includes("code=") ||
      search.includes("token_hash=") ||
      hash.includes("access_token") ||
      hash.includes("refresh_token");

    if (!looksLikeAuthReturn) return;

    let alive = true;

    async function redirectAfterAuthReturn() {
      const params = new URLSearchParams(window.location.search);
      const authCode = params.get("code");

      if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);

        if (error) {
          console.error("Error finishing auth return:", error);
        }
      } else {
        await supabase.auth.getSession();
      }

      if (!alive) return;

      router.replace("/dashboard");
    }

    void redirectAfterAuthReturn();

    return () => {
      alive = false;
    };
  }, [router]);

  return null;
}
