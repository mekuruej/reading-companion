import { personalVocabularyEntryKey, type PersonalVocabularyMatch } from "@/lib/personalVocabularySearch";

type PersonalVocabularyResultsProps = {
  entries: PersonalVocabularyMatch[];
  searched: boolean;
  loading?: boolean;
  error?: string | null;
  dismissedKeys: string[];
  showPreviousLocation?: boolean;
  onSelect: (entry: PersonalVocabularyMatch) => void;
  onDismiss: (entry: PersonalVocabularyMatch) => void;
};

/** Recognition only: each distinct saved meaning remains an explicit choice. */
export default function PersonalVocabularyResults({
  entries, searched, loading = false, error = null, dismissedKeys,
  showPreviousLocation = true, onSelect, onDismiss,
}: PersonalVocabularyResultsProps) {
  const suggestions = entries.filter(entry => !dismissedKeys.includes(personalVocabularyEntryKey(entry)));
  if ((!searched && !loading && !error) || (!suggestions.length && !loading && !error)) return null;
  return (
    <section className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3" aria-label="Previously saved vocabulary">
      {suggestions.length ? <h3 className="text-sm font-semibold text-violet-950">You&apos;ve saved this word before!</h3> : null}
      {loading ? <p className="mt-2 text-xs text-violet-800">Checking saved words in this book…</p> : null}
      {error ? <p role="status" className="mt-2 text-sm text-amber-900">{error}</p> : null}
      <ul className="space-y-2">
        {suggestions.map(entry => (
          <li key={personalVocabularyEntryKey(entry)} className="mt-2 rounded-lg border border-violet-100 bg-white p-2">
            <p className="text-sm text-stone-950"><span className="font-semibold">{entry.surface}</span>{entry.reading ? <span className="ml-2 text-stone-600">（{entry.reading}）</span> : null}</p>
            <p className="mt-1 text-sm text-stone-700">{entry.meaning || "No meaning saved"}</p>
            {showPreviousLocation && entry.previousLocation ? <p className="mt-1 text-xs text-stone-500">{entry.previousLocation}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => onSelect(entry)} className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2">Use this entry</button>
              <button type="button" onClick={() => onDismiss(entry)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2">Not this one</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
