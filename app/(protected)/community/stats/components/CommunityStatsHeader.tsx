type CommunityStatsHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function CommunityStatsHeader({
  eyebrow,
  title,
  description,
}: CommunityStatsHeaderProps) {
  return (
    <div className="mb-8">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
        {eyebrow}
      </p>

      <h1 className="mt-2 text-3xl font-black text-stone-900 sm:text-4xl">
        {title}
      </h1>

      <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
        {description}
      </p>
    </div>
  );
}