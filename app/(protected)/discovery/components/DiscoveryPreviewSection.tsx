import type { ReactNode } from "react";
import Link from "next/link";

type DiscoveryPreviewSectionProps = {
  children: ReactNode;
};

export default function DiscoveryPreviewSection({
  children,
}: DiscoveryPreviewSectionProps) {
  return (
    <section className="mt-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Find Your Next Book
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              Recently rated books
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              A quick peek at reader-fit signals. Open the full page to filter and compare.
            </p>
          </div>

          <Link
            href="/discovery/find-books"
            className="inline-flex rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-black"
          >
            Open Find Your Next Book
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>
      </div>
    </section>
  );
}