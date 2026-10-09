import type { Metadata } from "next";
import GuidedTrialSchedulingAction from "@/components/GuidedTrialSchedulingAction";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function TryMekuruPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="space-y-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">For invited testers</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900">Your guided Japanese reading trial</h1>
          <p className="mt-4 leading-7 text-stone-700">
            Try MEKURU’s Japanese Learning Tools with an initial guided reading session and time to explore the app yourself.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="text-lg font-semibold text-stone-900">Your initial 30-minute reading session</h2>
          <p className="mt-3 leading-7 text-stone-700">
            We’ll read Japanese together, talk about your reading goals and comfort level, and introduce the tools you can use while reading.
          </p>
        </div>
        <div className="space-y-3 leading-7 text-stone-700">
          <p>Your 28-day Japanese Learning Tools trial begins after that session. Scheduling a session does not activate the trial.</p>
          <p>If you use the app and have feedback to share, an optional follow-up session is available.</p>
        </div>
        <GuidedTrialSchedulingAction />
      </section>
    </main>
  );
}
