export interface DictionaryEntry {
  wordId: string
  orthography: string
  reading: string | null
  meaning: string[]
  jlptLevel: "N5" | "N4" | "N3" | "N2" | "N1" | null
  partOfSpeech: string[]
  isKatakana: boolean
  isKanji: boolean
  frequencyRank: number | null
  tags: string[]
}
