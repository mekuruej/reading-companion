type DictionaryEntryBadgesProps = {
  jlptLabel: string;
  isCommon: boolean | null | undefined;
};

export default function DictionaryEntryBadges({
  jlptLabel,
  isCommon,
}: DictionaryEntryBadgesProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs">
      {jlptLabel !== "NON-JLPT" ? (
        <span className="rounded-full border bg-white px-2 py-1">
          {jlptLabel}
        </span>
      ) : null}

      {isCommon ? (
        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-green-700">
          Common
        </span>
      ) : null}
    </div>
  );
}