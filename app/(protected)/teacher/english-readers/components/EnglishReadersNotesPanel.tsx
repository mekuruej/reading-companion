type EnglishReadersNotesPanelProps = {
  notes: string[];
};

export default function EnglishReadersNotesPanel({
  notes,
}: EnglishReadersNotesPanelProps) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        Notes and Safety
      </p>

      <h2 className="mt-2 text-xl font-black text-stone-900">
        Boundaries for this first version
      </h2>

      <div className="mt-4 grid gap-2">
        {notes.map((note) => (
          <div
            key={note}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700"
          >
            {note}
          </div>
        ))}
      </div>
    </section>
  );
}
