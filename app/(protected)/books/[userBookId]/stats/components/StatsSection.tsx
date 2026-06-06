import type { ReactNode } from "react";

type StatsSectionProps = {
  title: string;
  children: ReactNode;
};

export default function StatsSection({ title, children }: StatsSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-stone-950">
        {title}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}