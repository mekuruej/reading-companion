export interface KanjiCardState {
  userId: string
  kanjiId: string

  lookupCount: number

  familiarityStage:
    | "unknown"
    | "shape"
    | "reading"
    | "meaning"
    | "mastered"

  forgotReading: boolean
  forgotMeaning: boolean

  lastLookup: Date | null
  lastReviewed: Date | null
  createdAt: Date
  updatedAt: Date
}
