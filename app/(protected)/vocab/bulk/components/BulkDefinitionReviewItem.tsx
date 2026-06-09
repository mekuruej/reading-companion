type BulkDefinitionReviewItemProps = {
  surface: string;
  reading: string;
  meaning: string;
  meaningChoices: string[];
  meaningChoiceIndex: number | null;
  onReadingChange: (value: string) => void;
  onMeaningChoiceChange: (value: string) => void;
  onMeaningChange: (value: string) => void;
};

export default function BulkDefinitionReviewItem({
  surface,
  reading,
  meaning,
  meaningChoices,
  meaningChoiceIndex,
  onReadingChange,
  onMeaningChoiceChange,
  onMeaningChange,
}: BulkDefinitionReviewItemProps) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-lg font-semibold">{surface}</div>

      <div className="grid gap-3">
        <div>
          <div className="mb-1 text-xs text-gray-500">Reading</div>
          <input
            value={reading}
            onChange={(e) => onReadingChange(e.target.value)}
            className="w-full rounded border p-2 text-sm"
            placeholder="Reading"
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-gray-500">Definition #</div>
          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={meaningChoiceIndex == null ? "other" : String(meaningChoiceIndex)}
              onChange={(e) => onMeaningChoiceChange(e.target.value)}
              className="w-full rounded border bg-white px-3 py-2 text-sm md:w-40"
            >
              {meaningChoices.map((_, meaningIndex) => (
                <option key={meaningIndex} value={meaningIndex}>
                  {`Def ${meaningIndex + 1}`}
                </option>
              ))}
              <option value="other">Other</option>
            </select>

            {meaningChoiceIndex == null ? (
              <textarea
                rows={2}
                value={meaning}
                onChange={(e) => onMeaningChange(e.target.value)}
                className="w-full rounded border bg-white p-2 text-sm"
                placeholder="Type your custom meaning"
                autoFocus
              />
            ) : (
              <textarea
                rows={2}
                value={meaning}
                readOnly
                className="w-full rounded border bg-slate-100 p-2 text-sm text-slate-700"
                placeholder="Meaning"
              />
            )}
          </div>

          <p className="mt-1 text-xs text-stone-500">
            Choose Other to write your own definition.
          </p>
        </div>
      </div>
    </li>
  );
}