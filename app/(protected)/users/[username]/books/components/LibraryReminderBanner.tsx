import type { ReactNode } from "react";

type LibraryReminderBannerProps = {
  title: string;
  children: ReactNode;
  actions: ReactNode;
};

export default function LibraryReminderBanner({
  title,
  children,
  actions,
}: LibraryReminderBannerProps) {
  return (
    <div className="mb-5 rounded-3xl border border-sky-200 bg-sky-50 px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-sky-950">{title}</div>
          {children}
        </div>

        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );
}