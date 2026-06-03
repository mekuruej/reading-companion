type CuriosityDictionaryCandidate = {
  id: string;
  surface: string;
  cacheSurface: string;
  reading: string;
  meanings: string[];
  selectedMeaningIndex: number;
  meaning: string;
  isCustomMeaning: boolean;
};

type CuriosityDictionaryChoicesProps = {
  surface: string;
  candidates: CuriosityDictionaryCandidate[];
  selectedSurface: string;
  selectedReading: string;
  selectedMeaning: string;
  onSelectCandidate: (candidate: CuriosityDictionaryCandidate) => void;
};

export default function CuriosityDictionaryChoices({
  surface,
  candidates,
  selectedSurface,
  selectedReading,
  selectedMeaning,
  onSelectCandidate,
}: CuriosityDictionaryChoicesProps) {
  if (candidates.length <= 1) return null;

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
      <div className="text-sm font-medium text-sky-900">
        Dictionary choices for "{surface.trim()}"
      </div>

      <p className="mt-1 text-sm text-sky-800">
        Choose the reading and meaning that match your book.
      </p>

      <div className="mt-3 space-y-2">
        {candidates.map((candidate) => {
          const isSelected =
            selectedSurface === candidate.surface &&
            selectedReading === candidate.reading &&
            selectedMeaning === candidate.meaning;

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
              </div>

              <div className="mt-1 text-sm text-stone-700">
                {candidate.meaning || "No meaning listed"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}