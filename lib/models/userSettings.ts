export interface UserSettings {
  userId: string

  learningProfile:
    | "Beginner"
    | "Intermediate"
    | "Advanced"
    | "Automatic"

  jlptLevel:
    | "N5"
    | "N4"
    | "N3"
    | "N2"
    | "N1"
    | "Native"
    | null

  colorSystem: "rainbow" | "none"

  showKatakanaDeck: boolean
  showKanjiDeck: boolean

  includeGreen: boolean
  includeBlue: boolean
  includeGrey: boolean
  includePurple: boolean

  createdAt: Date
  updatedAt: Date
}
