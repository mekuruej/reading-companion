// Books Redirect
// 
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BooksRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const redirect = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, display_name, native_language, target_language")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        router.replace("/login");
        return;
      }

      const isComplete =
        !!profile?.username &&
        !!profile?.display_name &&
        !!profile?.native_language &&
        !!profile?.target_language;

      if (!isComplete) {
        router.replace("/profile/setup");
        return;
      }

      router.replace(`/users/${profile.username}/books`);
      router.refresh();
    };

    redirect();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
      <p className="text-gray-500">Redirecting...</p>
    </main>
  );
}