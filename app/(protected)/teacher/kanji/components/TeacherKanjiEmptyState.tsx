export default function TeacherKanjiEmptyState() {
  return (
    <div className="p-8 text-center">
      <p className="text-lg font-black text-stone-900">Queue is clear.</p>
      <p className="mt-2 text-sm text-stone-500">
        New kanji enrichment items will appear here when saved words need cache
        rows, kanji rows, or reading details.
      </p>
    </div>
  );
}