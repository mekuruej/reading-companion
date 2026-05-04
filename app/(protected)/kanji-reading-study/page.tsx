// Library Kanji Study
//

export default function LibraryKanjiStudyPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Study
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
          Kanji Reading Practice
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Practice kanji readings from words you’ve saved across your whole library.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-sm font-bold text-stone-900">
              Multiple Choice
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              See one kanji and choose one possible reading. After answering, you’ll see the word and where it appeared.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-sm font-bold text-stone-900">
              Typing Practice
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              See the whole word and type the reading for the target kanji.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600">
          Global kanji reading cards will go here.
        </div>
      </section>
    </main>
  );
}