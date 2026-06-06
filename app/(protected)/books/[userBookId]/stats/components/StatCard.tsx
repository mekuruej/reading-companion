type StatCardProps = {
  label: string;
  value: string | number;
  note?: string;
};

export default function StatCard({ label, value, note }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-stone-950">
        {value}
      </p>

      {note ? (
        <p className="mt-2 text-sm leading-6 text-stone-500">
          {note}
        </p>
      ) : null}
    </div>
  );
}