type BookHubStatCardProps = {
  label: string;
  value?: string | number;
  caption?: string;
  details?: { label: string; value: string }[];
};

export default function BookHubStatCard({
  label,
  value,
  caption,
  details,
}: BookHubStatCardProps) {
  return (
    <div data-hub-info className="min-h-[116px] rounded-3xl bg-gradient-to-br from-violet-50/85 to-amber-50/60 px-4 py-5 text-center shadow-[0_3px_14px_rgba(65,48,80,0.09)]">
      <div className="text-xs font-semibold text-stone-600">{label}</div>
      {details ? (
        <div className="mx-auto mt-2 max-w-xs space-y-1 text-left text-xs text-stone-700">
          {details.map((detail) => (
            <div key={detail.label} className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="font-medium">{detail.label}</span>
              <span className="tabular-nums font-semibold text-stone-900">{detail.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-xl font-bold tabular-nums text-stone-900 sm:text-[25px]">{value}</div>
      )}
      {caption ? <div className="mt-2 text-[10px] text-stone-500">{caption}</div> : null}
    </div>
  );
}
