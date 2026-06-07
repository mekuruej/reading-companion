import Link from "next/link";

type DiscoveryNavCardProps = {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
  className: string;
};

export default function DiscoveryNavCard({
  title,
  href,
  eyebrow,
  description,
  className,
}: DiscoveryNavCardProps) {
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

          <p className="mt-2 text-sm leading-6 opacity-80">
            {description}
          </p>
        </div>

        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
          &rarr;
        </span>
      </div>
    </Link>
  );
}