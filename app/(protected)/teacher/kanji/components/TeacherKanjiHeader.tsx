import Link from "next/link";

type TeacherKanjiHeaderProps = {
  homeHref: string;
  homeLabel?: string;
  mode?: "flagged" | "ongoing" | "all";
};

export default function TeacherKanjiHeader({
  homeHref,
  homeLabel = "← Teacher Home",
  mode = "all",
}: TeacherKanjiHeaderProps) {
  const header =
    mode === "flagged"
      ? {
          eyebrow: "Needs Attention",
          title: "Kanji Flagged Queue",
          description:
            "Review kanji readings that were flagged by users. The ongoing upkeep queue stays separate in Site Upkeep.",
        }
      : mode === "ongoing"
        ? {
            eyebrow: "Site Upkeep",
            title: "Kanji Reading Upkeep",
            description:
              "Work through the ongoing kanji-reading enrichment queue when it is useful. User-flagged kanji stay in Needs Attention.",
          }
        : {
            eyebrow: "Teacher Workbench",
            title: "Kanji Enrichment Queue",
            description:
              "User-flagged kanji stay at the top. Everything else is an ongoing kanji-reading queue you can work through when it is useful.",
          };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            {header.eyebrow}
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            {header.title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            {header.description}
          </p>
        </div>

        <Link
          href={homeHref}
          className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          {homeLabel}
        </Link>
      </div>
    </section>
  );
}
