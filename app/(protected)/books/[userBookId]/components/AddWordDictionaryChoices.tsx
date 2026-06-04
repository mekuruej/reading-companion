type AddWordDictionaryCandidate = {
  id: string;
  surface: string;
  reading: string;
  jlpt: string;
  defaultMeaning: string;
  isCommon: boolean;
  meaningChoices: string[];
};

type AddWordDictionaryChoicesProps = {
  word: string;
  reading: string;
  meaning: string;
  candidates: AddWordDictionaryCandidate[];
  onSelectCandidate: (candidate: AddWordDictionaryCandidate) => void;
};

export default function AddWordDictionaryChoices({
  word,
  reading,
  meaning,
  candidates,
  onSelectCandidate,
}: AddWordDictionaryChoicesProps) {
  if (candidates.length <= 1) return null;

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
      <div className="text-sm font-medium text-sky-900">
        Dictionary choices for "{word.trim()}"
      </div>

      <p className="mt-1 text-sm text-sky-800">
        Choose the reading and meaning that match your book.
      </p>

      <div className="mt-3 space-y-2">
        {candidates.map((candidate) => {
          const isSelected =
            candidate.surface === word &&
            candidate.reading === reading &&
            candidate.defaultMeaning === meaning;

          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelectCandidate(candidate)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                isSelected
                  ? "border-sky-400 bg-white shadow-sm"
                  : "border-sky-200 bg-white/80 hover:bg-white"
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-base font-semibold text-stone-900">
                  {candidate.surface}
                </span>

                <span className="text-sm text-stone-600">
                  {candidate.reading || "No reading listed"}
                </span>

                {candidate.jlpt !== "NON-JLPT" ? (
                  <span className="text-xs font-medium text-sky-700">
                    {candidate.jlpt}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 text-sm text-stone-700">
                {candidate.defaultMeaning || "No meaning listed"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}