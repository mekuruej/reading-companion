import type { ReactNode } from "react";

type LibraryReminderBannerTone = "sky" | "emerald" | "violet";

type LibraryReminderBannerProps = {
  title: string;
  tone?: LibraryReminderBannerTone;
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
  children,
  actions,
}: LibraryReminderBannerProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={`mb-5 rounded-3xl border px-4 py-4 shadow-sm ${styles.shell}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`text-sm font-semibold ${styles.title}`}>
            {title}
          </div>

          {children}
        </div>

        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );
}
