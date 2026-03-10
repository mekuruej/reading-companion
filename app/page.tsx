"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 text-center">
      <img
        src="/mekuru-banner.png"
        alt="MEKURU banner"
        className="w-full max-w-4xl rounded-xl object-cover"
      />

      <div>
        <h1 className="text-3xl font-semibold">Welcome to MEKURU</h1>
        <p className="text-gray-500 mt-2">
          Every word carries the memory of where you met it. ぺーじをめくって、話まくろう！
        </p>
      </div>

      <div className="flex flex-col gap-3 w-64">
        <button
          onClick={() => router.push("/books")}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black transition"
        >
          Go to My Books
        </button>

        <button
          onClick={() => router.push("/vocab/dictionary")}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          Open Dictionary
        </button>

        <button
          onClick={() => router.push("/stats")}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          View My Study Stats
        </button>
      </div>
    </main>
  );
}