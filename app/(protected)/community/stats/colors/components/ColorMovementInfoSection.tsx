export default function ColorMovementInfoSection() {
  return (
    <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black text-stone-900">
        When do colors change?
      </h2>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-black text-stone-900">
            Reading encounters
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Saving words and meeting them again across books gives MEKURU real
            reading encounters to count. These encounters build the early color
            stages: red, orange, and yellow.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-black text-stone-900">
            Ability Check gates
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Ability Check moves words through gates: readiness, reading,
            meaning, and eventually mastery. Book Study and Kanji practice help
            you review, but they do not directly move Reading Colors.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-black text-stone-900">
            Limbo / support
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Limbo means a word has already entered the gate path and needs
            support between Green and Blue, or between Blue and Purple.
          </p>
        </div>
      </div>
    </section>
  );
}