// Teacher Access Gate
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  children: React.ReactNode;
};

export default function TeacherAccessGate({ children }: Props) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkTeacherAccess() {
      setChecking(true);
      setAllowed(false);
      setMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!cancelled) {
            router.replace("/login");
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_super_teacher")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error checking teacher access:", profileError);

          if (!cancelled) {
            setMessage("Could not check teacher access.");
            setAllowed(false);
            setChecking(false);
          }
          return;
        }

        const canAccess =
          profile?.role === "teacher" ||
          profile?.role === "super_teacher" ||
          !!profile?.is_super_teacher;

        if (!cancelled) {
          setAllowed(canAccess);
          setMessage(canAccess ? "" : "This page is only available to teachers.");
          setChecking(false);
        }
      } catch (err) {
        console.error("Unexpected teacher access error:", err);

        if (!cancelled) {
          setMessage("Could not check teacher access.");
          setAllowed(false);
          setChecking(false);
        }
      }
    }

    void checkTeacherAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return <div className="p-6 text-sm text-stone-600">Checking teacher access...</div>;
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Teacher Access
          </p>

          <h1 className="mt-2 text-2xl font-black text-stone-900">
            Teacher area unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "This page is only available to teachers."}
          </p>

          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}