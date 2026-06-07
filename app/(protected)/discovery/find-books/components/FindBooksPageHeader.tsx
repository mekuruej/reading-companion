import Link from "next/link";

type FindBooksPageHeaderProps = {
  title?: string;
  description?: string;
};

export default function FindBooksPageHeader({
  title = "Find Your Next Book",
  description = "Browse anonymous reader-fit signals from other Mekuru readers. Average ratings appear only after multiple readers have shared signals for the same book.",
}: FindBooksPageHeaderProps) {
  return (
    <header className="space-y-4">
      <Link
        href="/discovery"
        className="inline-flex text-sm font-semibold text-stone-500 transition hover:text-stone-900"
      >
        ← Discovery Hub
      </Link>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Discovery
        </p>

        <h1 className="mt-2 text-3xl font-black text-stone-950">
          {title}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          {description}
        </p>
      </div>
    </header>
  );
}