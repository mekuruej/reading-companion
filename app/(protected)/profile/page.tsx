// Profile Home
// 

"use client";

import Link from "next/link";
import ProfileShell from "@/components/profile/ProfileShell";

export default function ProfileHubPage() {
  return (
    <ProfileShell
      title="Profile Home"
      description="Your profile is where your reading identity starts to come together: your level, your preferences, your public-facing details, and eventually your stats."
    >
      <div className="mb-4 text-sm text-stone-500">
        Use the header links above for Stats, Community, and Book Clubs.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Profile</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Your main profile details live here: account basics, reading level, and optional
                public-facing information.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Link
              href="/profile/setup"
              className="inline-flex items-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
            Edit Profile
          </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Reading Profile</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Set how much encounter support words need before Library Check starts testing
                reading, meaning, and mastery.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Link
              href="/profile/reading"
              className="inline-flex items-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Edit Reading Profile
            </Link>
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
