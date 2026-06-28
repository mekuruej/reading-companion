import Link from "next/link";

export type AttentionCountKey =
  | "books"
  | "bookRequests"
  | "bookFlags"
  | "missingBooks"
  | "kanji"
  | "ratingFlags"
  | "readingFit"
  | "wordReports"
  | "teacherRatings";

export type AttentionCounts = Record<AttentionCountKey, number>;

export type NeedsAttentionCard = {
  title: string;
  href?: string;
  eyebrow: string;
  description: string;
  countKey?: AttentionCountKey;
  actions?: Array<{
    label: string;
    href: string;
    countKey?: AttentionCountKey;
  }>;
  disabled?: boolean;
};

type NeedsAttentionCardGridProps = {
  cards: NeedsAttentionCard[];
  counts: AttentionCounts;
  countsLoading: boolean;
};

function countBadgeClass(countKey?: AttentionCountKey) {
  const base = "rounded-full border px-3 py-1 text-sm font-black shadow-sm";

  if (
    countKey === "books" ||
    countKey === "bookRequests" ||
    countKey === "bookFlags" ||
    countKey === "missingBooks"
  ) {
    return `${base} border-amber-200 bg-amber-50 text-amber-900`;
  }

  if (countKey === "wordReports") {
    return `${base} border-rose-200 bg-rose-50 text-rose-900`;
  }

  if (countKey === "kanji") {
    return `${base} border-emerald-200 bg-emerald-50 text-emerald-900`;
  }

  if (countKey === "ratingFlags" || countKey === "teacherRatings" || countKey === "readingFit") {
    return `${base} border-violet-200 bg-violet-50 text-violet-900`;
  }

  return `${base} border-stone-200 bg-stone-50 text-stone-900`;
}

function actionCountBadgeClass(countKey?: AttentionCountKey) {
  return countBadgeClass(countKey).replace("px-3 py-1 text-sm", "px-2 py-0.5 text-xs");
}

export function NeedsAttentionCardGrid({
  cards,
  counts,
  countsLoading,
}: NeedsAttentionCardGridProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((card) => {
        const count = card.countKey ? counts[card.countKey] : null;

        const cardContent = (
          <div
            className={`h-full rounded-3xl border p-5 shadow-sm transition ${
              card.disabled
                ? "border-stone-200 bg-stone-50 text-stone-500"
                : "border-stone-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                {card.eyebrow}
              </p>

              {card.countKey ? (
                <span className={countBadgeClass(card.countKey)}>
                  {countsLoading ? "..." : count}
                </span>
              ) : null}
            </div>

            <h2 className="mt-3 text-xl font-black text-stone-900">{card.title}</h2>

            <p className="mt-3 text-sm leading-6 text-stone-600">{card.description}</p>

            {card.actions?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {card.actions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-black text-stone-900 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  >
                    <span>{action.label}</span>
                    {action.countKey ? (
                      <span className={actionCountBadgeClass(action.countKey)}>
                        {countsLoading ? "..." : counts[action.countKey]}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm font-semibold text-stone-900">
                {card.disabled ? "Placeholder" : "Open →"}
              </p>
            )}
          </div>
        );

        if (!card.href || card.disabled || card.actions?.length) {
          return <div key={card.title}>{cardContent}</div>;
        }

        return (
          <Link key={card.title} href={card.href}>
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}
