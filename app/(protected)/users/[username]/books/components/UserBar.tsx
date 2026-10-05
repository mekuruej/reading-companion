"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type UserBarVariant = "full" | "logoutOnly" | "labelOnly";

export default function UserBar({
  isTeacher,
  displayName,
  variant = "full",
}: {
  isTeacher: boolean;
  displayName: string | null;
  variant?: UserBarVariant;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  if (!displayName && variant !== "logoutOnly") return null;

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
        <span>Logged in as: {displayName}</span>
      </div>
    );
  }

  return isTeacher ? (
    <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
      <span>Logged in as: {displayName}</span>
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
