type DictionaryMeaningsListProps = {
  word: string;
  reading: string;
  meanings: string[];
};

export default function DictionaryMeaningsList({
  word,
  reading,
  meanings,
}: DictionaryMeaningsListProps) {
  return (
    <div className="mt-4 space-y-2">
      {meanings.map((meaning, meaningIndex) => (
        <div
          key={`${word}-${reading}-${meaningIndex}`}
          className="rounded-xl border border-stone-200 bg-stone-50 p-4"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Meaning {meaningIndex + 1}
          </div>

          <div className="mt-2 text-sm leading-7 text-stone-800">
            {meaning}
          </div>
        </div>
      ))}
    </div>
  );
}