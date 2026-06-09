type TeacherKanjiWordCellProps = {
  surface: string;
  reading: string;
  katakanaReading: string;
  vocabularyCacheId: number | null;
};

export default function TeacherKanjiWordCell({
  surface,
  reading,
  katakanaReading,
  vocabularyCacheId,
}: TeacherKanjiWordCellProps) {
  return (
    <>
      <div className="text-2xl font-medium leading-tight text-stone-900 md:text-3xl">
        {surface}
      </div>

      {reading ? (
        <>
          <div className="mt-1 text-base text-stone-500 md:text-lg">
            {reading}
          </div>

          <div className="mt-1 text-sm font-semibold tracking-wide text-stone-400 md:text-base">
            {katakanaReading}
          </div>
        </>
      ) : (
        <div className="mt-1 text-base text-stone-500 md:text-lg">—</div>
      )}

      <div className="mt-1 text-xs text-stone-400">
        cache: {vocabularyCacheId ?? "none"}
      </div>
    </>
  );
}