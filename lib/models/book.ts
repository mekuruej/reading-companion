export interface Book {
  bookId: string
  title: string
  author: string
  coverImageUrl?: string
  language: "Japanese" | "English"
  createdAt: Date
}

export interface BookVocabulary {
  bookId: string
  wordId: string
  chapter: number | null
  frequencyInBook: number | null
}
