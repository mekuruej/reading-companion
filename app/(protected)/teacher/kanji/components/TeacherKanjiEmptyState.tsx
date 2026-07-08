export default function TeacherKanjiEmptyState() {
  return (
    <div className="p-8 text-center">
      <p className="text-lg font-black text-stone-900">Queue is clear.</p>
      <p className="mt-2 text-sm text-stone-500">
        New kanji items will appear here as readers save words or flag kanji for review.
      </p>
    </div>
  );
}
