// Profile Home
// 

"use client";

import Link from "next/link";
import ProfileShell from "@/components/profile/ProfileShell";

type LinkCardProps = {
  title: string;
  description: string;
  href: string;
  status?: string;
};

function LinkCard({ title, description, href, status }: LinkCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:bg-stone-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
        </div>

        {status ? (
          <span className="shrink-0 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
            {status}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

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

        <LinkCard
          title="Reading Profile"
          description="Choose how much support, repetition, and visual guidance you want while reading."
          href="/profile/reading"
        />
      </div>
    </ProfileShell>
  );
}
