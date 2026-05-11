// App Dashboard
//

"use client";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-cover opacity-[0.14]"
        style={{
          backgroundImage: "url('/mekuru-home-photo.jpg')",
          backgroundPosition: "72% center",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-slate-100/86 backdrop-blur-[1px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 bg-gradient-to-r from-slate-100 via-slate-100/95 to-transparent"
      />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 py-12 text-center">
        <img
          src="/mekuru-banner.png"
          alt="MEKURU banner"
          className="w-full max-w-2xl rounded-2xl border border-slate-200 object-cover shadow-lg shadow-slate-300/40"
        />

        <div className="max-w-xl rounded-3xl border border-slate-200 bg-white/85 px-6 py-6 shadow-sm">
          <h1 className="text-3xl font-semibold">Welcome to Mekuru</h1>
          <p className="mt-3 text-gray-500">
            Every word carries the memory of where you met it.
            <br />
            ページをめくって、話しまくろう！
          </p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => router.push("/books")}
            className="rounded-xl bg-slate-800 px-4 py-3 text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-lg sm:flex-1"
          >
            Go to My Library
          </button>

          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-300 bg-white/85 px-4 py-3 text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:shadow-md sm:flex-1"
          >
            Back to MEKURU site
          </button>
        </div>

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-300 bg-white/85 p-5 text-left shadow-sm">
            <div className="text-sm font-semibold text-stone-900">
              looker-upper
            </div>
            <div className="mt-1 text-sm text-stone-500">
              noun · official Mekuru book club term
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              A reader who cannot help stopping to look up words, grammar, and
              anything else they find interesting.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-300 bg-white/85 p-5 text-left shadow-sm">
            <div className="text-sm font-semibold text-stone-900">
              non-looker-upper
            </div>
            <div className="mt-1 text-sm text-stone-500">
              noun · official Mekuru book club term
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              A reader who wants to immerse themselves in the story, keep going,
              and practice fluid reading with only light support when needed.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}