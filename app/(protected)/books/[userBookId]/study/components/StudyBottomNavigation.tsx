type StudyBottomNavigationProps = {
  onGoToVocabList: () => void;
  onGoToBookHub: () => void;
};

export default function StudyBottomNavigation({
  onGoToVocabList,
  onGoToBookHub,
}: StudyBottomNavigationProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onGoToVocabList}
        className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Vocab List
      </button>

      <button
        type="button"
        onClick={onGoToBookHub}
        className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Book Hub
      </button>
    </div>
  );
}