type TeacherKanjiLoadingStateProps = {
  message?: string;
};

export default function TeacherKanjiLoadingState({
  message = "Loading kanji queue…",
}: TeacherKanjiLoadingStateProps) {
  return (
    <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
      {message}
    </section>
  );
}