import Link from "next/link";

type JapaneseLearningPromoCardProps = {
  title?: string;
  description?: string;
  source?: "study_hub" | "book_hub" | "japanese_learning_page";
  compact?: boolean;
};

export default function JapaneseLearningPromoCard({
  title = "Japanese Learning",
  description = "Learn through Japanese books with guided reading, vocabulary, flashcards, and study tools.",
  source = "study_hub",
  compact = false,
}: JapaneseLearningPromoCardProps) {
  const href = `/japanese-learning?source=${source}`;

  return (
    <section
      className={[
        "rounded-2xl border border-violet-200 bg-white p-4 shadow-sm",
        compact ? "" : "sm:flex sm:items-center sm:justify-between sm:gap-4",
      ].join(" ")}
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
          Japanese Learning
        </p>
        <h2 className="mt-1 text-lg font-black text-stone-950">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
          {description}
        </p>
      </div>

      <Link
        href={href}
        className="mt-3 inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800 transition hover:bg-violet-100 sm:mt-0"
      >
        Explore Japanese Learning →
      </Link>
    </section>
  );
}
