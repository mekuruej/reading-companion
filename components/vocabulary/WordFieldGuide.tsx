const guidance = {
  word: "This is the form you’ll study on your book flashcards and see as your main vocabulary word.",
  captureWord: "Main word is the form you’ll study on your flashcards and see as your main vocabulary word.",
  alternative: "Alternative spelling/kanji. Appears on the answer side of your book flashcard.  ",
  teacherWord: "This is the form saved to your vocabulary and studied on your book flashcards.",
  teacherAlternative: "Alternative spelling/kanji. It appears on the answer side of the book flashcard.",
  reading: "Used for flashcards and Follow-Along reading.",
  meaning: "The selected or custom meaning is shown in flashcards, the Vocabulary List and Follow-Along meaning support.",
  bookForm: "This can be the shape/tense in the book. Follow-Along will use it, unless reading-only display is on.",
  encountered: "Keeps the text you captured. To change the spelling shown in Follow-Along, use Form in the book.",
  dictionary: "Reference form for this word. Changing it does not change your main flashcard word.",
  lookup: "Used by Jisho lookup in this review. Changing it alone does not change the saved word shown in study tools.",
} as const;

export default function WordFieldGuide({ field }: { field: keyof typeof guidance }) {
  return <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">{guidance[field]}</span>;
}
