// Profile Home
//

"use client";

import Link from "next/link";

const profileActions = [
  {
    title: "Edit Profile",
    href: "/community/profile/setup",
    description: "Update your display details, level, bio, and public-facing profile basics.",
  },
  {
    title: "Edit Reading Profile",
    href: "/community/profile/reading",
    description: "Adjust reading support, encounter stages, and Ability Check settings.",
  },
  {
    title: "Social Profile",
    href: "/community/profile/social",
    description: "Future home for public sharing, community preferences, and reader identity.",
  },
];

const profileStats = [
  { label: "Books", value: "—" },
  { label: "Saved Words", value: "—" },
  { label: "Reviews", value: "—" },
  { label: "Level", value: "Set in profile" },
];

const abilityColorStats = [
  {
    label: "Green",
    value: "—",
    description: "Reading passed",
    dotClass: "bg-emerald-500",
  },
  {
    label: "Blue",
    value: "—",
    description: "Meaning passed",
    dotClass: "bg-sky-500",
  },
  {
    label: "Purple",
    value: "—",
    description: "Mastered",
    dotClass: "bg-violet-500",
  },
];

export default function ProfileHubPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="h-32 bg-gradient-to-r from-sky-100 via-amber-50 to-emerald-100" />

          <div className="px-5 pb-6 sm:px-7">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-stone-100 text-3xl font-black text-stone-500 shadow-sm">
                  M
                </div>

                <div className="pb-2">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                    Reader Profile
                  </div>
                  <h1 className="mt-1 text-3xl font-black text-stone-950">
                    My Mekuru Profile
                  </h1>
                  <p className="mt-1 text-sm text-stone-500">
                    Your reader identity, public profile, and learning style.
                  </p>
                </div>
              </div>

              <Link
                href="/community/profile/setup"
                className="inline-flex items-center justify-center rounded-2xl bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-black"
              >
                Edit Profile
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {profileStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3"
                >
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-lg font-black text-stone-900">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {abilityColorStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${stat.dotClass}`} />
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                      {stat.label}
                    </div>
                  </div>

                  <div className="mt-2 text-2xl font-black text-stone-950">
                    {stat.value}
                  </div>

                  <div className="mt-1 text-xs font-semibold text-stone-500">
                    {stat.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                  About Me
                </p>
                <h2 className="mt-2 text-xl font-black text-stone-950">
                  Public reader profile
                </h2>
              </div>

              <Link
                href="/community/profile/setup"
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                Edit
              </Link>
            </div>

            <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm leading-7 text-stone-600">
              Add a short reader bio, your favorite book types, your reading
              modes, and the kind of Japanese books you want to grow into.
              Later, this area can show only the fields you choose to make public.
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-100 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Favorite book type
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  The kinds of books that keep you turning pages: cozy mysteries,
                  manga, essays, children’s novels, light novels, or something
                  else entirely.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-100 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Favorite reading mode
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Curiosity Reading, Fluid Reading, Just Reading, Listening —
                  or a mix depending on your mood and energy.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-100 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Dictionary style
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Looker-upper, non-looker-upper, or a mix of both.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              Profile Tools
            </p>
            <h2 className="mt-2 text-xl font-black text-stone-950">
              Manage your profile
            </h2>

            <div className="mt-4 space-y-3">
              {profileActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-stone-900">
                        {action.title}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-stone-500">
                        {action.description}
                      </p>
                    </div>

                    <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-black text-stone-600">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-sky-100 bg-sky-50 p-5 text-sky-950 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
            Privacy note
          </p>
          <p className="mt-2 text-sm leading-7 opacity-80">
            Eventually, profile fields should have clear privacy choices. Basic
            reader identity can be public, while personal details, exact location,
            lesson status, and private notes should stay private by default.
          </p>
        </section>
      </div>
    </main>
  );
}