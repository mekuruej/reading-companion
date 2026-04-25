"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";


export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-10 px-6 py-12 text-center">
      <img
        src="/mekuru-banner.png"
        alt="MEKURU banner"
        className="w-full max-w-2xl rounded-xl object-cover"
      />

      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold">Welcome to Mekuru</h1>
        <p className="mt-3 text-gray-500">
          Every word carries the memory of where you met it.
          <br />
          ページをめくって、話しまくろう！
        </p>
      </div>

      <div className="flex w-64 flex-col gap-3">
        <button
          onClick={() => router.push("/books")}
          className="rounded bg-gray-800 px-4 py-2 text-white transition hover:bg-black"
        >
          Go to My Library
        </button>
      </div>
    </div>
  );
}