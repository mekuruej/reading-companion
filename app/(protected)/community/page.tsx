// Community Hub
//

import Link from "next/link";

const mySpaceCards = [
  {
    title: "My Profile",
    href: "/community/profile",
    eyebrow: "Your reader profile",
    description:
      "Edit your profile details. Later, this space can combine edit profile, reading profile, and public preview.",
    className: "border-slate-200 bg-white text-slate-900",
  },
  {
    title: "My Stats",
    href: "/community/stats",
    eyebrow: "Your progress",
    description:
      "See your reading progress, study patterns, and personal Mekuru stats.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
];

const communityCards = [
  {
    title: "Book Clubs",
    href: "/community/book-clubs",
    eyebrow: "Coming soon",
    description:
      "Future shared reading spaces for groups, guided reading, and book-based community events.",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
  {
    title: "Reader Insights",
    href: "/discovery/reader-insights",
    eyebrow: "Coming soon",
    description:
      "A future space for anonymous comfort ratings, difficulty patterns, and reader-level insights.",
    className: "border-violet-200 bg-violet-50 text-violet-950",
  },
];

function HubCard({
  title,
  href,
  eyebrow,
  description,
  className,
}: {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
        {eyebrow}
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">{description}</p>
        </div>

        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
          →
        </span>
      </div>
    </Link>
  );
}

export default function CommunityHubPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Community
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Community Hub
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Manage your reader identity, check your progress, and eventually
            connect with shared reading spaces.
          </p>
        </div>

        <section className="mb-8">
          <div className="mb-3">
            <h2 className="text-lg font-black text-slate-900">My Space</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your profile, stats, and personal reading identity.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {mySpaceCards.map((card) => (
              <HubCard key={card.href} {...card} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-black text-slate-900">Community</h2>
            <p className="mt-1 text-sm text-slate-500">
              Shared reading features can live here as they grow.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {communityCards.map((card) => (
              <HubCard key={card.href} {...card} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}