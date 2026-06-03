import type { ReactNode } from "react";

type LibrarySectionProps = {
  title: string;
  subtitle?: string;
  count: number;
  gridClassName: string;
  children: ReactNode;
};

export default function LibrarySection({
  title,
  subtitle,
  count,
  gridClassName,
  children,
}: LibrarySectionProps) {
  if (count === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {title}{" "}
            <span className="font-normal text-gray-500">({count})</span>
          </h2>

          {subtitle ? (
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <ul className={gridClassName}>{children}</ul>
    </section>
  );
}