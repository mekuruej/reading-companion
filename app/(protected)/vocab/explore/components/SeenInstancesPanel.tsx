type SeenInstance = {
  id: string;
  meaning: string | null;
  meaning_choices: unknown;
  meaning_choice_index: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  page_number: number | null;
};

type SeenInstancesPanelProps = {
  instances: SeenInstance[];
  getMeaningChoices: (value: unknown) => string[];
  chapterDisplay: (
    chapterNumber: number | null,
    chapterName: string | null
  ) => string;
};

export default function SeenInstancesPanel({
  instances,
  getMeaningChoices,
  chapterDisplay,
}: SeenInstancesPanelProps) {
  return (
    <section className="mt-6 w-full rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 text-lg font-semibold">Seen in</div>

      {instances.length === 0 ? (
        <div className="text-sm text-gray-500">
          No saved instances found yet.
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((instance) => {
            const choices = getMeaningChoices(instance.meaning_choices);
            const defIndex =
              instance.meaning_choice_index != null
                ? instance.meaning_choice_index
                : choices.findIndex((meaning) => meaning === instance.meaning);

            const chapter = chapterDisplay(
              instance.chapter_number,
              instance.chapter_name
            );

            return (
              <div key={instance.id} className="rounded-xl border p-3">
                <div className="text-sm text-stone-600">
                  {chapter ? chapter : "No chapter"}
                  {instance.page_number != null
                    ? ` • p. ${instance.page_number}`
                    : ""}
                </div>

                {instance.meaning ? (
                  <div className="mt-2 text-sm text-stone-500">
                    {defIndex !== -1 && defIndex != null
                      ? `Def ${defIndex + 1}: `
                      : ""}
                    {instance.meaning}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}