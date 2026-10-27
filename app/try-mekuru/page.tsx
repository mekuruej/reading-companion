import type { Metadata } from "next";
import GuidedTrialSchedulingAction from "@/components/GuidedTrialSchedulingAction";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function TryMekuruPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="space-y-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">For invited testers</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900">Your Guided App Trial</h1>
          <p className="mt-4 leading-7 text-stone-700">
            An invitation-based introduction to MEKURU’s Japanese Learning Tools, with an initial guided reading session and time to explore the app yourself. This is separate from the paid Private Lesson Trial.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="text-lg font-semibold text-stone-900">Your initial 30-minute guided reading and app introduction</h2>
          <p className="mt-3 leading-7 text-stone-700">
            We’ll work through Japanese selected for the session, talk about your reading goals, and introduce the tools that support your own reading. Guided reading activities depend on the selected material and applicable permissions.
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
