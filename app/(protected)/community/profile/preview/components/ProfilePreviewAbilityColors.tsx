type ProfilePreviewAbilityColorItem = {
  key: string;
  label: string;
  description: string;
  dotClass: string;
  value: string;
};

type ProfilePreviewAbilityColorsProps = {
  loading: boolean;
  items: ProfilePreviewAbilityColorItem[];
};

export default function ProfilePreviewAbilityColors({
  loading,
  items,
}: ProfilePreviewAbilityColorsProps) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {items.map((color) => (
        <div
          key={color.key}
          className="rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${color.dotClass}`} />
            <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
              {color.label}
            </div>
          </div>

          <div className="mt-2 text-2xl font-black text-stone-950">
            {loading ? "—" : color.value}
          </div>

          <div className="mt-1 text-xs font-semibold text-stone-500">
            {color.description}
          </div>
        </div>
      ))}
    </div>
  );
}