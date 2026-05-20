// Account Settings
//

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileShell from "@/components/profile/ProfileShell";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  display_name: string | null;
  username: string | null;
};

export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        router.replace("/login");
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (!mounted) return;

      if (error) {
        setMessage(error.message ?? "Could not load account settings.");
      } else {
        setProfile(data ?? null);
      }

      setLoading(false);
    }

    void loadAccount();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <ProfileShell
      title="Account Settings"
      description="Private login and account details. These are not part of your public reader profile."
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Login
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Username
                </div>
                <div className="mt-1 text-sm font-semibold text-stone-900">
                  {loading ? "..." : profile?.username || "Not set"}
                </div>
              </div>

              <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Display name
                </div>
                <div className="mt-1 text-sm font-semibold text-stone-900">
                  {loading ? "..." : profile?.display_name || "Not set"}
                </div>
              </div>
            </div>
          </div>
        </div>
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
      </div>
    </ProfileShell>
  );
}
