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

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      setChecking(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!cancelled) router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, app_access_type, app_access_expires_at")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        console.error("Error checking app access:", error);
        if (!cancelled) router.replace("/login");
        return;
      }

      const status = getAppAccessStatus(profile);

      if (!status.hasAccess) {
        if (!cancelled && pathname !== "/trial-ended") router.replace("/trial-ended");
        return;
      }

      if (!cancelled) {
        setAllowed(true);
        setChecking(false);
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (checking || !allowed) {
    return <div className="p-6 text-sm text-stone-600">Checking access...</div>;
  }

  return <>{children}</>;
}
