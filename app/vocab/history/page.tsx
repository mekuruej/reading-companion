import { Suspense } from "react";
import VocabHistoryClient from "./VocabHistoryClient";

export default function VocabHistoryPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-4xl px-6 pb-10 pt-30">
          <h1 className="mb-1 text-2xl font-semibold">Word History</h1>
          <p className="mb-4 text-sm text-stone-500">Loading history...</p>
        </main>
      }
    >
      <VocabHistoryClient />
    </Suspense>
  );
}