type TeacherKanjiStatusBadgeProps = {
  label: string;
  detail: string;
  toneClassName: string;
};

export default function TeacherKanjiStatusBadge({
  label,
  detail,
  toneClassName,
}: TeacherKanjiStatusBadgeProps) {
  return (
    <>
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClassName}`}
        title={detail}
      >
        {label}
      </span>
      <div className="mt-1 text-xs text-stone-400">{detail}</div>
    </>
  );
}