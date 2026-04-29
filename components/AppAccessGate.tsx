// App Access Gate
//

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAppAccessStatus } from "@/lib/appAccess";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  children: React.ReactNode;
};

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

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, app_access_type, app_access_expires_at")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          console.error("Error checking app access:", error);

          if (!cancelled) {
            setRedirectingTo("/login");
            setChecking(false);
            router.replace("/login");
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