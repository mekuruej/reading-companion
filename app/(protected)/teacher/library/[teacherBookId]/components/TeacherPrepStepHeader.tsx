type TeacherPrepStepHeaderProps = {
  stepLabel: string;
  title: string;
  description: string;
  className?: string;
};

export default function TeacherPrepStepHeader({
  stepLabel,
  title,
  description,
  className = "",
}: TeacherPrepStepHeaderProps) {
  return (
    <section
      className={`${className} rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        {stepLabel}
      </p>
      <h2 className="mt-1 text-xl font-black text-stone-900">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </section>
  );
}