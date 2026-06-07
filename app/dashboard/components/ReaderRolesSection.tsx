import ReaderRoleCard from "./ReaderRoleCard";

const readerRoles = [
  {
    iconSrc: "/reader-roles/alchemist.svg",
    iconAlt: "Alchemist icon",
    title: "The Alchemists",
    subtitle: "aka looker-uppers",
    points: [
      "Devoted to nuance, unknown words, and the divisive phrase, “just one more quick look-up.”",
      "Endlessly gathering vocabulary, grammar, and kanji in their back pockets for the next useful potion.",
      "They slow down the journey, but are the first people the others seek out when the group is in hot water.",
      "They think Magicians are reckless, but secretly admire how they fly through the story without needing to bottle everything up for later.",
    ],
  },
  {
    iconSrc: "/reader-roles/sage.svg",
    iconAlt: "Sage icon",
    title: "The Sages",
    subtitle: "aka selective looker-uppers",
    points: [
      "The peacekeepers of the reading journey.",
      "Known for sensing when to stop, examine something more closely, keep moving, or run ahead.",
      "Calm and practical.",
      "They carry the map and guide the others, noticing warning signs and avoiding places where one could easily get stuck.",
      "They have gotten good at ignoring the Alchemists and Magicians arguing because they already believe they are the reason the reading journey keeps moving forward.",
    ],
  },
  {
    iconSrc: "/reader-roles/magician.svg",
    iconAlt: "Magician icon",
    title: "The Magicians",
    subtitle: "aka non-looker-uppers",
    points: [
      "They believe wholeheartedly in the magic of the story and prefer to fly forward without interruption.",
      "They jump over unknown words with alarming confidence and glide over nasty grammar with a swipe of their wands.",
      "They are convinced the Alchemists waste far too much time, but are suspiciously grateful whenever a potion is needed.",
      "Deep down, they know that accurately made potions are essential for skilled magic, but they will absolutely pretend they can manage without all those ingredients.",
    ],
  },
];

export default function ReaderRolesSection() {
  return (
    <section className="w-full max-w-5xl">
      <div className="mb-4 text-center">
        <h3 className="mt-1 text-2xl font-black text-slate-950">
          Every reading journey needs its characters.
        </h3>

        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Alchemist, Sage, or Magician — every reader brings a different kind of
          magic to the story.
        </p>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-3">
        {readerRoles.map((role) => (
          <ReaderRoleCard
            key={role.title}
            iconSrc={role.iconSrc}
            iconAlt={role.iconAlt}
            title={role.title}
            subtitle={role.subtitle}
            points={role.points}
          />
        ))}
      </div>
    </section>
  );
}