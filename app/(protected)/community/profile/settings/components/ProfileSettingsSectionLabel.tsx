type ProfileSettingsSectionLabelProps = {
  title: string;
  detail: string;
  eyebrow?: string;
};

export default function ProfileSettingsSectionLabel({
  title,
  detail,
  eyebrow,
}: ProfileSettingsSectionLabelProps) {
  return (
    <div>
      {eyebrow ? (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          {eyebrow}
        </div>
      ) : null}

      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">{detail}</p>
    </div>
  );
}