import type { KeyboardEvent, RefObject } from "react";

type MobileQuickCaptureCandidate = {
  id: string;
  surface: string;
  cacheSurface: string;
  reading: string;
  meanings: string[];
  selectedMeaningIndex: number;
  meaning: string;
  isCustomMeaning: boolean;
};

type MobileQuickCaptureWord = {
  id: string;
  surface: string;
  reading: string;
  meaning: string;
};

type MobileQuickCaptureProps = {
  title: string;
  description: string;
  surface: string;
  reading: string;
  meaning: string;
  meanings: string[];
  selectedMeaningIndex: number;
  quickLoading: boolean;
  quickError: string | null;
  savedNotice: string;
  canSaveWord: boolean;
  candidates: MobileQuickCaptureCandidate[];
  lastAddedWord: MobileQuickCaptureWord | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onSurfaceChange: (value: string) => void;
  onSearch: () => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSelectCandidate: (candidate: MobileQuickCaptureCandidate) => void;
  onMeaningChoiceChange: (index: number, meaning: string) => void;
  onSaveWord: () => void;
  onDeleteLastWord: (id: string) => void;
};

export default function MobileQuickCapture({
  title,
  description,
  surface,
  reading,
  meaning,
  meanings,
  selectedMeaningIndex,
  quickLoading,
  quickError,
  savedNotice,
  canSaveWord,
  candidates,
  lastAddedWord,
  inputRef,
  onSurfaceChange,
  onSearch,
  onSearchKeyDown,
  onSelectCandidate,
  onMeaningChoiceChange,
  onSaveWord,
  onDeleteLastWord,
}: MobileQuickCaptureProps) {
  const hasCandidateDetails = canSaveWord && Boolean(reading.trim() || meaning.trim());

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
          Quick Capture
        </p>
        <h2 className="mt-1 text-xl font-black text-stone-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3">
        <label className="block text-xs font-black uppercase tracking-[0.12em] text-stone-400">
          Word
        </label>
        <div className="mt-2 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={surface}
            onChange={(event) => onSurfaceChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Type a word..."
            className="min-h-12 min-w-0 flex-1 rounded-2xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={quickLoading || !surface.trim()}
            className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-black text-white hover:bg-black disabled:opacity-50"
          >
            {quickLoading ? "..." : "Search"}
          </button>
        </div>

        {quickError ? (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            {quickError}
          </p>
        ) : null}

        {candidates.length > 1 ? (
          <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
            {candidates.map((candidate) => {
              const selected =
                surface === candidate.surface &&
                reading === candidate.reading &&
                meaning === candidate.meaning;

              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => onSelectCandidate(candidate)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                    selected
                      ? "border-stone-900 bg-white shadow-sm"
                      : "border-stone-200 bg-white/80 hover:bg-white"
                  }`}
                >
                  <div className="font-black text-stone-900">{candidate.surface}</div>
                  <div className="text-xs text-stone-500">
                    {candidate.reading || "No reading listed"}
                  </div>
                  <div className="mt-1 line-clamp-2 text-stone-700">
                    {candidate.meaning || "No meaning listed"}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-3 min-h-20 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm">
          {hasCandidateDetails ? (
            <>
              <div className="font-black text-stone-900">{surface || "Selected word"}</div>
              <div className="text-stone-500">{reading || "No reading listed"}</div>
              {meanings.length > 1 ? (
                <label className="mt-2 block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-stone-400">
                    Meaning to save
                  </span>
                  <select
                    value={selectedMeaningIndex}
                    onChange={(event) => {
                      const nextIndex = Number(event.target.value);
                      onMeaningChoiceChange(nextIndex, meanings[nextIndex] ?? "");
                    }}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                  >
                    {meanings.map((candidateMeaning, index) => (
                      <option key={`${candidateMeaning}-${index}`} value={index}>
                        {index + 1}. {candidateMeaning || "No meaning listed"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="mt-1 text-stone-700">{meaning || "No meaning listed"}</div>
              )}
            </>
          ) : (
            <p className="text-stone-500">
              Search for a word, choose a result if needed, then save it to this book.
            </p>
          )}
        </div>

        <p className="mt-2 text-xs leading-5 text-stone-500">
          Add page and chapter details later on computer or tablet.
        </p>

        {canSaveWord ? (
          <button
            type="button"
            onClick={onSaveWord}
            disabled={quickLoading}
            className="mt-3 w-full rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-200 disabled:opacity-50"
          >
            Save word
          </button>
        ) : null}

        {savedNotice ? (
          <p className="mt-2 text-center text-xs font-semibold text-emerald-700">
            {savedNotice}
          </p>
        ) : null}
      </div>

      <div className="mt-4 min-h-28 rounded-2xl border border-stone-200 bg-white p-3">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-stone-400">
          Last added word
        </div>

        {lastAddedWord ? (
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0 text-sm">
              <div className="font-black text-stone-900">{lastAddedWord.surface}</div>
              <div className="text-stone-500">{lastAddedWord.reading || "No reading listed"}</div>
              <div className="mt-1 text-stone-700">{lastAddedWord.meaning || "No meaning listed"}</div>
            </div>
            <button
              type="button"
              onClick={() => onDeleteLastWord(lastAddedWord.id)}
              className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
            >
              Delete
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-stone-500">
            Saved words will appear here one at a time.
          </p>
        )}
      </div>
    </section>
  );
}
