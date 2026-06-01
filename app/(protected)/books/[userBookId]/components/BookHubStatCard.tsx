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
    <div className="rounded-xl border bg-white p-3 text-center">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
      <div className="mt-1 text-[10px] text-stone-400">{caption}</div>
    </div>
  );
}