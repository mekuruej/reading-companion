// Profile Levels
//

export const PROFILE_LEVEL_OPTIONS = [
  {
    value: "beginner",
    title: "Beginner",
    plain: "Early reader",
    cefr: "A1-A2",
    jlpt: "N5-N4",
    feel: "You can handle simple sentences and want gentle support with real text.",
  },
  {
    value: "intermediate",
    title: "Intermediate",
    plain: "Growing reader",
    cefr: "A2-B1",
    jlpt: "N4-N3",
    feel: "You can read some Japanese, but longer passages still need guidance.",
  },
  {
    value: "upper_intermediate",
    title: "Upper Intermediate",
    plain: "Independent reader",
    cefr: "B1-B2",
    jlpt: "N3-N2",
    feel: "You can follow real texts and want help with nuance, pacing, and volume.",
  },
  {
    value: "advanced",
    title: "Advanced",
    plain: "Deep reader",
    cefr: "B2+",
    jlpt: "N2-N1",
    feel: "You read authentic material and want sharper understanding of style and detail.",
  },
] as const;
