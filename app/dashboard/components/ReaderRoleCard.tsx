type ReaderRoleCardProps = {
  iconSrc: string;
  iconAlt: string;
  title: string;
  subtitle: string;
  points: string[];
};

export default function ReaderRoleCard({
  iconSrc,
  iconAlt,
  title,
  subtitle,
  points,
}: ReaderRoleCardProps) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white/85 p-5 text-left shadow-sm">
      <div className="mb-4 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-300 bg-slate-100 shadow-inner">
          <img
            src={iconSrc}
            alt={iconAlt}
            className="h-12 w-12 object-contain opacity-80"
          />
        </div>
      </div>

      <div className="text-sm font-semibold text-stone-900">{title}</div>

      <div className="mt-1 text-sm text-stone-500">{subtitle}</div>

      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}