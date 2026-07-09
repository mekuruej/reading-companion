export default function KanjiStudyPreviewLockedState() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-stone-900">
              Kanji Reading Practice
            </h1>

            <span className="rounded-full border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
              Preview
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            Practice kanji readings from vocabulary-linked cards.
            This study area helps learners notice how readings show up inside real
            words, not just in isolation.
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Example Exercise
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <div className="text-2xl font-semibold text-stone-900">
              気配
            </div>

            <div className="mt-2 text-sm text-stone-500">
              What is the reading of this word?
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled
                className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-700"
              >
                きはい
              </button>

              <button
                type="button"
                disabled
                className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-700"
              >
                けはい
              </button>

              <button
                type="button"
                disabled
                className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-700"
              >
                きばい
              </button>

              <button
                type="button"
                disabled
                className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-700"
              >
                けばい
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="text-xl">🔒</div>

            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Vocabulary-linked practice
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Kanji Reading Practice uses MEKURU’s vocabulary-linked kanji data to help
                you practice readings in real word context.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}