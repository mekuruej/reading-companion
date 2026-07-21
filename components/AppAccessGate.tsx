// App Access Gate
//

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  children: React.ReactNode;
};

type AccessProfileRow = {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
};

function isMissingColumnError(error: any) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export default function AppAccessGate({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [redirectingTo, setRedirectingTo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      setChecking(true);
      setAllowed(false);
      setRedirectingTo(null);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (!cancelled) {
            setRedirectingTo("/login");
            setChecking(false);
            router.replace("/login");
          }
          return;
        }

        const profileResult = await supabase
          .from("profiles")
          .select(
            "role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at, trial_ends_at"
          )
          .eq("id", session.user.id)
          .maybeSingle();
        let profile = profileResult.data as AccessProfileRow | null;
        let error = profileResult.error;

        if (isMissingColumnError(error)) {
          const fallback = await supabase
            .from("profiles")
            .select("role, is_super_teacher, app_access_type, app_access_expires_at")
            .eq("id", session.user.id)
            .maybeSingle();

          profile = fallback.data as AccessProfileRow | null;
          error = fallback.error;
        }

        if (error) {
          console.error("Error checking app access:", error);

          if (!cancelled) {
            setRedirectingTo("/login");
            setChecking(false);
            router.replace("/login");
          }
          return;
        }

        if (!profile) {
          if (!cancelled) {
            if (
              pathname === "/community/profile/settings" ||
              pathname === "/community/profile/setup"
            ) {
              setAllowed(true);
              setChecking(false);
              return;
            }

            setRedirectingTo("/community/profile/setup");
            setChecking(false);
            router.replace("/community/profile/setup");
          }
          return;
        }

        const isPrivilegedAppUser =
          profile.role === "teacher" ||
          profile.role === "admin" ||
          profile.role === "super_teacher" ||
          profile.is_super_teacher === true;

        if (isPrivilegedAppUser) {
          if (!cancelled) {
            setAllowed(true);
            setChecking(false);
          }
          return;
        }

        const status = getAppAccessStatus(profile);

        if (!status.hasAccess) {
          if (!cancelled) {
            if (pathname === "/trial-ended") {
              setAllowed(true);
              setChecking(false);
              return;
            }

            setRedirectingTo("/trial-ended");
            setChecking(false);
            router.replace("/trial-ended");
          }
          return;
        }

        if (!cancelled) {
          setAllowed(true);
          setChecking(false);
        }
      } catch (err) {
        console.error("Unexpected error checking app access:", err);

        if (!cancelled) {
          setRedirectingTo("/login");
          setChecking(false);
          router.replace("/login");
        }
      }
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (checking) {
    return <div className="p-6 text-sm text-stone-600">Checking access...</div>;
  }

  if (!allowed) {
    return (
      <div className="p-6 text-sm text-stone-600">
        Redirecting{redirectingTo ? ` to ${redirectingTo}` : ""}...
      </div>
    );
  }

  return <>{children}</>;
}
