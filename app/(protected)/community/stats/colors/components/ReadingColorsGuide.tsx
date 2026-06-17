import ColorGuideGroupLabel from "./ColorGuideGroupLabel";
import ColorGuideStepCard from "./ColorGuideStepCard";

type GuideStage =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "grey";

type ReadingColorsGuideProps = {
  // Instructional copy only; color movement rules stay in study logic/totals helpers.
  colorLabel: (stage: GuideStage) => string;
  stagePill: (stage: GuideStage) => string;
};

export default function ReadingColorsGuide({
  colorLabel,
  stagePill,
}: ReadingColorsGuideProps) {
  return (
    <details className="group mt-4 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4 shadow-sm sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">
            Why colors?
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Mekuru uses colors to notice words, track movement, and separate
            reading encounters from Ability Check gates.
          </p>
        </div>

        <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm group-open:hidden">
          Open
        </span>
        <span className="hidden rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm group-open:inline-flex">
          Close
        </span>
      </summary>

      <div className="mt-5 border-t border-sky-100 pt-5">
        <div className="flex items-start gap-3">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm">
            <img
              src="/parrot.svg"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="space-y-3 text-sm leading-6 text-stone-700 sm:text-base">
            <p>
              Do you ever look up a word and feel sure you have looked it up
              before? Or feel like you should know a word, only to realize it is
              very similar to another word you met somewhere else?
            </p>

            <p>
              That feeling is the backbone of Mekuru&apos;s Reading Colors.
              Mekuru treats noticing words while you read as part of the
              learning process, not just something that happens before “real”
              study begins.
            </p>

            <p>
              Colors and counts help words pop out when they need attention,
              then gradually take a backseat as they become more familiar or
              wait until you are ready for them. These numbers are movement, not
              a grade.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6 rounded-2xl border border-white/80 bg-white/80 p-4">
          <div>
            <ColorGuideGroupLabel
              title="Based on ability"
              detail="Purple, blue, green, and Limbo come from Ability Check results."
            />

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ColorGuideStepCard
                stageLabel={colorLabel("purple")}
                stageClassName={stagePill("purple")}
                title="Mastered"
                detail="The word has cleared the major study gates and is no longer demanding regular attention."
                note="Purple cards return only occasionally."
              />

              <ColorGuideStepCard
                stageLabel={colorLabel("blue")}
                stageClassName={stagePill("blue")}
                title="Meaning Gate"
                detail="The reading is supported, and the word is ready for a meaning question."
                note="Advanced words may care about the saved definition number."
              />

              <ColorGuideStepCard
                stageLabel={colorLabel("green")}
                stageClassName={stagePill("green")}
                title="Reading Gate"
                detail="The word is ready for a reading question in Ability Check."
                note="Pass this gate to move toward meaning."
              />

              <ColorGuideStepCard
                stageLabel={colorLabel("grey")}
                stageClassName={stagePill("grey")}
                title="Limbo: between gates"
                detail="Limbo only appears after a word has entered the gate path: between Green and Blue, or between Blue and Purple."
                note="Choosing Not yet after Yellow repeats Red, Orange, and Yellow instead."
              />
            </div>
          </div>

          <div>
            <ColorGuideGroupLabel
              title="Based on encounters"
              detail="Yellow, orange, and red come from real reading encounters, not quiz answers. After yellow, you can decide to repeat these three levels if you are not ready for the Reading Gate."
            />

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <ColorGuideStepCard
                stageLabel={colorLabel("yellow")}
                stageClassName={stagePill("yellow")}
                title="Ready for gate checks"
                detail="Yellow means the word has enough encounter support to ask whether it is ready for Ability Check."
                note="Yellow is the readiness checkpoint before the Reading Gate."
              />

              <ColorGuideStepCard
                stageLabel={colorLabel("orange")}
                stageClassName={stagePill("orange")}
                title="Repeated encounter support"
                detail="The word is showing up again, but Mekuru is still gathering reading support before testing it."
                note="Encounters keep building quietly in the background."
              />

              <ColorGuideStepCard
                stageLabel={colorLabel("red")}
                stageClassName={stagePill("red")}
                title="Early encounter support"
                detail="You have started meeting this word in real reading, but it is still too new for Ability Check."
                note="If a word feels far above your level, Mekuru can give it more time."
              />
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}