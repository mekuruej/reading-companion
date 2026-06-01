type ColorGuideStepCardProps = {
  // The page owns color-stage meaning; this card only displays it.
  stageLabel: string;
  stageClassName: string;
  title: string;
  detail: string;
  note: string;
};

export default function ColorGuideStepCard({
  stageLabel,
  stageClassName,
  title,
  detail,
  note,
}: ColorGuideStepCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <span className={stageClassName}>{stageLabel}</span>

      <div className="mt-2 text-sm font-semibold leading-5 text-stone-900">
        {title}
      </div>

      <div className="mt-1 text-xs leading-5 text-stone-600">{detail}</div>

      <div className="mt-2 text-[11px] leading-4 text-stone-500">{note}</div>
    </div>
  );
}