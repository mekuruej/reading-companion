"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";


export default function Header() {
  const [user, setUser] = useState<any>(null);
const [username, setUsername] = useState<string>("");
  

  useEffect(() => {
  const loadUserAndUsername = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .single();

      setUsername(profile?.username ?? "");
    } else {
      setUsername("");
    }
  };

  loadUserAndUsername();

  const { data: listener } = supabase.auth.onAuthStateChange(() => {
    loadUserAndUsername();
  });

  return () => listener.subscription.unsubscribe();
}, []);

  const btnClass =
    "text-sm px-3 py-2 border rounded hover:bg-gray-100 text-center leading-none";

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4">
          {/* Left: title + slogan (same visual height as button block) */}
          <div className="min-w-0 flex flex-col justify-center">
            <Link href="/" className="font-semibold text-xl leading-tight">
              MEKURU Reading Companion
            </Link>
            <span className="text-sm text-gray-500 leading-tight">
              Every word carries the memory of where you met it.
            </span>
          </div>

          {/* Right: buttons in 3 rows (Books with Sign In/Out on top row) */}
          <div className="justify-self-end w-full md:w-auto">
            <div className="grid grid-cols-3 gap-2 w-full md:w-[360px]">
              {/* Row 1: Books + Auth (auth spans 2 columns to match width) */}
              <Link href={username ? `/users/${username}/books` : "/books"} className={btnClass}>
  Books
</Link>

              {user ? (
                <button
                  onClick={() => supabase.auth.signOut()}
                  className={btnClass + " col-span-2"}
                >
                  Sign Out
                </button>
              ) : (
                <Link href="/login" className={btnClass + " col-span-2"}>
                  Sign In
                </Link>
              )}

              {/* Row 2: Dictionary / Profile / Stats */}
              <Link href="/vocab/dictionary" className={btnClass}>
                Dictionary
              </Link>

              <Link href="/profile/settings" className={btnClass}>
                Profile
              </Link>

              <Link href="/stats" className={btnClass}>
                Stats
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}