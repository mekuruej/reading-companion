//App Dashboard
// 

"use client";

import { useRouter } from "next/navigation";

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

      <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-300 bg-stone-50 p-5 text-left shadow-sm">
          <div className="text-sm font-semibold text-stone-900">looker-upper</div>
          <div className="mt-1 text-sm text-stone-500">
            noun · official Mekuru book club term
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            A reader who cannot help stopping to look up words, grammar, and anything else
            they find interesting.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-300 bg-stone-50 p-5 text-left shadow-sm">
          <div className="text-sm font-semibold text-stone-900">non-looker-upper</div>
          <div className="mt-1 text-sm text-stone-500">
            noun · official Mekuru book club term
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            A reader who wants to immerse themselves in the story, keep going, and practice
            fluid reading with only light support when needed.
          </p>
        </div>
      </div>
    </div>
  );
}
