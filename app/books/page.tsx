"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BooksRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profile?.username) {
        router.replace(`/users/${profile.username}/books`);
      } else {
        router.replace("/login");
      }
    };

    redirect();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </main>
  );
}