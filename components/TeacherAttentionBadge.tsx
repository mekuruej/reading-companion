export default function TeacherAttentionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = `${count} ${count === 1 ? "item needs" : "items need"} teacher attention`;
  return <span title={label} aria-label={label} className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold leading-none text-amber-900">{count}</span>;
}
