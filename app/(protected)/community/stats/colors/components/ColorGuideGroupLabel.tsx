type ColorGuideGroupLabelProps = {
  title: string;
  detail: string;
};

export default function ColorGuideGroupLabel({
  title,
  detail,
}: ColorGuideGroupLabelProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200" />
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {title}
        </div>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <p className="mt-2 text-center text-xs leading-5 text-stone-500">
        {detail}
      </p>
    </div>
  );
}