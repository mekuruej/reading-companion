"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type UserBarVariant = "full" | "logoutOnly" | "labelOnly";

export default function UserBar({
  isTeacher,
  variant = "full",
}: {
  isTeacher: boolean;
  variant?: UserBarVariant;
}) {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loading = false;

    const loadUser = async () => {
      if (loading) return;
      loading = true;

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userErr || !user) {
          setLabel(null);
          return;
        }

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (profErr) {
          console.warn("UserBar: could not load profile display_name:", profErr);
        }

        setLabel(prof?.display_name || "User");
      } catch (err) {
        if (!cancelled) {
          console.error("UserBar loadUser error:", err);
          setLabel(null);
        }
      } finally {
        loading = false;
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  if (!label && variant !== "logoutOnly") return null;

  if (variant === "logoutOnly") {
    return (
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    );
  }

  if (variant === "labelOnly") {
    if (!isTeacher) return null;

    return (
      <div className="mb-4 text-sm text-gray-700">
        <span>Logged in as: {label}</span>
      </div>
    );
  }

  return isTeacher ? (
    <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
      <span>Logged in as: {label}</span>
      <button
        onClick={handleLogout}
        className="rounded-md border px-2 py-1 hover:bg-gray-100"
      >
        Log out
      </button>
    </div>
  ) : (
    <div className="mr-3 flex justify-end sm:mr-6">
      <button
        onClick={handleLogout}
        className="rounded-md border px-2 py-1 hover:bg-gray-100"
      >
        Log out
      </button>
    </div>
  );
}
