import type { ReactNode } from "react";

type LibraryReminderBannerTone = "sky" | "emerald" | "violet";

type LibraryReminderBannerProps = {
  title: string;
  tone?: LibraryReminderBannerTone;
  spacious?: boolean;
  children: ReactNode;
  actions: ReactNode;
};

const toneStyles: Record<
  LibraryReminderBannerTone,
  {
    shell: string;
    title: string;
    primary?: string;
  }
> = {
  sky: {
    shell: "border-sky-200 bg-sky-50",
    title: "text-sky-950",
  },
  emerald: {
    shell: "border-emerald-300 bg-emerald-50 shadow-emerald-100",
    title: "text-emerald-950",
  },
  violet: {
    shell: "border-violet-200 bg-violet-50",
    title: "text-violet-950",
  },
};

export default function LibraryReminderBanner({
  title,
  tone = "sky",
  spacious = false,
  children,
  actions,
}: LibraryReminderBannerProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={`mb-5 rounded-3xl border shadow-sm ${spacious ? "px-5 py-6 sm:px-6 sm:py-7" : "px-4 py-4"} ${styles.shell}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`${spacious ? "text-xl font-bold leading-tight sm:text-2xl" : "text-sm font-semibold"} ${styles.title}`}>
            {title}
          </div>

          {children}
        </div>

        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );
}
