type VocabExplorePageHeaderProps = {
  title?: string;
  description?: string;
};

export default function VocabExplorePageHeader({
  title = "Word History",
  description = "Search this book’s saved vocabulary and see where a word appeared.",
}: VocabExplorePageHeaderProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Vocabulary
      </p>

      <h1 className="mt-2 text-3xl font-black text-stone-950">
        {title}
      </h1>

      <p className="mt-3 text-sm leading-6 text-stone-600">
        {description}
      </p>
    </div>
  );
}