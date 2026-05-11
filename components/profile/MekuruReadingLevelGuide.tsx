// Mekuru Reading Level Guide
//

const MEKURU_READING_LEVEL_GROUPS = [
  {
    title: "Beginner",
    detail: "Levels 1-5 describe the path from kana and survival words into simple stories.",
    levels: [
      {
        value: "Level 1",
        plain: "Absolute Beginner",
        cefr: "Pre-A1",
        jlpt: "Before N5",
        feel: "Hiragana/katakana, survival words, very guided sentences",
      },
      {
        value: "Level 2",
        plain: "Beginner 1",
        cefr: "A1",
        jlpt: "Early N5",
        feel: "Simple sentences, basic particles, dictionary-form verbs still hard",
      },
      {
        value: "Level 3",
        plain: "Beginner 2",
        cefr: "A1+",
        jlpt: "Solid N5",
        feel: "Can read graded material slowly with support",
      },
      {
        value: "Level 4",
        plain: "Upper Beginner",
        cefr: "A2",
        jlpt: "N4 entry",
        feel: "Longer sentences, more verb forms, lots of grammar still foggy",
      },
      {
        value: "Level 5",
        plain: "Pre-Intermediate",
        cefr: "A2+",
        jlpt: "Solid N4",
        feel: "Can follow simple stories, but unknown vocab blocks flow",
      },
    ],
  },
  {
    title: "Intermediate",
    detail: "Levels 6-8 are where native material becomes possible, but support still matters.",
    levels: [
      {
        value: "Level 6",
        plain: "Intermediate 1",
        cefr: "B1",
        jlpt: "N3 entry",
        feel: "Real Japanese starts becoming possible, but slow and lookup-heavy",
      },
      {
        value: "Level 7",
        plain: "Intermediate 2",
        cefr: "B1+",
        jlpt: "Solid N3",
        feel: "Can read easier native texts with support; nuance still hard",
      },
      {
        value: "Level 8",
        plain: "Upper Intermediate",
        cefr: "B2-ish",
        jlpt: "N2 entry",
        feel: "Can handle novels/articles, but kanji/vocab density hurts",
      },
    ],
  },
  {
    title: "Advanced",
    detail: "Levels 9-10 are for regular native reading, with nuance and density as the challenge.",
    levels: [
      {
        value: "Level 9",
        plain: "Advanced",
        cefr: "B2+",
        jlpt: "Solid N2 / N1 entry",
        feel: "Reads real Japanese regularly, still misses style, implication, register",
      },
      {
        value: "Level 10",
        plain: "Upper Advanced",
        cefr: "C1-ish",
        jlpt: "Solid N1+",
        feel: "Can read widely with nuance, ambiguity, tone, and less hand-holding",
      },
    ],
  },
] as const;

function GroupLabel({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200" />
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {title}
        </div>
        <div className="h-px flex-1 bg-stone-200" />
      </div>
      <p className="mt-2 text-center text-xs leading-5 text-stone-500">{detail}</p>
    </div>
  );
}

function MekuruLevelCard({
  level,
}: {
  level: (typeof MEKURU_READING_LEVEL_GROUPS)[number]["levels"][number];
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <div className="text-sm font-black text-stone-900">{level.value}</div>
        <div className="text-sm font-semibold text-stone-700">{level.plain}</div>
      </div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {level.cefr} · {level.jlpt}
      </div>
      <p className="mt-2 text-xs leading-5 text-stone-600">{level.feel}</p>
    </div>
  );
}

export default function MekuruReadingLevelGuide() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Mekuru reading levels</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">
        These levels describe how reading feels, not just test labels. Pick the level that feels
        closest right now; you can always adjust it later.
      </p>

      <div className="mt-5 space-y-6">
        {MEKURU_READING_LEVEL_GROUPS.map((group) => (
          <div key={group.title}>
            <GroupLabel title={group.title} detail={group.detail} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.levels.map((level) => (
                <MekuruLevelCard key={level.value} level={level} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
