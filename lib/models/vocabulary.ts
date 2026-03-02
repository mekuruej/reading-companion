export interface VocabularyWordState {
  userId: string
  wordId: string

  lookupCount: number

  isKatakana: boolean
  isKanjiCard: boolean

  readingStage: "unknown" | "green" | "mastered"
  meaningStage: "unknown" | "blue" | "mastered"

  forgotReading: boolean
  forgotMeaning: boolean

  colorModeOverride: "rainbow" | "none" | null

  firstSeenInBookId: string | null
  firstSeenInChapter: number | null

  lastLookup: Date | null
  lastReviewed: Date | null
  createdAt: Date
  updatedAt: Date
}
