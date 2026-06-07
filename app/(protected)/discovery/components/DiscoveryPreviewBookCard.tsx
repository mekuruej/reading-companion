import type { ReactNode } from "react";

type DiscoveryPreviewBookCardProps = {
  bookId: string;
  title: string;
  author?: string | null;
  bookType?: string | null;
  coverUrl?: string | null;
  latestReaderLevel?: string | null;
  bookTypeLabel: (value: string | null | undefined) => string;
  formatReaderLevel: (value: string | null | undefined) => string;
  children?: ReactNode;
};

export default function DiscoveryPreviewBookCard({
  title,
  author,
  bookType,
  coverUrl,
  latestReaderLevel,
  bookTypeLabel,
  formatReaderLevel,
  children,
}: DiscoveryPreviewBookCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
      <div className="flex min-w-0 gap-2.5">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="h-16 w-11 shrink-0 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <div className="h-16 w-11 shrink-0 rounded-lg bg-slate-200" />
        )}

        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-black leading-tight text-slate-950">
            {title}
          </div>

          <div className="mt-0.5 truncate text-xs text-slate-500">
            {author || bookTypeLabel(bookType)}
          </div>

          <div className="mt-2 text-xs font-semibold text-slate-600">
            {formatReaderLevel(latestReaderLevel)}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}