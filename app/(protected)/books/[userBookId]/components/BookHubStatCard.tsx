type BookHubStatCardProps = {
  label: string;
  value: string | number;
  caption: string;
};

export default function BookHubStatCard({
  label,
  value,
  caption,
}: BookHubStatCardProps) {
  return (
    <div className="min-h-[116px] rounded-3xl bg-gradient-to-br from-violet-50/85 to-amber-50/60 px-4 py-5 text-center shadow-[0_3px_14px_rgba(65,48,80,0.09)]">
      <div className="text-xs font-semibold text-stone-600">{label}</div>
      <div className="mt-2 text-xl font-bold sm:text-[25px] tabular-nums text-stone-900">{value}</div>
      <div className="mt-2 text-[10px] text-stone-500">{caption}</div>
    </div>
  );
}