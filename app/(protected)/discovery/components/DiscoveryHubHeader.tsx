type DiscoveryHubHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function DiscoveryHubHeader({
  eyebrow,
  title,
  description,
}: DiscoveryHubHeaderProps) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {eyebrow}
      </p>

      <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
        {title}
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}