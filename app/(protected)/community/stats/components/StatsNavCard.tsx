import Link from "next/link";

type StatsNavCardProps = {
  title: string;
  description: string;
  href: string;
  tag: string;
};

export default function StatsNavCard({
  title,
  description,
  href,
  tag,
}: StatsNavCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
        {tag}
      </span>

      <h3 className="mt-4 text-lg font-black text-stone-900 group-hover:text-black">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        {description}
      </p>

      <p className="mt-4 text-sm font-bold text-stone-900">
        Open →
      </p>
    </Link>
  );
}